import React from 'react';
import TrafficTelemetry from '../../components/TrafficTelemetry';
import RoiCalculator from '../../components/RoiCalculator';
import MetricCard from '../../components/MetricCard';
import {
  BarChart3,
  TrendingUp,
  Cpu,
  Activity,
  ArrowUpRight,
  PieChart,
  CheckCircle2
} from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.20)] text-xs font-semibold text-[#05AD98]">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Real-Time Traffic Liquidity & Yield Network</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Traffic Liquidity & Conversion Analytics
        </h1>
        <p className="text-xs sm:text-sm text-[#BBBFBF] max-w-3xl leading-relaxed">
          Monitor your cross-channel synthetic-to-human traffic streams in real-time. Track agentic transaction conversion rates, zero-click citation attribution, and cryptographic proof-of-human click verification.
        </p>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Monthly Agent Referrals"
          value="412,850"
          change="+31.2% this month"
          isPositive={true}
          subtitle="Direct machine traffic"
          icon={Cpu}
          accentColor="sky"
        />
        <MetricCard
          title="Direct Agentic GMV"
          value="$1.48M"
          change="+$340k vs last month"
          isPositive={true}
          subtitle="Autonomous checkouts"
          icon={TrendingUp}
          accentColor="emerald"
        />
        <MetricCard
          title="Avg. Machine Conversion Rate"
          value="14.2%"
          change="3.8x vs human web avg"
          isPositive={true}
          subtitle="High-intent agent transactions"
          icon={Activity}
          accentColor="indigo"
        />
        <MetricCard
          title="Verified Bot Fraud Blocked"
          value="99.98%"
          change="Zero fraudulent ad clicks"
          isPositive={true}
          subtitle="Cryptographic attestation"
          icon={CheckCircle2}
          accentColor="amber"
        />
      </div>

      {/* Traffic Sources Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 glass-card rounded-3xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#05AD98]" />
            Traffic Influx Channels Distribution
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-[#BBBFBF] mb-1">
                <span>Perplexity Pro & Sonar Answers</span>
                <span className="font-mono text-[#05AD98] font-semibold">41.2% (170,094 visits)</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-sky-400 h-full rounded-full" style={{ width: '41.2%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[#BBBFBF] mb-1">
                <span>OpenAI GPT-4o Search Citations</span>
                <span className="font-mono text-[#05AD98] font-semibold">28.5% (117,662 visits)</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full" style={{ width: '28.5%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[#BBBFBF] mb-1">
                <span>Autonomous Buyer Agents (agent.json)</span>
                <span className="font-mono text-[#05AD98] font-semibold">18.4% (75,964 checkouts)</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '18.4%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[#BBBFBF] mb-1">
                <span>P2P Cryptographic Human Mesh Referrals</span>
                <span className="font-mono text-[#B8A04A] font-semibold">11.9% (49,130 visits)</span>
              </div>
              <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '11.9%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Economic Yield Breakdown */}
        <div className="lg:col-span-6 glass-card rounded-3xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#05AD98]" />
            Unit Economics & CAC Efficiency
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-[#111514]/60 rounded-xl border border-[rgba(187,191,191,0.10)]">
              <span className="text-[#878787] block">Effective Blended CAC</span>
              <span className="text-2xl font-bold font-mono text-[#05AD98] mt-1 block">$4.18</span>
              <span className="text-[10px] text-[#878787] mt-0.5 block">-88% vs Paid Google Ads</span>
            </div>

            <div className="p-3.5 bg-[#111514]/60 rounded-xl border border-[rgba(187,191,191,0.10)]">
              <span className="text-[#878787] block">Agent Lifetime Value (LTV)</span>
              <span className="text-2xl font-bold font-mono text-[#05AD98] mt-1 block">$1,240</span>
              <span className="text-[10px] text-[#878787] mt-0.5 block">High recurring bot frequency</span>
            </div>
          </div>

          <div className="p-4 bg-[rgba(5,173,152,0.10)] rounded-xl border border-[rgba(5,173,152,0.20)] text-xs text-emerald-200">
            <span className="font-semibold block mb-1">OmniRoute Traffic Liquidity Guarantee:</span>
            By serving machine-readable vectors and cryptographic click attestations, all inbound traffic carries a 0% bounce rate for automated API queries and a verified sub-200ms conversion funnel.
          </div>
        </div>
      </div>

      {/* Telemetry Stream */}
      <TrafficTelemetry />

      {/* Yield & ROI Calculator */}
      <RoiCalculator />
    </div>
  );
}
