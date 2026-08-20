import React from 'react';
import PromptSandbox from '../../components/PromptSandbox';
import { Activity, Info, Cpu, Layers } from 'lucide-react';

export default function SimulatorPage() {
  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-[rgba(187,191,191,0.10)] space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-[#B8A04A]">
          <Activity className="w-3.5 h-3.5" />
          <span>Generative Search Simulation & Competitive Share-of-Voice</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          AI Prompt & Citation Sandbox
        </h1>
        <p className="text-xs sm:text-sm text-[#BBBFBF] max-w-3xl leading-relaxed">
          Test custom high-intent user prompts against current foundation model reasoning graphs. Discover whether your brand is cited as the primary authority, how competitor links rank, and your projected monthly agent referral influx.
        </p>
      </div>

      {/* Interactive Sandbox */}
      <PromptSandbox />
    </div>
  );
}
