'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Cpu, RefreshCw } from 'lucide-react';

interface TerminalStep {
  id: string;
  label: string;
  detail?: string;
  delayMs: number;
  durationMs: number;
}

const SCAN_STEPS: TerminalStep[] = [
  {
    id: 'init',
    label: 'Initializing CiteRoute Engine telemetry pipeline',
    detail: 'Configuring sandbox and protocol listeners',
    delayMs: 200,
    durationMs: 600,
  },
  {
    id: 'crawl',
    label: 'Connecting to live DOM via deep-crawler',
    detail: 'Inspecting robots.txt permissions and crawl boundaries',
    delayMs: 900,
    durationMs: 1100,
  },
  {
    id: 'schema',
    label: 'Parsing JSON-LD schemas and semantic heading hierarchies',
    detail: 'Checking Organization, WebSite, and SoftwareApplication entities',
    delayMs: 2100,
    durationMs: 1000,
  },
  {
    id: 'entity',
    label: 'Resolving knowledge graph anchors and vector density',
    detail: 'Matching latent semantic entities and disambiguation nodes',
    delayMs: 3200,
    durationMs: 1200,
  },
  {
    id: 'perplexity',
    label: 'Querying Perplexity Sonar (Live Web Retrieval)',
    detail: 'Testing real-time index retrieval and web attribution links',
    delayMs: 4500,
    durationMs: 1400,
  },
  {
    id: 'chatgpt',
    label: 'Querying OpenAI GPT-4o Search and Synthesis',
    detail: 'Assessing brand recognition and cross-source synthesis confidence',
    delayMs: 6000,
    durationMs: 1400,
  },
  {
    id: 'claude',
    label: 'Assessing Claude 3.5 Latent Entity Memory',
    detail: 'Verifying parameter knowledge and passage density',
    delayMs: 7500,
    durationMs: 1400,
  },
  {
    id: 'gemini',
    label: 'Testing Google Gemini Knowledge Graph Grounding',
    detail: 'Inspecting entity attribution and structured sameAs links',
    delayMs: 9000,
    durationMs: 1400,
  },
  {
    id: 'matrix',
    label: 'Calculating 4-Pillar GEO Vector Matrix',
    detail: 'Computing Zero-Click, Information Gain, and Vector Readiness',
    delayMs: 10500,
    durationMs: 1200,
  },
  // ── Component Generation & Synthesis Phase ─────────────────────────────
  {
    id: 'comp_schemas',
    label: 'Synthesizing production-ready JSON-LD schemas',
    detail: 'Building custom Organization and FAQPage schemas with verified types',
    delayMs: 11800,
    durationMs: 1400,
  },
  {
    id: 'comp_patches',
    label: 'Compiling in-project deployment patches and guide cards',
    detail: 'Generating Next.js App Router, Vite, and Astro step-by-step instructions',
    delayMs: 13300,
    durationMs: 1400,
  },
  {
    id: 'comp_manifest',
    label: 'Generating machine-readable agent.json autonomous routing endpoints',
    detail: 'Formulating agentic protocol capabilities, pricing, and API schema',
    delayMs: 14800,
    durationMs: 1400,
  },
  {
    id: 'comp_vectors',
    label: 'Building Vector Chunk Hierarchy and semantic passage embeddings',
    detail: 'Structuring content chunks for optimal RAG vector retrieval',
    delayMs: 16300,
    durationMs: 1400,
  },
  {
    id: 'comp_summary',
    label: 'Synthesizing executive summary and competitive displacement strategies',
    detail: 'Formulating tactical steps to out-cite niche competitors in AI search',
    delayMs: 17800,
    durationMs: 1400,
  },
  {
    id: 'comp_visuals',
    label: 'Assembling interactive visual radar matrices and metric gauges',
    detail: 'Formatting high-contrast responsive layouts and PDF print stylesheets',
    delayMs: 19300,
    durationMs: 1500,
  },
];

const PROBE_STEPS: TerminalStep[] = [
  {
    id: 'probe_init',
    label: 'Connecting to OpenRouter foundation gateway',
    detail: 'Allocating high-throughput cascade endpoints',
    delayMs: 100,
    durationMs: 400,
  },
  {
    id: 'p_sonar',
    label: 'Dispatching probe to Perplexity Pro / Sonar',
    detail: 'Searching live index for verified domain citations',
    delayMs: 600,
    durationMs: 1100,
  },
  {
    id: 'p_gpt',
    label: 'Dispatching probe to OpenAI GPT-4o Search',
    detail: 'Evaluating entity authority and verified offerings',
    delayMs: 1800,
    durationMs: 1100,
  },
  {
    id: 'p_claude',
    label: 'Dispatching probe to Claude 3.5 Knowledge Graph',
    detail: 'Extracting latent weights and passage grounding',
    delayMs: 3000,
    durationMs: 1100,
  },
  {
    id: 'p_gemini',
    label: 'Dispatching probe to Google Gemini Grounding',
    detail: 'Evaluating multi-modal entity links and attribution',
    delayMs: 4200,
    durationMs: 1100,
  },
  {
    id: 'p_analyze',
    label: 'Analyzing model responses and attribution phrases',
    detail: 'Calculating 3-tier citation status and verbatim excerpts',
    delayMs: 5400,
    durationMs: 900,
  },
  {
    id: 'p_assemble',
    label: 'Compiling citation verdict cards and source badges',
    detail: 'Cleaning markdown asterisks and formatting executive snippets',
    delayMs: 6400,
    durationMs: 900,
  },
];

