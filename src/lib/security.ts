/**
 * OmniRoute Security & Protection Module
 * Handles SSRF mitigation, URL sanitization, in-memory caching, and API rate-limiting.
 */

// Blocked internal / private IP patterns and hostnames
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'instance-data',
]);

const PRIVATE_IP_RANGES = [
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,                    // 192.168.0.0/16
  /^169\.254\./,                    // 169.254.0.0/16 (link-local, cloud metadata)
  /^127\./,                         // 127.0.0.0/8
  /^0\./,                           // 0.0.0.0/8
  /^fc00:/i,                        // IPv6 Unique Local
  /^fe80:/i,                        // IPv6 Link-Local
];

export interface SanitizedUrlResult {
  isValid: boolean;
  normalizedUrl: string;
  domain: string;
  error?: string;
}

/**
 * Validates a user-supplied target URL or domain against SSRF attacks and format corruption.
 */
export function validateAndSanitizeUrl(rawInput: string): SanitizedUrlResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'Target URL is required' };
  }

  let trimmed = rawInput.trim();

  // Basic length constraints
  if (trimmed.length > 500) {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'URL exceeds maximum length (500 characters)' };
  }

  // Prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'Invalid URL format' };
  }

  // Only allow HTTP and HTTPS protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'Only HTTP and HTTPS protocols are supported' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check explicit blocklist
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'Scanning of internal/private hosts is forbidden' };
  }

  // Check private IP ranges
  for (const regex of PRIVATE_IP_RANGES) {
    if (regex.test(hostname)) {
      return { isValid: false, normalizedUrl: '', domain: '', error: 'Scanning of private network address ranges is forbidden' };
    }
  }

  // Check dangerous domain extensions
  if (hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.lan') || hostname.endsWith('.onion')) {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'Scanning of internal TLDs is forbidden' };
  }

  // Extract clean root domain
  const cleanDomain = hostname.replace(/^www\./, '');

  if (!cleanDomain || !cleanDomain.includes('.') || cleanDomain.length < 3) {
    return { isValid: false, normalizedUrl: '', domain: '', error: 'Invalid domain structure' };
  }

  return {
    isValid: true,
    normalizedUrl: parsed.toString(),
    domain: cleanDomain,
  };
}

// ── In-Memory LRU Cache with TTL ──────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxItems: number;
  private defaultTtlMs: number;

  constructor(maxItems = 200, defaultTtlMs = 1000 * 60 * 15) { // 15 mins default
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Evict oldest if maxItems reached
    if (this.store.size >= this.maxItems) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }
}

// ── Simple Sliding Window Rate Limiter ────────────────────────────────────

interface RateLimitRecord {
  timestamps: number[];
}

export class RateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = 60 * 1000, maxRequests = 20) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.records.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(identifier, record);
    }

    // Filter out timestamps older than the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0];
      const resetMs = oldest + this.windowMs - now;
      return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      resetMs: this.windowMs,
    };
  }
}

// Export singleton instances for application-wide reuse
export const scanReportCache = new MemoryCache<import('./types').GeoAuditReport>(150, 1000 * 60 * 20); // 20 mins cache
export const publicApiRateLimiter = new RateLimiter(60 * 1000, 30); // 30 requests per minute per IP
