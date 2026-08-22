'use client';

import React, { useState, useEffect } from 'react';
import { LiveTelemetryEvent } from '../lib/types';
import { getInitialTelemetry, generateMockTelemetryEvent } from '../lib/mockTelemetry';
import { Activity, CheckCircle2, Cpu, ArrowUpRight, Radio, Database } from 'lucide-react';

interface TrafficTelemetryProps {
  initialEvents?: LiveTelemetryEvent[];
}

export default function TrafficTelemetry({ initialEvents }: TrafficTelemetryProps) {
  // Start empty on both server and client — mock/DB events are hydrated in an
  // effect. Generating events during initial render causes a hydration
  // mismatch (timestamps differ between server and client).
  const [events, setEvents] = useState<LiveTelemetryEvent[]>(initialEvents ?? []);
  const [isLive, setIsLive] = useState(true);
  // Demo mode: no real events were provided, so the stream is simulated.
  const [isDemo, setIsDemo] = useState(!initialEvents || initialEvents.length === 0);

  // Hydrate events after mount — deferred to avoid sync setState in effect
  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      const t = setTimeout(() => {
        setEvents(initialEvents);
        setIsDemo(false);
      }, 0);
      return () => clearTimeout(t);
    } else {
      fetch('/api/v1/analytics')
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data?.events && json.data.events.length > 0) {
            setEvents(json.data.events);
            setIsDemo(false);
          } else {
            // No real data — fall back to clearly-labeled demo events
            setEvents(getInitialTelemetry(8));
          }
        })
        .catch(() => setEvents(getInitialTelemetry(8)));
    }
  }, [initialEvents]);

  // Live streaming simulation adding new edge pulses.
  // Only inject simulated events while in demo mode — never mix fabricated
  // rows into a real DB-backed feed.
  useEffect(() => {
    if (!isLive || !isDemo) return;
    const interval = setInterval(() => {
      setEvents((prev) => [generateMockTelemetryEvent(), ...prev.slice(0, 24)]);
    }, 2800);
    return () => clearInterval(interval);
  }, [isLive, isDemo]);

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
              {isDemo && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Demo Data
                </span>
              )}
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h3>
            <p className="text-[11px] text-[#878787]">
              {isDemo
                ? 'Simulated stream for demonstration purposes — events shown are illustrative, not real traffic.'
                : 'Real-time cryptographic stream of AI agent queries, generative citations, and direct purchases from Turso database.'}
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
          <Radio className={`w-3.5 h-3.5 ${isLive ? 'animate-pulse text-[#05AD98]' : 'text-[#878787]'}`} />
          <span>{isLive ? 'Live Streaming' : 'Stream Paused'}</span>
        </button>
      </div>

      {/* Events Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[#878787] border-b border-[rgba(187,191,191,0.08)]">
              <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Timestamp</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Event Type</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Origin Entity / Agent</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Target Resource</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-[10px]">Intent / Action</th>
              <th className="pb-3 font-semibold uppercase tracking-wider text-[10px] text-right">Settlement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(187,191,191,0.05)]">
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-[#111514]/60 transition-colors">
                <td className="py-2.5 font-mono text-[#878787] whitespace-nowrap">{ev.timestamp}</td>
                <td className="py-2.5">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getEventBadge(ev.type)}`}>
                    {ev.type}
                  </span>
                </td>
                <td className="py-2.5 text-white font-medium whitespace-nowrap">{ev.source}</td>
                <td className="py-2.5 font-mono text-[#05AD98] truncate max-w-[200px]" title={ev.destinationUrl}>
                  {ev.destinationUrl}
                </td>
                <td className="py-2.5 text-[#BBBFBF] truncate max-w-[220px]" title={ev.intent}>
                  {ev.intent}
                </td>
                <td className="py-2.5 text-right font-mono font-bold whitespace-nowrap">
                  {ev.settlementValue ? (
                    <span className="text-[#05AD98]">+${ev.settlementValue.toFixed(2)}</span>
                  ) : (
                    <span className="text-[#878787] font-normal text-[11px]">Verified Free</span>
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