// Active heartbeats continuously appended if server processing continues past the standard steps
const SYNTHESIS_HEARTBEATS = [
  { label: 'Streaming model token weights and cross-referencing citations', detail: 'Verifying citation presence across search answer graphs' },
  { label: 'Validating Schema.org structural syntax and entity links', detail: 'Ensuring zero-error JSON-LD validation checks' },
  { label: 'Calibrating latent weight vectors across 4 engine nodes', detail: 'Synchronizing Perplexity, OpenAI, Claude, and Gemini diagnostics' },
  { label: 'Compiling responsive visual artifacts and print cover sheets', detail: 'Formatting high-contrast executive presentation layout' },
  { label: 'Awaiting final upstream telemetry payload from cascade cluster', detail: 'Final verification before displaying live report view' },
  { label: 'Synchronizing multi-model consensus scores', detail: 'Finalizing blended authority ratings and confidence vectors' },
];

export interface ScanTerminalStreamProps {
  domain: string;
  mode?: 'scan' | 'probe';
  title?: string;
  customQuery?: string;
  onFinish?: () => void;
}

export default function ScanTerminalStream({
  domain,
  mode = 'scan',
  title,
  customQuery,
  onFinish,
}: ScanTerminalStreamProps) {
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  const baseSteps = mode === 'probe' ? PROBE_STEPS : SCAN_STEPS;

  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set());
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [dynamicHeartbeats, setDynamicHeartbeats] = useState<Array<{ id: string; label: string; detail: string; timestamp: string; isDone: boolean }>>([]);
  const terminalLogsRef = useRef<HTMLDivElement>(null);

  // Live timer counter (100ms precision)
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Sequential step advancement
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    baseSteps.forEach((step, idx) => {
      const runTimeout = setTimeout(() => {
        setActiveStepIndex(idx);
      }, step.delayMs);
      timeouts.push(runTimeout);

      const completeTimeout = setTimeout(() => {
        setCompletedStepIds((prev) => new Set([...prev, step.id]));
        if (idx === baseSteps.length - 1 && onFinish) {
          onFinish();
        }
      }, step.delayMs + step.durationMs);
      timeouts.push(completeTimeout);
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [baseSteps, onFinish]);

  // Continuous dynamic heartbeats if scan continues past the standard steps
  useEffect(() => {
    const lastBaseStep = baseSteps[baseSteps.length - 1];
    const initialHeartbeatDelay = (lastBaseStep?.delayMs || 18000) + (lastBaseStep?.durationMs || 1500);

    const interval = setInterval(() => {
      if (elapsedMs > initialHeartbeatDelay) {
        setDynamicHeartbeats((prev) => {
          // Mark previous heartbeat as done
          const updated = prev.map((hb) => ({ ...hb, isDone: true }));
          const nextIndex = prev.length % SYNTHESIS_HEARTBEATS.length;
          const template = SYNTHESIS_HEARTBEATS[nextIndex];
          const newId = `hb-${Date.now()}-${prev.length}`;
          const currentSeconds = (elapsedMs / 1000).toFixed(1);

          return [
            ...updated,
            {
              id: newId,
              label: template.label,
              detail: template.detail,
              timestamp: `${currentSeconds}s`,
              isDone: false,
            },
          ];
        });
      }
    }, 3200);

    return () => clearInterval(interval);
  }, [elapsedMs, baseSteps]);

  // Auto-scroll terminal smoothly as new lines appear
  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [activeStepIndex, completedStepIds, dynamicHeartbeats]);

  // Smooth asymptotic progress curve: reaches ~70% at 15s, ~88% at 30s, ~95% at 50s, never stalls at 100%
  const progressPercent = Math.min(
    98,
    Math.max(5, Math.round(99 * (1 - Math.exp(-elapsedMs / 18000))))
  );

  const formatTime = (ms: number) => {
    const totalSeconds = (ms / 1000).toFixed(1);
    return `${totalSeconds}s`;
  };

  return (
    <div className="w-full rounded-2xl bg-[#030606] border border-[rgba(5,173,152,0.30)] shadow-2xl shadow-[rgba(0,0,0,0.8)] overflow-hidden font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="px-4 py-2.5 bg-[#070D0D] border-b border-[rgba(187,191,191,0.10)] flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/40 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/40 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/40 inline-block" />
          </div>
          <div className="flex items-center gap-1.5 ml-2 text-[11px] text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-[#05AD98]" />
            <span className="text-white font-semibold">
              citeroute-engine
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-[#05AD98] font-medium truncate max-w-[200px] sm:max-w-xs">
              {cleanDomain}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#878787] hidden sm:inline-block">
            ELAPSED: <strong className="text-slate-200">{formatTime(elapsedMs)}</strong>
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(5,173,152,0.10)] border border-[rgba(5,173,152,0.25)] text-[10px] text-[#05AD98] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE TELEMETRY STREAM</span>
          </div>
        </div>
      </div>

      {/* Terminal Content Stream */}
      <div
        ref={terminalLogsRef}
        className="p-4 sm:p-5 max-h-[380px] overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800"
      >
        <div className="text-[11px] text-[#878787] pb-1 border-b border-slate-900 flex items-center justify-between">
          <span>{title || (mode === 'probe' ? 'FOUNDATION MODEL EMPIRICAL PROBER' : 'CITEROUTE CORE ENGINE RUNTIME')}</span>
          <span>TARGET: {cleanDomain}</span>
        </div>

        {customQuery && (
          <div className="p-2 rounded-lg bg-[#070A0A] border border-[rgba(5,173,152,0.20)] text-[11px] text-slate-300">
            <span className="text-[#878787] uppercase text-[9px] block">Dispatched Probe Query:</span>
            <span className="italic text-[#05AD98]">&ldquo;{customQuery}&rdquo;</span>
          </div>
        )}

        <div className="space-y-2 pt-1">
          {/* Base Pipeline Steps */}
          {baseSteps.map((step, idx) => {
            const isCompleted = completedStepIds.has(step.id);
            const isCurrent = activeStepIndex === idx && !isCompleted;
            const isUpcoming = activeStepIndex < idx && !isCompleted;

            if (isUpcoming) return null;

            return (
              <div
                key={step.id}
                className="flex items-start gap-2.5 animate-fadeIn transition-all"
              >
                <span className="text-slate-600 shrink-0 select-none text-[10px] pt-0.5">
                  [{((step.delayMs) / 1000).toFixed(1)}s]
                </span>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 font-bold shrink-0">&gt;</span>
                    <span
                      className={`font-medium ${
                        isCompleted
                          ? 'text-slate-200'
                          : isCurrent
                          ? 'text-[#05AD98] font-semibold'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>

                    {isCompleted ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                        DONE
                      </span>
                    ) : isCurrent ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/25 inline-flex items-center gap-1 shrink-0">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        RUNNING
                      </span>
                    ) : null}
                  </div>

                  {step.detail && (
                    <p className="text-[10px] text-[#878787] pl-3 truncate">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Continuous Dynamic Synthesis Heartbeats */}
          {dynamicHeartbeats.map((hb) => (
            <div
              key={hb.id}
              className="flex items-start gap-2.5 animate-fadeIn transition-all"
            >
              <span className="text-slate-600 shrink-0 select-none text-[10px] pt-0.5">
                [{hb.timestamp}]
              </span>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-500 font-bold shrink-0">&gt;</span>
                  <span className={`font-medium ${hb.isDone ? 'text-slate-200' : 'text-[#05AD98] font-semibold'}`}>
                    {hb.label}
                  </span>

                  {hb.isDone ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                      DONE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/25 inline-flex items-center gap-1 shrink-0">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      RUNNING
                    </span>
                  )}
                </div>

                {hb.detail && (
                  <p className="text-[10px] text-[#878787] pl-3 truncate">
                    {hb.detail}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Active Terminal Cursor - ALWAYS stays active while telemetry is running */}
          <div className="flex items-center gap-2 pt-1 text-slate-500">
            <span className="text-[#05AD98] font-bold">&gt;</span>
            <span className="text-slate-400 text-[11px] inline-flex items-center gap-1.5">
              <span>Compiling live report components</span>
              <span className="text-slate-600 font-mono text-[10px]">[{formatTime(elapsedMs)}]</span>
            </span>
            <span className="inline-block w-2 h-3.5 bg-[#05AD98] animate-pulse align-middle" />
          </div>
        </div>
      </div>

      {/* Terminal Status Bar & Continuous Progress Tracker */}
      <div className="px-4 py-2.5 bg-[#070D0D] border-t border-[rgba(187,191,191,0.10)] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Cpu className="w-3.5 h-3.5 text-[#05AD98] shrink-0" />
          <div className="w-full sm:w-56 bg-[#111616] h-1.5 rounded-full overflow-hidden border border-slate-850">
            <div
              className="bg-[#05AD98] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-300 font-mono">
            {progressPercent}%
          </span>
        </div>

        <div className="text-[10px] text-[#878787] text-right w-full sm:w-auto">
          <span>Engine Status: </span>
          <span className="text-emerald-400 font-semibold">Active Pipeline Ingestion</span>
        </div>
      </div>
    </div>
  );
}
