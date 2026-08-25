'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { LiveTelemetryEvent } from '../lib/types';
import { getInitialTelemetry } from '../lib/mockTelemetry';
import { Activity, Radio, RefreshCw } from 'lucide-react';

const POLL_INTERVAL_MS = 30_000;

// ─── Loading skeleton row ────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[80, 100, 140, 200, 180, 60].map((w, i) => (
        <td key={i} className="py-3">
          <div
            className="h-3 rounded-full bg-[#1A2020] animate-pulse"
            style={{ width: w, maxWidth: '100%' }}
          />
        </td>
      ))}
    </tr>
  );
}

interface TrafficTelemetryProps {
  initialEvents?: LiveTelemetryEvent[];
}

export default function TrafficTelemetry({ initialEvents }: TrafficTelemetryProps) {
  const [events, setEvents] = useState<LiveTelemetryEvent[]>(initialEvents ?? []);
  const [isLive, setIsLive] = useState(true);
  const [isDemo, setIsDemo] = useState(!initialEvents || initialEvents.length === 0);
  // true only during the first fetch before any rows are available
  const [isLoading, setIsLoading] = useState(!initialEvents || initialEvents.length === 0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a stable ref to events so fetchEvents closure doesn't go stale
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  // ─── Fetch helper ────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/analytics');
      if (!res.ok) throw new Error('non-2xx');
      const json = await res.json();
      if (json?.data?.events && json.data.events.length > 0) {
        setEvents(json.data.events);
        setIsDemo(false);
      } else if (eventsRef.current.length === 0) {
        setEvents(getInitialTelemetry(8));
      }
      setLastRefreshed(new Date());
    } catch {
      if (eventsRef.current.length === 0) {
        setEvents(getInitialTelemetry(8));
        setLastRefreshed(new Date());
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Initial hydration ──────────────────────────────────────────────────
  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      setEvents(initialEvents);
      setIsDemo(false);
      setIsLoading(false);
      setLastRefreshed(new Date());
      return;
    }
    fetchEvents();
  }, [initialEvents, fetchEvents]);

  // ─── Polling: controlled by isLive ───────────────────────────────────────
  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEvents();
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLive, fetchEvents]);

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
              Live Autonomous Traffic &amp; Attestation Feed
              {isDemo && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Demo Data
                </span>
              )}
              {/* Pulse dot only shown when actively streaming */}
              {isLive && !isLoading && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#878787]">
              {isDemo ? (
                <>
                  Illustrative demo — not real traffic.{' '}
                  <Link href="/analytics" className="text-[#05AD98] hover:underline">
                    View your real data on Analytics →
                  </Link>
                </>
              ) : lastRefreshed ? (
                <>
                  Real-time stream · last refreshed{' '}
                  <span className="text-[#BBBFBF]">{lastRefreshed.toLocaleTimeString()}</span>
                  {isLive && <span className="text-[#878787]"> · refreshes every 30s</span>}
                </>
              ) : (
                'Real-time stream of AI agent queries, generative citations, and direct purchases.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual refresh */}
          <button
            onClick={fetchEvents}
            title="Refresh now"
            className="p-1.5 rounded-lg text-[#878787] hover:text-[#05AD98] hover:bg-[rgba(5,173,152,0.08)] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {/* Pause / Resume */}
          <button
            onClick={() => setIsLive((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              isLive
                ? 'bg-[rgba(5,173,152,0.10)] text-[#05AD98] border-[rgba(5,173,152,0.25)]'
                : 'bg-[#1A2020] text-[#878787] border-[rgba(187,191,191,0.12)]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLive ? 'animate-pulse text-[#05AD98]' : 'text-[#878787]'}`} />
            <span>{isLive ? 'Live' : 'Paused'}</span>
          </button>
        </div>
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
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#878787] text-xs">
                  No traffic events yet. Events appear once your tracking tag receives AI or agent visits.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
