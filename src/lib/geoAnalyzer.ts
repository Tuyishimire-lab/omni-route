import { GeoAuditReport } from './types';
import {
  computeDeterministicGeoSubscores,
  buildEngineBreakdown,
  buildDetectedEntities,
  buildRecommendations,
  buildScoreSummary,
  hashDomain,
} from './scoreCalculator';

export function analyzeDomainGEO(rawDomain: string): GeoAuditReport {
  const cleanDomain = rawDomain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase()
    .trim() || 'example.com';

  const subscores = computeDeterministicGeoSubscores(cleanDomain);
  const hash = hashDomain(cleanDomain);
  const engineBreakdown = buildEngineBreakdown(subscores.overallGeoScore, hash % 4000);

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
  };
}
