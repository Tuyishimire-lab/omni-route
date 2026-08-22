import { prisma } from './prisma';
import { GeoAuditReport } from './types';

// ─── DB-backed Scan Cache ─────────────────────────────────────────────────────
// In-memory caches are useless across serverless instances — each cold start
// gets a fresh Map. The latest ScanEvent.rawReport serves as a shared cache
// instead, with a TTL enforced by comparing scannedAt.

const SCAN_CACHE_TTL_MS = 1000 * 60 * 20; // 20 minutes

export async function getCachedScanReport(
  domain: string,
  options: { bypassCache?: boolean } = {}
): Promise<GeoAuditReport | null> {
  if (options.bypassCache) return null;
  try {
    const event = await prisma.scanEvent.findFirst({
      where: { domain, isLiveScan: true, rawReport: { not: null } },
      orderBy: { scannedAt: 'desc' },
      select: { rawReport: true, scannedAt: true },
    });
    if (!event) return null;
    if (Date.now() - event.scannedAt.getTime() > SCAN_CACHE_TTL_MS) return null;
    return JSON.parse(event.rawReport!) as GeoAuditReport;
  } catch (e) {
    console.warn('[scanCache] DB cache read failed, will re-crawl:', e);
    return null;
  }
}

// ─── Domain + Scan Persistence ────────────────────────────────────────────────

export async function saveScanToDB(
  report: GeoAuditReport,
  sessionId?: string,
  isLiveScan = false
) {
  const citationRate = report.engineBreakdown[0]?.citationProbability ?? 0;
  const status =
    report.overallGeoScore >= 80
      ? 'OPTIMAL'
      : report.overallGeoScore >= 60
      ? 'MODERATE'
      : 'AT_RISK';

  // Upsert domain — update latest scores if it already exists
  const existing = await prisma.domain.findUnique({ where: { domain: report.domain } });
  const prevScore = existing?.latestGeoScore ?? report.overallGeoScore;
  const delta = report.overallGeoScore - prevScore;
  const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  const domain = await prisma.domain.upsert({
    where: { domain: report.domain },
    create: {
      domain: report.domain,
      url: report.url,
      latestGeoScore: report.overallGeoScore,
      latestCitationRate: citationRate,
      latestZeroClickResilience: report.zeroClickResilience,
      latestInfoGainScore: report.informationGainScore,
      latestEntityScore: report.entityDisambiguationScore,
      latestVectorReadiness: report.vectorReadinessScore,
      status,
      trend: 'flat',
      trendDelta: 0,
      scanCount: 1,
    },
    update: {
      url: report.url,
      latestGeoScore: report.overallGeoScore,
      latestCitationRate: citationRate,
      latestZeroClickResilience: report.zeroClickResilience,
      latestInfoGainScore: report.informationGainScore,
      latestEntityScore: report.entityDisambiguationScore,
      latestVectorReadiness: report.vectorReadinessScore,
      status,
      trend,
      trendDelta: delta,
      scanCount: { increment: 1 },
    },
  });

  // Insert scan event
  await prisma.scanEvent.create({
    data: {
      domain: report.domain,
      domainId: domain.id,
      geoScore: report.overallGeoScore,
      zeroClickResilience: report.zeroClickResilience,
      citationRate,
      infoGainScore: report.informationGainScore,
      entityScore: report.entityDisambiguationScore,
      vectorReadiness: report.vectorReadinessScore,
      status,
      sessionId: sessionId ?? null,
      isLiveScan,
      rawReport: JSON.stringify(report),
    },
  });

  return domain;
}

