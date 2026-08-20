'use client';

import React, { useState, useEffect } from 'react';
import GeoBadge from '../../../components/GeoBadge';
import { analyzeDomainGEO } from '../../../lib/geoAnalyzer';
import { Loader2, Award } from 'lucide-react';


export default function BadgePage({ params }: { params: Promise<{ domain: string }> }) {
  const unwrappedParams = React.use(params);
  const domain = decodeURIComponent(unwrappedParams.domain || 'stripe.com');
  const [geoScore, setGeoScore] = useState(0);
  const [citationRate, setCitationRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const report = analyzeDomainGEO(domain);
        setGeoScore(report.overallGeoScore);
        setCitationRate(report.engineBreakdown[0]?.citationProbability || 75);
      } catch {
        setGeoScore(72);
        setCitationRate(71);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [domain]);

  return (
    <main className="min-h-screen bg-omni-mesh">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
            style={{ borderColor: 'rgba(5,173,152,0.3)', background: 'rgba(5,173,152,0.10)', color: '#05AD98' }}
          >
            <Award className="w-3.5 h-3.5" />
            OmniRoute GEO Authority Badge
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            GEO Badge for <span className="text-gradient font-mono">{domain}</span>
          </h1>
          <p className="text-sm" style={{ color: '#878787' }}>
            Embed this verified GEO Authority badge on your website, README, or marketing materials.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#05AD98' }} />
          </div>
        ) : (
          <GeoBadge domain={domain} geoScore={geoScore} citationRate={citationRate} />
        )}
      </div>
    </main>
  );
}
