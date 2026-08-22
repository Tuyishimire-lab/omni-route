'use client';

import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';

interface VerifyResult {
  found: boolean;
  method: 'heartbeat' | 'query-param' | 'data-attribute' | 'bare' | null;
  siteDomain: string | null;
  domainMatch: boolean;
  tagUrl: string | null;
  checkedUrl: string;
  heartbeatAge?: string | null;
  error?: string;
}

export default function TagVerifier() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verify = async () => {
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!d) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/v1/verify?domain=${encodeURIComponent(d)}`);
      const data: VerifyResult = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, method: null, siteDomain: null, domainMatch: false, tagUrl: null, checkedUrl: d, error: 'Network error - please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const status = !result ? null
    : result.error ? 'error'
    : result.found && result.domainMatch ? 'ok'
    : result.found ? 'warn'
    : 'missing';

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#111514] border border-[rgba(187,191,191,0.15)] focus-within:border-[rgba(5,173,152,0.50)] transition-colors">
          <Search className="w-4 h-4 text-[#878787] shrink-0" />
          <input
            type="text"
            value={domain}
            onChange={(e) => { setDomain(e.target.value); setResult(null); }}
            onKeyDown={(e) => e.key === 'Enter' && !loading && verify()}
            placeholder="yourdomain.com"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#878787] outline-none font-mono"
          />
        </div>
        <button
          onClick={verify}
          disabled={loading || !domain.trim()}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#05AD98] to-[#038a79] hover:from-[#038a79] hover:to-[#05AD98] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all flex items-center gap-2 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Checking…' : 'Verify Tag'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border overflow-hidden transition-all ${
          status === 'ok'      ? 'border-emerald-500/30 bg-emerald-500/5'  :
          status === 'warn'    ? 'border-amber-400/30  bg-amber-400/5'    :
          status === 'missing' ? 'border-red-500/30    bg-red-500/5'      :
                                 'border-[rgba(187,191,191,0.15)] bg-[#111514]'
        }`}>
          {/* Status header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(187,191,191,0.08)]">
            {status === 'ok'      && <CheckCircle2    className="w-5 h-5 text-emerald-400 shrink-0" />}
            {status === 'warn'    && <AlertTriangle   className="w-5 h-5 text-amber-400  shrink-0" />}
            {status === 'missing' && <XCircle         className="w-5 h-5 text-red-400    shrink-0" />}
            {status === 'error'   && <AlertTriangle   className="w-5 h-5 text-[#878787] shrink-0" />}

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${
                status === 'ok'      ? 'text-emerald-400' :
                status === 'warn'    ? 'text-amber-400'  :
                status === 'missing' ? 'text-red-400'    : 'text-[#878787]'
              }`}>
                {status === 'ok'      && 'Tag detected - all good ✓'}
                {status === 'warn'    && 'Tag found - check site= parameter'}
                {status === 'missing' && 'Tag not detected'}
                {status === 'error'   && 'Could not check this domain'}
              </p>
              <p className="text-[11px] text-[#878787] mt-0.5 truncate">Checked: {result.checkedUrl}</p>
            </div>
          </div>

          {/* Detail rows */}
          <div className="px-5 py-4 space-y-3">
            {status === 'error' && (
              <p className="text-xs text-[#878787]">{result.error}</p>
            )}

            {status === 'ok' && (
              <>
                {result.method === 'heartbeat'
                  ? (
                    <Detail label="Verified via" value="Live tag ping ✓" ok />
                  ) : (
                    <Detail label="Method" value={result.method === 'query-param' ? '?site= parameter (recommended)' : result.method === 'data-attribute' ? 'data-omniroute-endpoint attribute' : 'Bare tag (Host header fallback)'} ok />
                  )}
                {result.siteDomain && <Detail label="Site attributed to" value={result.siteDomain} ok />}
                {result.heartbeatAge && (
                  <Detail label="Last seen" value={`${Math.round((Date.now() - new Date(result.heartbeatAge).getTime()) / 60000)} min ago`} />
                )}
                {result.tagUrl && <Detail label="Script src" value={result.tagUrl} mono />}
              </>
            )}

            {status === 'warn' && (
              <>
                <Detail label="Tag found" value="Yes" ok />
                {result.tagUrl && <Detail label="Script src" value={result.tagUrl} mono />}
                <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 p-3 text-xs text-amber-200 leading-relaxed">
                  {result.method === 'query-param' && result.siteDomain
                    ? <>The <code className="font-mono">?site={result.siteDomain}</code> parameter doesn{"'"}t match <code className="font-mono">{result.checkedUrl.replace('https://','').replace(/\/$/, '')}</code>. Update it to match your actual domain so traffic is attributed correctly.</>
                    : <>The tag is present but uses the Host header for domain attribution. Consider switching to the <code className="font-mono">?site=yourdomain.com</code> format for reliable attribution.</>}
                </div>
              </>
            )}

            {status === 'missing' && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-200 leading-relaxed space-y-1.5">
                <p>OmniRoute didn{"'"}t find a tracking tag on <strong>{result.checkedUrl}</strong>.</p>
                <p>Things to check:</p>
                <ul className="list-disc list-inside space-y-1 text-[#878787]">
                  <li>Make sure the tag is in your HTML and the site has been redeployed</li>
                  <li>Check that the script src contains <code className="font-mono text-red-300">/api/v1/track.js</code></li>
                  <li>If your homepage requires auth, the checker can{"'"}t reach it - try a public page</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, ok, mono }: { label: string; value: string; ok?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[11px] text-[#878787] w-36 shrink-0 pt-0.5">{label}</span>
      <span className={`text-[11px] break-all ${ok ? 'text-emerald-400' : 'text-[#BBBFBF]'} ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