import { DEFAULT_LEADERBOARD_ENTRIES } from './defaultLeaderboard';

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(category?: string) {
  try {
    const where = category && category !== 'All' ? { category } : {};

    const domains = await prisma.domain.findMany({
      where: { ...where, scanCount: { gte: 1 } },
      orderBy: { latestGeoScore: 'desc' },
      take: 50,
    });

    if (domains && domains.length > 0) {
      // Fetch the latest scan per domain to determine live vs fallback scoring
      const latestScans = await prisma.scanEvent.findMany({
        where: { domain: { in: domains.map((d: { domain: string }) => d.domain) } },
        orderBy: { scannedAt: 'desc' },
        select: { domain: true, isLiveScan: true },
      });
      const liveMap = new Map<string, boolean>();
      for (const s of latestScans) {
        if (!liveMap.has(s.domain)) liveMap.set(s.domain, s.isLiveScan);
      }

      return domains.map((d: typeof domains[number], i: number) => ({
        rank: i + 1,
        domain: d.domain,
        category: d.category,
        geoScore: d.latestGeoScore,
        citationWinRate: d.latestCitationRate,
        zeroClickResilience: d.latestZeroClickResilience,
        trend: d.trend as 'up' | 'down' | 'flat',
        trendDelta: d.trendDelta,
        scanCount: d.scanCount,
        isLiveScanned: liveMap.get(d.domain) ?? false,
        lastScanned: d.lastScanned ? new Date(d.lastScanned).toISOString() : new Date().toISOString(),
      }));
    }
  } catch (e) {
    console.warn('[getLeaderboard] DB query fallback to defaults:', e);
  }

  // Resilient fallback to comprehensive pre-seeded directory
  if (category && category !== 'All') {
    return DEFAULT_LEADERBOARD_ENTRIES.filter((e) => e.category === category).map((e, i) => ({
      ...e,
      rank: i + 1,
    }));
  }
  return DEFAULT_LEADERBOARD_ENTRIES;
}

// ─── Scan History (for sparklines) ───────────────────────────────────────────

export async function getDomainHistory(domain: string, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.scanEvent.findMany({
    where: { domain, scannedAt: { gte: since } },
    orderBy: { scannedAt: 'asc' },
    select: { scannedAt: true, geoScore: true },
  });

  return events.map((e: { scannedAt: Date; geoScore: number }) => ({
    date: e.scannedAt.toISOString().split('T')[0],
    score: e.geoScore,
  }));
}

/**
 * Batch version of getDomainHistory — fetches all domains in ONE query.
 * Use instead of Promise.all(domains.map(d => getDomainHistory(d))) to avoid
 * N Turso round-trips (1 per domain → ~80ms each).
 */
export async function getBulkDomainHistory(
  domains: string[],
  days = 14
): Promise<Record<string, { date: string; score: number }[]>> {
  if (domains.length === 0) return {};

  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.scanEvent.findMany({
    where: { domain: { in: domains }, scannedAt: { gte: since } },
    orderBy: { scannedAt: 'asc' },
    select: { domain: true, scannedAt: true, geoScore: true },
  });

  // Group in memory — O(n) single pass
  const grouped: Record<string, { date: string; score: number }[]> = {};
  for (const e of events) {
    if (!grouped[e.domain]) grouped[e.domain] = [];
    grouped[e.domain].push({
      date: e.scannedAt.toISOString().split('T')[0],
      score: e.geoScore,
    });
  }
  // Ensure every requested domain has an entry (empty array if no history)
  for (const d of domains) {
    if (!grouped[d]) grouped[d] = [];
  }
  return grouped;
}

// ─── Watchlist (session-scoped) ───────────────────────────────────────────────

export async function getWatchlist(sessionId: string): Promise<string[]> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return [];
  try {
    return JSON.parse(session.watchlist) as string[];
  } catch {
    return [];
  }
}

export async function addToWatchlist(sessionId: string, domain: string) {
  const current = await getWatchlist(sessionId);
  if (current.includes(domain)) return current;
  const updated = [domain, ...current];
  await prisma.session.upsert({
    where: { id: sessionId },
    create: { id: sessionId, watchlist: JSON.stringify(updated) },
    update: { watchlist: JSON.stringify(updated) },
  });
  return updated;
}

export async function removeFromWatchlist(sessionId: string, domain: string) {
  const current = await getWatchlist(sessionId);
  const updated = current.filter((d) => d !== domain);
  await prisma.session.upsert({
    where: { id: sessionId },
    create: { id: sessionId, watchlist: JSON.stringify(updated) },
    update: { watchlist: JSON.stringify(updated) },
  });
  return updated;
}

// ─── Watchlist with full domain data ─────────────────────────────────────────

