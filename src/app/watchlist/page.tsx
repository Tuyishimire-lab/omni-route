import React from 'react';
import WatchlistManager from '../../components/WatchlistManager';
import { Bookmark, Info, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function WatchlistPage() {
  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.2)] text-xs font-semibold text-[#05AD98]">
          <Bookmark className="w-3.5 h-3.5" />
          <span>Continuous Citation Monitoring & Authority Tracking</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Domain Watchlist & Score History
        </h1>
        <p className="text-xs sm:text-sm text-[#BBBFBF] max-w-3xl leading-relaxed">
          Monitor your domain portfolio and key competitor properties. Track fluctuations in AI citation probabilities, zero-click vulnerability, and receive automated diagnostic change alerts.
        </p>
      </div>

      <WatchlistManager />
    </div>
  );
}
