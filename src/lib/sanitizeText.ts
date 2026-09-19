/**
 * Text Sanitizer Utility
 * ─────────────────────────────────────────────────────────
 * Cleans, minimizes, and removes em-dashes (—), en-dashes (–),
 * &mdash; / &ndash;, and excessive double-dashes (--) generated
 * by AI language models and copywriters.
 *
 * Converts them into clean, standard punctuation (periods, colons,
 * commas, or standard hyphens).
 */

/**
 * Cleans em-dashes and en-dashes from a single text string.
 */
export function cleanEmDashes(text: string): string {
  if (!text || typeof text !== 'string') return text;

  return text
    // Replace HTML entities
    .replace(/&(?:mdash|ndash);/gi, ', ')
    // Number ranges (e.g. "24–48 h", "2020–2024", "0–100") -> "24-48 h", "0-100"
    .replace(/(\d+)\s*[—–]\s*(\d+)/g, '$1-$2')
    // Em dash / en dash followed by capital letter -> ". "
    .replace(/\s+[—–]\s+(?=[A-Z][a-z])/g, '. ')
    // Em dash / en dash in parentheticals or continuation clauses -> ", "
    .replace(/\s*[—–]\s*/g, ', ')
    // Pseudo em dashes using double hyphen "--"
    .replace(/\s+--\s+(?=[A-Z][a-z])/g, '. ')
    .replace(/\s*--\s*/g, ', ')
    // Cleanup adjacent punctuation artifacts
    .replace(/,\s*,+/g, ',')
    .replace(/\.\s*\.+/g, '.')
    .replace(/:\s*,+/g, ':')
    .replace(/,\s*\./g, '.')
    .replace(/;\s*,+/g, ';')
    .trim();
}

/**
 * Recursively traverses any data structure (objects, arrays, strings)
 * and cleans all em-dashes from all string fields.
 */
export function deepCleanEmDashes<T>(value: T): T {
  if (typeof value === 'string') {
    return cleanEmDashes(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepCleanEmDashes(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      cleaned[k] = deepCleanEmDashes(v);
    }
    return cleaned as T;
  }
  return value;
}

/**
 * Strict Name Validator and Sanitizer (OWASP A03 Injection Prevention)
 *
 * Prevents URL injection, HTML injection, and social engineering in system emails.
 * Only permits valid human/company name characters: unicode letters, numbers, spaces,
 * hyphens, apostrophes, periods, and commas.
 * Explicitly rejects URLs, domains, markdown links, and HTML tags.
 */
export function validateAndSanitizeName(name: unknown): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (typeof name !== 'string') {
    return { isValid: false, sanitized: '', error: 'Name is required.' };
  }

  // Normalize smart quotes and trim
  const normalized = name.replace(/[’‘]/g, "'").trim();
  if (normalized.length < 2) {
    return { isValid: false, sanitized: '', error: 'Name must be at least 2 characters.' };
  }

  if (normalized.length > 70) {
    return { isValid: false, sanitized: '', error: 'Name cannot exceed 70 characters.' };
  }

  // 1. Explicitly detect URL schemes, protocols, and markdown/HTML link structures
  const hasUrlScheme = /(?:https?:\/\/|ftp:\/\/|mailto:|javascript:|data:|file:)/i.test(normalized);
  const hasMarkdownLink = /\[.*?\]\(.*?\)/.test(normalized);
  const hasHtml = /<[^>]*>/g.test(normalized);
  const hasExplicitUrl = /(?:\/\/[^\s]+|www\.[^\s]+)/i.test(normalized);
  // Detect domain patterns with common TLDs (e.g. evil.com, foo.net, something.org)
  const hasDomainPattern = /(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|io|dev|ai|xyz|co|uk|ru|cn|app|live|me|top|info|biz|online|site|tech|store|click|link)(?:[/?#\s]|$)/i.test(normalized);

  if (hasUrlScheme || hasMarkdownLink || hasHtml || hasExplicitUrl || hasDomainPattern) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Name cannot contain URLs, website links, or HTML tags.',
    };
  }

  // 2. Allow only unicode letters (\p{L}), numbers (\p{N}), spaces, hyphens, apostrophes, periods, commas
  const safeNameRegex = /^[\p{L}\p{N}\s\-'.,]+$/u;
  if (!safeNameRegex.test(normalized)) {
    return {
      isValid: false,
      sanitized: '',
      error: 'Name may only contain letters, numbers, spaces, hyphens, and apostrophes.',
    };
  }

  // 3. Collapse multiple whitespace
  const sanitized = normalized.replace(/\s+/g, ' ');
  if (sanitized.length < 2) {
    return { isValid: false, sanitized: '', error: 'Name must be at least 2 characters.' };
  }

  return { isValid: true, sanitized };
}

/**
 * Escapes HTML entities to prevent HTML/XSS injection in rendered templates.
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Output sanitizer for recipient names in all system-generated emails.
 * Strips any residual URLs, markdown links, HTML markup, or control characters,
 * and HTML-escapes the resulting safe name. Falls back to 'there' if empty.
 */
export function sanitizeEmailRecipientName(rawName?: string): string {
  if (!rawName || typeof rawName !== 'string') return 'there';

  // 1. Direct validation check: if already valid and compliant, escape and return
  const validation = validateAndSanitizeName(rawName);
  if (validation.isValid) {
    return escapeHtml(validation.sanitized);
  }

  // 2. Defense-in-depth: aggressively strip malicious constructs
  let cleaned = rawName
    // Strip script and style blocks entirely along with their inner contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Strip markdown links completely [text](url)
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    // Strip URL schemes
    .replace(/(?:https?:\/\/|ftp:\/\/|mailto:|javascript:|data:|file:)[^\s]*/gi, '')
    .replace(/www\.[^\s]+/gi, '')
    // Strip domain patterns
    .replace(/\b[a-zA-Z0-9-]+\.(?:com|net|org|io|dev|ai|xyz|co|uk|ru|cn|app|live|me|top|info|biz|online|site|tech|store|click|link)\b[^\s]*/gi, '')
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Strip characters that could be used for injection, keeping only safe name characters
    .replace(/[^\p{L}\p{N}\s\-'.,]/gu, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 2 || cleaned.length > 50) {
    return 'there';
  }

  const postValidation = validateAndSanitizeName(cleaned);
  if (!postValidation.isValid) {
    return 'there';
  }

  return escapeHtml(postValidation.sanitized);
}