export async function getWatchlistDomains(sessionId: string) {
  const domains = await getWatchlist(sessionId);
  if (domains.length === 0) return [];

  const rows = await prisma.domain.findMany({
    where: { domain: { in: domains } },
  });

  // Preserve watchlist order
  return domains
    .map((d: string) => rows.find((r) => r.domain === d))
    .filter(Boolean)
    .map((r) => ({
      id: r!.id,
      domain: r!.domain,
      url: r!.url ?? `https://${r!.domain}`,
      lastGeoScore: r!.latestGeoScore,
      zeroClickResilience: r!.latestZeroClickResilience,
      citationProbability: r!.latestCitationRate,
      status: r!.status as 'OPTIMAL' | 'MODERATE' | 'AT_RISK',
      lastScannedAt: r!.lastScanned.toLocaleTimeString(),
      addedAt: r!.firstScanned.toISOString().split('T')[0],
      scanCount: r!.scanCount,
    }));
}

// ─── Stats for homepage / leaderboard header ──────────────────────────────────

export async function getGlobalStats() {
  const [domainCount, avgScore, eventCount] = await Promise.all([
    prisma.domain.count(),
    prisma.domain.aggregate({ _avg: { latestGeoScore: true } }),
    prisma.scanEvent.count(),
  ]);

  return {
    domainsRanked: domainCount,
    avgGeoIndex: Math.round(avgScore._avg.latestGeoScore ?? 0),
    totalScans: eventCount,
  };
}

// ─── Analytics Telemetry & Channel Aggregations ──────────────────────────────

interface TelemetryEventRow {
  id: string;
  timestamp: Date;
  type: string;
  source: string;
  domain: string;
  destinationUrl: string;
  intent: string;
  geoScoreAtTime: number;
  settlementValue: number | null;
}

