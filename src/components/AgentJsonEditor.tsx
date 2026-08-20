'use client';

import React, { useState } from 'react';
import { AgentManifest, AgentServiceEndpoint, AgentProductSchema } from '../lib/types';
import { defaultSampleManifest, generateCloudflareWorkerScript } from '../lib/agentProtocol';
import {
  Cpu,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Code,
  Activity,
  Globe,
  FileJson,
  Layers
} from 'lucide-react';

export default function AgentJsonEditor() {
  const [manifest, setManifest] = useState<AgentManifest>(defaultSampleManifest);
  const [activeTab, setActiveTab] = useState<'visual' | 'json' | 'worker'>('visual');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (content: string, key: string) => {
    navigator.clipboard.writeText(content);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'agent.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const addEndpoint = () => {
    const newEp: AgentServiceEndpoint = {
      id: 'ep-' + Date.now(),
      name: 'Custom Agent Action',
      path: '/api/agent/v1/action',
      method: 'POST',
      description: 'Custom endpoint for autonomous AI agents to query or execute tasks.',
      authRequired: false,
      pricingType: 'free'
    };
    setManifest({
      ...manifest,
      endpoints: [...manifest.endpoints, newEp]
    });
  };

  const removeEndpoint = (id: string) => {
    setManifest({
      ...manifest,
      endpoints: manifest.endpoints.filter((ep) => ep.id !== id)
    });
  };

  const addProduct = () => {
    const newProd: AgentProductSchema = {
      id: 'prod-' + Date.now(),
      name: 'Autonomous Agent SKU',
      sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
      price: 99.00,
      currency: 'USD',
      category: 'Digital Services',
      inStock: true,
      directAgentCheckoutUrl: `https://${manifest.domain}/checkout?direct=true`
    };
    setManifest({
      ...manifest,
      products: [...(manifest.products || []), newProd]
    });
  };

  const removeProduct = (id: string) => {
    setManifest({
      ...manifest,
      products: (manifest.products || []).filter((p) => p.id !== id)
    });
  };

  const workerScript = generateCloudflareWorkerScript(manifest);

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.2)]">
              <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Universal agent.json Protocol Studio</h2>
              <p className="text-[11px] sm:text-xs text-[#878787]">
                Machine-readable gateway manifest for AI agents (OpenAI GPTs, Claude Agents, Perplexity).
              </p>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <div className="flex bg-[#111514] p-1 rounded-xl border border-[rgba(187,191,191,0.10)] shrink-0">
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'visual' ? 'bg-sky-500 text-white shadow-sm' : 'text-[#878787] hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Visual
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'json' ? 'bg-sky-500 text-white shadow-sm' : 'text-[#878787] hover:text-white'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" /> JSON Spec
            </button>
            <button
              onClick={() => setActiveTab('worker')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'worker' ? 'bg-sky-500 text-white shadow-sm' : 'text-[#878787] hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Edge Worker
            </button>
          </div>

          <button
            onClick={handleDownloadJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A2020] hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-[rgba(187,191,191,0.12)] transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Visual Editor Mode */}
      {activeTab === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* General Metadata */}
          <div className="lg:col-span-6 space-y-6">
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#05AD98]" /> General Domain Identity
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#878787] mb-1">Site / Protocol Name</label>
                  <input
                    type="text"
                    value={manifest.siteName}
                    onChange={(e) => setManifest({ ...manifest, siteName: e.target.value })}
                    className="w-full bg-[#111514] border border-slate-750 rounded-xl px-3 py-2 text-white font-medium focus:border-[#05AD98] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#878787] mb-1">Target Domain</label>
                    <input
                      type="text"
                      value={manifest.domain}
                      onChange={(e) => setManifest({ ...manifest, domain: e.target.value })}
                      className="w-full bg-[#111514] border border-slate-750 rounded-xl px-3 py-2 text-white font-mono focus:border-[#05AD98] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#878787] mb-1">Protocol Version</label>
                    <input
                      type="text"
                      value={manifest.version}
                      onChange={(e) => setManifest({ ...manifest, version: e.target.value })}
                      className="w-full bg-[#111514] border border-slate-750 rounded-xl px-3 py-2 text-white font-mono focus:border-[#05AD98] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#878787] mb-1">Agent Discovery Description</label>
                  <textarea
                    rows={2}
                    value={manifest.description}
                    onChange={(e) => setManifest({ ...manifest, description: e.target.value })}
                    className="w-full bg-[#111514] border border-slate-750 rounded-xl px-3 py-2 text-white font-normal focus:border-[#05AD98] focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Agent Access Policy */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#05AD98]" /> Machine Access & Transaction Policy
              </h3>

              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#111514]/60 border border-[rgba(187,191,191,0.10)] cursor-pointer">
                  <span className="text-[#BBBFBF]">Allow Autonomous AI Crawlers (Perplexity/OAI)</span>
                  <input
                    type="checkbox"
                    checked={manifest.accessPolicy.allowAgentCrawlers}
                    onChange={(e) =>
                      setManifest({
                        ...manifest,
                        accessPolicy: { ...manifest.accessPolicy, allowAgentCrawlers: e.target.checked }
                      })
                    }
                    className="w-4 h-4 accent-[#05AD98] rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#111514]/60 border border-[rgba(187,191,191,0.10)] cursor-pointer">
                  <span className="text-[#BBBFBF]">Allow Direct Agent Purchases & Checkout</span>
                  <input
                    type="checkbox"
                    checked={manifest.accessPolicy.allowDirectTransactions}
                    onChange={(e) =>
                      setManifest({
                        ...manifest,
                        accessPolicy: { ...manifest.accessPolicy, allowDirectTransactions: e.target.checked }
                      })
                    }
                    className="w-4 h-4 accent-[#05AD98] rounded"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Endpoints & Products */}
          <div className="lg:col-span-6 space-y-6">
            {/* Endpoints */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#B8A04A]" /> Machine Endpoints ({manifest.endpoints.length})
                </h3>
                <button
                  onClick={addEndpoint}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(5,173,152,0.15)] hover:bg-[rgba(5,173,152,0.25)] text-[#05AD98] text-xs font-semibold border border-[rgba(5,173,152,0.3)] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Action
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {manifest.endpoints.map((ep) => (
                  <div key={ep.id} className="p-3 bg-[#111514]/80 rounded-xl border border-[rgba(187,191,191,0.10)] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[rgba(5,173,152,0.20)] text-[#05AD98] border border-[rgba(5,173,152,0.3)]">
                        {ep.method}
                      </span>
                      <input
                        type="text"
                        value={ep.path}
                        onChange={(e) => {
                          const updated = manifest.endpoints.map((item) =>
                            item.id === ep.id ? { ...item, path: e.target.value } : item
                          );
                          setManifest({ ...manifest, endpoints: updated });
                        }}
                        className="flex-1 bg-[#0A0E0E] px-2 py-1 rounded text-xs font-mono text-white border border-[rgba(187,191,191,0.10)]"
                      />
                      <button
                        onClick={() => removeEndpoint(ep.id)}
                        className="text-[#878787] hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Description of action for AI reasoning"
                      value={ep.description}
                      onChange={(e) => {
                        const updated = manifest.endpoints.map((item) =>
                          item.id === ep.id ? { ...item, description: e.target.value } : item
                        );
                        setManifest({ ...manifest, endpoints: updated });
                      }}
                      className="w-full bg-[#0A0E0E] px-2 py-1 rounded text-xs text-[#BBBFBF] border border-[rgba(187,191,191,0.10)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Agent Product Catalog */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#05AD98]" /> Direct Agentic SKUs ({(manifest.products || []).length})
                </h3>
                <button
                  onClick={addProduct}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(5,173,152,0.15)] hover:bg-emerald-500/25 text-[#05AD98] text-xs font-semibold border border-[rgba(5,173,152,0.25)] transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add SKU
                </button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {(manifest.products || []).map((prod) => (
                  <div key={prod.id} className="p-3 bg-[#111514]/80 rounded-xl border border-[rgba(187,191,191,0.10)] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={prod.name}
                        onChange={(e) => {
                          const updated = (manifest.products || []).map((p) =>
                            p.id === prod.id ? { ...p, name: e.target.value } : p
                          );
                          setManifest({ ...manifest, products: updated });
                        }}
                        className="flex-1 bg-[#0A0E0E] px-2 py-1 rounded text-xs font-semibold text-white border border-[rgba(187,191,191,0.10)]"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#05AD98] font-mono font-bold">$</span>
                        <input
                          type="number"
                          value={prod.price}
                          onChange={(e) => {
                            const updated = (manifest.products || []).map((p) =>
                              p.id === prod.id ? { ...p, price: parseFloat(e.target.value) || 0 } : p
                            );
                            setManifest({ ...manifest, products: updated });
                          }}
                          className="w-16 sm:w-20 bg-[#0A0E0E] px-2 py-1 rounded text-xs font-mono text-[#05AD98] border border-[rgba(187,191,191,0.10)]"
                        />
                      </div>
                      <button
                        onClick={() => removeProduct(prod.id)}
                        className="text-[#878787] hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Raw JSON View */}
      {activeTab === 'json' && (
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] relative">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(187,191,191,0.10)] mb-3">
            <span className="text-[11px] sm:text-xs font-mono text-[#878787] truncate">/.well-known/agent.json</span>
            <button
              onClick={() => handleCopy(JSON.stringify(manifest, null, 2), 'raw-json')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2020] hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors shrink-0"
            >
              {copiedText === 'raw-json' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#05AD98]" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy JSON
                </>
              )}
            </button>
          </div>
          <pre className="p-3 sm:p-4 bg-[#0A0E0E] rounded-xl font-mono text-xs text-[#05AD98] overflow-x-auto max-h-[500px]">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </div>
      )}

      {/* Cloudflare Edge Worker View */}
      {activeTab === 'worker' && (
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-[rgba(187,191,191,0.10)] relative">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(187,191,191,0.10)] mb-3">
            <span className="text-[11px] sm:text-xs font-mono text-[#878787] truncate">Cloudflare Worker (worker.js)</span>
            <button
              onClick={() => handleCopy(workerScript, 'worker-code')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2020] hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors shrink-0"
            >
              {copiedText === 'worker-code' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#05AD98]" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-[#878787] mb-3">
            Deploy this worker on Cloudflare to serve your machine manifest at{' '}
            <code className="text-[#05AD98] font-mono">https://{manifest.domain}/.well-known/agent.json</code>.
          </p>
          <pre className="p-3 sm:p-4 bg-[#0A0E0E] rounded-xl font-mono text-xs text-[#BBBFBF] overflow-x-auto max-h-[500px]">
            {workerScript}
          </pre>
        </div>
      )}
    </div>
  );
}
