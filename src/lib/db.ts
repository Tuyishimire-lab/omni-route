import { prisma } from './prisma';
import { GeoAuditReport } from './types';

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

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(category?: string) {
  const where = category && category !== 'All' ? { category } : {};

  const domains = await prisma.domain.findMany({
    where: { ...where, scanCount: { gte: 1 } },
    orderBy: { latestGeoScore: 'desc' },
    take: 50,
  });

  return domains.map((d, i) => ({
    rank: i + 1,
    domain: d.domain,
    category: d.category,
    geoScore: d.latestGeoScore,
    citationWinRate: d.latestCitationRate,
    zeroClickResilience: d.latestZeroClickResilience,
    trend: d.trend as 'up' | 'down' | 'flat',
    trendDelta: d.trendDelta,
    scanCount: d.scanCount,
    lastScanned: d.lastScanned ? new Date(d.lastScanned).toISOString() : new Date().toISOString(),
  }));
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

  return events.map((e) => ({
    date: e.scannedAt.toISOString().split('T')[0],
    score: e.geoScore,
  }));
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
    .map((d) => rows.find((r) => r.domain === d))
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
