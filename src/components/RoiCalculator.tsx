'use client';

import React, { useState } from 'react';
import { DollarSign, TrendingUp, Info, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RoiCalculator() {
  const [monthlyVisits, setMonthlyVisits] = useState(50000);
  const [currentCac, setCurrentCac] = useState(65);
  const [avgOrderValue, setAvgOrderValue] = useState(120);

  // Math models
  const estimatedAgentTraffic = Math.round(monthlyVisits * 0.38);
  const monthlySavingsOnAds = Math.round((estimatedAgentTraffic / 100) * 8 * 3.4); // Equivalent Google CPC
  const estimatedAgenticGmv = Math.round(estimatedAgentTraffic * 0.042 * avgOrderValue);
  const totalMonthlyImpact = monthlySavingsOnAds + estimatedAgenticGmv;

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.20)] shrink-0">
          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white">Agentic Traffic & CAC Yield Calculator</h3>
          <p className="text-[11px] sm:text-xs text-[#878787]">
            Estimate how much revenue is unlocked by capturing autonomous AI buyer agents and generative search citations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
        {/* Sliders Input */}
        <div className="lg:col-span-6 space-y-5">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-[#BBBFBF]">Monthly Visitors</span>
              <span className="text-[#05AD98] font-mono">{monthlyVisits.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="5000"
              max="1000000"
              step="5000"
              value={monthlyVisits}
              onChange={(e) => setMonthlyVisits(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-[#BBBFBF]">Paid Acquisition CAC</span>
              <span className="text-[#05AD98] font-mono">${currentCac}</span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="5"
              value={currentCac}
              onChange={(e) => setCurrentCac(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-[#BBBFBF]">Average Order Value (AOV)</span>
              <span className="text-[#05AD98] font-mono">${avgOrderValue}</span>
            </div>
            <input
              type="range"
              min="20"
              max="2500"
              step="10"
              value={avgOrderValue}
              onChange={(e) => setAvgOrderValue(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>
        </div>

        {/* Results Card */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-4 sm:p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
          <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-[#878787] block">
            Projected Monthly Economic Impact
          </span>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 bg-[#111514]/70 rounded-xl border border-[rgba(187,191,191,0.10)]">
              <span className="text-[10px] sm:text-[11px] text-[#878787]">Captured Agent Visits</span>
              <span className="text-lg sm:text-xl font-bold font-mono text-white block mt-1">
                +{estimatedAgentTraffic.toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-[#111514]/70 rounded-xl border border-[rgba(187,191,191,0.10)]">
              <span className="text-[10px] sm:text-[11px] text-[#878787]">Ad Spend Saved</span>
              <span className="text-lg sm:text-xl font-bold font-mono text-[#05AD98] block mt-1">
                ${monthlySavingsOnAds.toLocaleString()}/mo
              </span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 bg-[#0A0E0E]/80 rounded-xl border border-[rgba(5,173,152,0.20)] text-center">
            <span className="text-[11px] sm:text-xs text-[#878787]">Total Unlocked Net Value (Yearly):</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#05AD98] font-mono block mt-1">
              ${(totalMonthlyImpact * 12).toLocaleString()} / yr
            </span>
          </div>

          <Link
            href="/audit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[rgba(5,173,152,0.20)] transition-all"
          >
            Run Free GEO Audit on Your Domain <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
