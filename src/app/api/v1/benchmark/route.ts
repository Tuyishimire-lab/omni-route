import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { checkRateLimit, getClientIp } from '../../../../lib/rateLimiter';
import { validateAndSanitizeUrl } from '../../../../lib/security';
import { getCachedScanReport } from '../../../../lib/db';
import { crawlAndAnalyzeUrl } from '../../../../lib/liveCrawler';
import { analyzeDomainGEO } from '../../../../lib/geoAnalyzer';
import { GeoAuditReport } from '../../../../lib/types';
import { getSession } from '../../../../lib/auth';
import { normalizeTier, getTierConfig, UserTier } from '../../../../lib/tierLimits';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/benchmark?competitorsFor=domain
 * Discovers the category of a target domain from our 966+ domain index
 * and returns the top 4 direct market rivals for 1-click benchmarking.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = await checkRateLimit(ip, 'benchmark:competitors', 60_000, 30);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) } }
    );
  }

  const targetDomainRaw = req.nextUrl.searchParams.get('competitorsFor');
  if (!targetDomainRaw || !targetDomainRaw.trim()) {
    return NextResponse.json({ error: 'competitorsFor query parameter is required' }, { status: 400 });
  }

  const clean = targetDomainRaw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const validation = validateAndSanitizeUrl(`https://${clean}`);
  if (!validation.isValid) {
    return NextResponse.json({ error: 'Invalid domain parameter' }, { status: 400 });
  }

  const domain = validation.domain;

  try {
    const existing = await prisma.domain.findUnique({
      where: { domain },
      select: { domain: true, category: true, latestGeoScore: true },
    });

    const category = existing?.category || 'AI/Tech';

    const rivals = await prisma.domain.findMany({
      where: {
        category,
        domain: { not: domain },
        latestGeoScore: { gt: 0 },
      },
      orderBy: { latestGeoScore: 'desc' },
      take: 4,
      select: {
        domain: true,
        category: true,
        latestGeoScore: true,
      },
    });

    return NextResponse.json({
      success: true,
      domain,
      category,
      competitors: rivals,
    });
  } catch (err) {
    console.error('[benchmark GET competitorsFor] error:', err);
    return NextResponse.json({ error: 'Failed to retrieve competitors' }, { status: 500 });
  }
}

/**
 * POST /api/v1/benchmark
 * Accepts an array of 2 to 5 domains.
 * Resolves each domain in parallel:
 *   1. Returns database cached report if available (< 50ms)
 *   2. If unindexed, returns instant deterministic analysis or live crawl
 *   3. If bypassCache is requested, executes live crawl
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = await checkRateLimit(ip, 'benchmark:batch', 60_000, 20);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many benchmark requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter ?? 60) } }
    );
  }

  let body: { domains?: string[]; bypassCache?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { domains, bypassCache } = body;
  if (!domains || !Array.isArray(domains) || domains.length < 2) {
    return NextResponse.json({ error: 'At least 2 domains are required for benchmarking' }, { status: 400 });
  }

  if (domains.length > 5) {
    return NextResponse.json({ error: 'A maximum of 5 domains can be benchmarked at once' }, { status: 400 });
  }

  // Sanitize and validate all domains
  const sanitizedDomains: string[] = [];
  for (const raw of domains) {
    if (typeof raw !== 'string') continue;
    const clean = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const validation = validateAndSanitizeUrl(`https://${clean}`);
    if (validation.isValid && !sanitizedDomains.includes(validation.domain)) {
      sanitizedDomains.push(validation.domain);
    }
  }

  if (sanitizedDomains.length < 2) {
    return NextResponse.json({ error: 'At least 2 valid unique domains are required' }, { status: 400 });
  }

  // Check user authentication and tier entitlements
  const session = await getSession();
  let userTier: UserTier = 'free';
  if (session) {
    if (session.role === 'admin') {
      userTier = 'enterprise';
    } else {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { tier: true },
      });
      userTier = normalizeTier(user?.tier);
    }
  }

  const tierConfig = getTierConfig(userTier);

  // Enforce domain count tier limit: Free allows 2 (1-on-1), Pro+ allows 5
  if (sanitizedDomains.length > tierConfig.maxBenchmarkDomains) {
    return NextResponse.json(
      {
        error: `Comparing ${sanitizedDomains.length} domains requires a Pro subscription. Free tier allows 1-on-1 head-to-head comparison (2 domains max).`,
        code: 'TIER_LIMIT_EXCEEDED',
        tier: userTier,
        maxAllowed: tierConfig.maxBenchmarkDomains,
      },
      { status: 403 }
    );
  }

  // Live on-demand re-probing requires Pro tier
  let effectiveBypassCache = !!bypassCache;
  if (effectiveBypassCache && !tierConfig.canLiveRescanBenchmark) {
    console.log('[benchmark] bypassCache requested by free/anonymous user: downgraded to cached response');
    effectiveBypassCache = false;
  }

  try {
    // Process all domains in parallel
    const reports = await Promise.all(
      sanitizedDomains.map(async (domain): Promise<GeoAuditReport> => {
        if (!effectiveBypassCache) {
          // Check DB scan event cache first
          const dbCached = await getCachedScanReport(domain).catch(() => null);
          if (dbCached) {
            return dbCached;
          }

          // Check if domain exists in directory with pre-computed score
          const dbDomain = await prisma.domain.findUnique({
            where: { domain },
            select: {
              domain: true,
              category: true,
              latestGeoScore: true,
              latestZeroClickResilience: true,
              latestCitationRate: true,
            },
          }).catch(() => null);

          if (dbDomain && dbDomain.latestGeoScore > 0) {
            const base = analyzeDomainGEO(domain);
            return {
              ...base,
              overallGeoScore: dbDomain.latestGeoScore,
              zeroClickResilience: dbDomain.latestZeroClickResilience || base.zeroClickResilience,
              isCached: true,
              cachedAt: new Date().toISOString(),
            };
          }
        }

        // Live crawl or deterministic fallback
        try {
          return await crawlAndAnalyzeUrl(`https://${domain}`, { bypassCache: Boolean(bypassCache) });
        } catch {
          return analyzeDomainGEO(domain);
        }
      })
    );

    return NextResponse.json({
      success: true,
      reports,
    });
  } catch (err) {
    console.error('[benchmark POST] error:', err);
    return NextResponse.json({ error: 'Failed to execute benchmark analysis' }, { status: 500 });
  }
}