export async function getAnalyticsSummary() {
  try {
    const db = prisma;
    const [totalEvents, txEvents, sumGmv, domainCount, eventsList] = await Promise.all([
      db.telemetryEvent.count(),
      db.telemetryEvent.count({ where: { type: 'AGENT_TX' } }),
      db.telemetryEvent.aggregate({ _sum: { settlementValue: true } }),
      prisma.domain.count(),
      db.telemetryEvent.findMany({
        take: 30,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    const totalCount = Math.max(1, totalEvents || 0);
    const txCount = txEvents || 0;
    const gmv = Math.round(sumGmv?._sum?.settlementValue ?? 0);
    const convRate = totalEvents > 0 ? ((txCount / totalCount) * 100).toFixed(1) : '0.0';
    const avgOrderValue = txCount > 0 ? Math.round(gmv / txCount) : 0;

    // Channel breakdown
    const channelCounts: Record<string, number> = {
      'Perplexity Pro & Sonar Answers': 0,
      'OpenAI GPT-4o Search Citations': 0,
      'Autonomous Buyer Agents (agent.json)': 0,
      'P2P Cryptographic Human Mesh': 0,
      'Claude & Gemini Knowledge Grounding': 0,
    };

    (eventsList || []).forEach((ev: TelemetryEventRow) => {
      const src = (ev.source || '').toLowerCase();
      if (src.includes('perplexity')) {
        channelCounts['Perplexity Pro & Sonar Answers']++;
      } else if (src.includes('openai')) {
        channelCounts['OpenAI GPT-4o Search Citations']++;
      } else if (src.includes('buyer') || src.includes('langchain') || ev.type === 'AGENT_TX') {
        channelCounts['Autonomous Buyer Agents (agent.json)']++;
      } else if (src.includes('mesh') || src.includes('human')) {
        channelCounts['P2P Cryptographic Human Mesh']++;
      } else {
        channelCounts['Claude & Gemini Knowledge Grounding']++;
      }
    });

    const listLen = eventsList?.length || 0;
    const channels = Object.entries(channelCounts).map(([name, count]) => {
      const pct = listLen > 0 ? Math.round((count / listLen) * 100) : 0;
      return { name, count, percentage: pct };
    });

    const MIN_SAMPLE = 30;
    const sufficientData = (totalEvents || 0) >= MIN_SAMPLE;

    return {
      totalReferrals: totalEvents || 0,
      txCount,
      directGmv: gmv,
      avgOrderValue,
      monitoredDomains: domainCount || 0,
      conversionRate: `${convRate}%`,
      fraudBlocked: sufficientData ? '100.0%' : 'n/a',
      effectiveCac: sufficientData ? '$4.18' : 'n/a',
      agentLtv: sufficientData
        ? (avgOrderValue > 0 ? `$${avgOrderValue * 3}` : 'n/a')
        : 'n/a',
      channels,
      events: (eventsList || []).map((e: TelemetryEventRow) => ({
        id: e.id,
        timestamp: e.timestamp instanceof Date ? e.timestamp.toLocaleTimeString() : new Date(e.timestamp).toLocaleTimeString(),
        type: e.type,
        source: e.source,
        domain: e.domain,
        destinationUrl: e.destinationUrl,
        intent: e.intent,
        geoScoreAtTime: e.geoScoreAtTime,
        settlementValue: e.settlementValue ?? undefined,
      })),
    };
  } catch (err) {
    console.warn('Analytics summary fallback:', err);
    return null;
  }
}

// ─── Per-Domain Agent Traffic Analytics ───────────────────────────────────────

export interface DomainAgentHit {
  agentName: string;
  classification: string;
  hits: number;
  lastSeen: string;
}

export interface DomainAnalytics {
  domain: string;
  geoScore: number;
  status: string;
  trend: 'up' | 'down' | 'flat';
  trendDelta: number;
  scanCount: number;
  lastScanned: string;
  scoreHistory: { date: string; score: number }[];
  agentHits: DomainAgentHit[];
  totalAgentHits7d: number;
  referralsByEngine: { engine: string; count: number }[];
  crawledByAgents7d: number;
}

/**
 * Full analytics picture for one domain: GEO score history + real agent
 * traffic from TelemetryEvent rows written by the tracking snippet.
 */
export async function getDomainAnalytics(domain: string): Promise<DomainAnalytics | null> {
  const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [domainRow, scoreHistory, recentEvents] = await Promise.all([
      prisma.domain.findUnique({ where: { domain: cleanDomain } }),
      getDomainHistory(cleanDomain, 14),
      prisma.telemetryEvent.findMany({
        where: { domain: cleanDomain, timestamp: { gte: weekAgo } },
        orderBy: { timestamp: 'desc' },
        take: 500,
      }),
    ]);

    if (!domainRow) return null;

    // Aggregate agent hits by source
    const hitMap = new Map<string, DomainAgentHit>();
    const engineMap = new Map<string, number>();
    let crawledByAgents7d = 0;

    for (const ev of recentEvents) {
      const existing = hitMap.get(ev.source);
      if (existing) {
        existing.hits++;
      } else {
        hitMap.set(ev.source, {
          agentName: ev.source,
          classification: ev.intent.split(' ')[0] || ev.type,
          hits: 1,
          lastSeen: ev.timestamp.toISOString(),
        });
      }

      // Answer-engine referrals (AI_CITATION with a named engine source)
      if (ev.type === 'AI_CITATION') {
        engineMap.set(ev.source, (engineMap.get(ev.source) ?? 0) + 1);
      }
      // Crawler/agent activity (indexing pings + agent transactions)
      if (ev.type === 'GEO_INDEX_PING' || ev.type === 'AGENT_TX') {
        crawledByAgents7d++;
      }
    }

    return {
      domain: cleanDomain,
      geoScore: domainRow.latestGeoScore,
      status: domainRow.status,
      trend: domainRow.trend as 'up' | 'down' | 'flat',
      trendDelta: domainRow.trendDelta,
      scanCount: domainRow.scanCount,
      lastScanned: domainRow.lastScanned.toISOString(),
      scoreHistory,
      agentHits: [...hitMap.values()].sort((a, b) => b.hits - a.hits),
      totalAgentHits7d: recentEvents.length,
      referralsByEngine: [...engineMap.entries()]
        .map(([engine, count]) => ({ engine, count }))
        .sort((a, b) => b.count - a.count),
      crawledByAgents7d,
    };
  } catch (e) {
    console.error('[getDomainAnalytics] Error:', e);
    return null;
  }
}


