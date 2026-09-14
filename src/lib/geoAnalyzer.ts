import { GeoAuditReport } from './types';
import {
  computeDeterministicGeoSubscores,
  buildEngineBreakdown,
  buildDetectedEntities,
  buildRecommendations,
  buildScoreSummary,
} from './scoreCalculator';

export function analyzeDomainGEO(rawDomain: string): GeoAuditReport {
  const cleanDomain = rawDomain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase()
    .trim();

  if (!cleanDomain) {
    throw new Error('Domain is required for GEO analysis');
  }

  const subscores = computeDeterministicGeoSubscores(cleanDomain);
  // Engine breakdown requires real API keys - returns empty array here.
  // The UI shows the "Connect engine API keys" callout when this is empty.
  const engineBreakdown = buildEngineBreakdown(subscores.overallGeoScore, 0, []);

  const domainNameCapitalized = cleanDomain.split('.')[0].charAt(0).toUpperCase() + cleanDomain.split('.')[0].slice(1);
  const detectedEntities = buildDetectedEntities(domainNameCapitalized, subscores.overallGeoScore);
  const recommendations = buildRecommendations({
    cleanDomain,
    brandName: domainNameCapitalized,
    fullUrl: `https://${cleanDomain}`,
  });
  const summary = buildScoreSummary(cleanDomain, subscores.overallGeoScore);

  return {
    domain: cleanDomain,
    url: `https://${cleanDomain}`,
    analyzedAt: new Date().toISOString(),
    ...subscores,
    engineBreakdown,
    detectedEntities,
    recommendations,
    summary,
    dataSource: 'structural_estimate' as const,
  };
}
