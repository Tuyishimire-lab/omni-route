'use client';

import React, { useState, useEffect } from 'react';
import { LiveTelemetryEvent } from '../lib/types';
import { getInitialTelemetry, generateMockTelemetryEvent } from '../lib/mockTelemetry';
import { Activity, CheckCircle2, Cpu, ArrowUpRight, Radio } from 'lucide-react';

export default function TrafficTelemetry() {
  const [events, setEvents] = useState<LiveTelemetryEvent[]>(() => getInitialTelemetry(7));
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setEvents((prev) => [generateMockTelemetryEvent(), ...prev.slice(0, 19)]);
    }, 2800);
    return () => clearInterval(interval);
  }, [isLive]);

  const getEventBadge = (type: LiveTelemetryEvent['type']) => {
    switch (type) {
      case 'AGENT_TX':
        return 'bg-[rgba(5,173,152,0.18)] text-[#05AD98] border-[rgba(5,173,152,0.25)]';
      case 'AI_CITATION':
        return 'bg-[rgba(5,173,152,0.20)] text-[#05AD98] border-[rgba(5,173,152,0.3)]';
      case 'P2P_MESH_CLICK':
        return 'bg-[rgba(5,173,152,0.12)] text-[#BBBFBF] border-[rgba(5,173,152,0.25)]';
      default:
        return 'bg-slate-700/40 text-[#BBBFBF] border-[rgba(187,191,191,0.12)]';
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
      {/* Stream Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(187,191,191,0.10)]">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.2)]">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Live Autonomous Traffic & Attestation Feed
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h3>
            <p className="text-[11px] text-[#878787]">
              Real-time cryptographic stream of AI agent queries, generative citations, and direct purchases.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsLive(!isLive)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
            isLive
              ? 'bg-[rgba(5,173,152,0.10)] text-[#05AD98] border-[rgba(5,173,152,0.25)]'
              : 'bg-[#1A2020] text-[#878787] border-[rgba(187,191,191,0.12)]'
          }`}
        >
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          {isLive ? 'Live Streaming' : 'Stream Paused'}
        </button>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[rgba(187,191,191,0.10)] text-[#878787] font-semibold uppercase tracking-wider text-[10px]">
              <th className="pb-3 pr-4">Timestamp</th>
              <th className="pb-3 pr-4">Event Type</th>
              <th className="pb-3 pr-4">Origin Entity / Agent</th>
              <th className="pb-3 pr-4">Target Resource</th>
              <th className="pb-3 pr-4">Intent / Action</th>
              <th className="pb-3 text-right">Settlement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/80">
            {events.map((evt) => (
              <tr key={evt.id} className="hover:bg-slate-850/40 transition-colors">
                <td className="py-3 pr-4 font-mono text-[#878787]">{evt.timestamp}</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getEventBadge(evt.type)}`}>
                    {evt.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 pr-4 font-medium text-slate-200">{evt.source}</td>
                <td className="py-3 pr-4 font-mono text-[#05AD98] truncate max-w-[180px]">{evt.destinationUrl}</td>
                <td className="py-3 pr-4 text-[#BBBFBF]">{evt.intent}</td>
                <td className="py-3 text-right font-mono font-bold">
                  {evt.settlementValue ? (
                    <span className="text-[#05AD98]">+${evt.settlementValue}.00</span>
                  ) : (
                    <span className="text-[#878787] font-normal">Verified Free</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
