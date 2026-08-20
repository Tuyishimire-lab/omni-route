'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgentManifest, AgentServiceEndpoint, AgentProductSchema } from '../lib/types';
import {
  defaultSampleManifest,
  INDUSTRY_TEMPLATES,
  generateCloudflareWorkerScript,
  generateNextJsRouteHandler,
  generateFastApiSnippet
} from '../lib/agentProtocol';
import {
  Cpu,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Code,
  Globe,
  Layers,
  Sparkles,
  Server,
  Zap
} from 'lucide-react';

export default function AgentJsonEditor() {
  const searchParams = useSearchParams();
  const [manifest, setManifest] = useState<AgentManifest>(defaultSampleManifest);
  const [activeTab, setActiveTab] = useState<'visual' | 'json' | 'deploy'>('visual');
  const [deployPlatform, setDeployPlatform] = useState<'nextjs' | 'cloudflare' | 'fastapi'>('nextjs');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Auto-populate if domain query param is passed from audit/leaderboard
  useEffect(() => {
    const domainParam = searchParams.get('domain') || searchParams.get('url');
    if (domainParam) {
      const clean = domainParam.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      const brand = clean.split('.')[0].charAt(0).toUpperCase() + clean.split('.')[0].slice(1);
      setManifest((prev) => ({
        ...prev,
        domain: clean,
        siteName: `${brand} Agent Gateway`,
        description: `Autonomous agent gateway, semantic vectors, and direct checkout endpoints for ${brand}.`,
        organization: {
          ...prev.organization,
          legalName: `${brand} Inc.`,
          contactEmail: `agents@${clean}`
        }
      }));
    }
  }, [searchParams]);

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

  const applyTemplate = (templateKey: string) => {
    if (templateKey === 'default') {
      setManifest(defaultSampleManifest);
    } else if (INDUSTRY_TEMPLATES[templateKey]) {
      setManifest(INDUSTRY_TEMPLATES[templateKey].manifest);
    }
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

  const getDeployCode = () => {
    switch (deployPlatform) {
      case 'nextjs':
        return generateNextJsRouteHandler(manifest);
      case 'cloudflare':
        return generateCloudflareWorkerScript(manifest);
      case 'fastapi':
        return generateFastApiSnippet(manifest);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Template Selector */}
      <div className="glass-panel rounded-2xl p-5 border border-[rgba(187,191,191,0.10)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[rgba(5,173,152,0.10)] text-[#05AD98] border border-[rgba(5,173,152,0.2)]">
                <Cpu className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">agent.json Protocol Studio</h2>
                <p className="text-xs text-[#878787]">
                  Publish standard machine-readable declarations for OpenAI, Claude, and Perplexity autonomous agents.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(5,173,152,0.15)] text-[#05AD98] border border-[rgba(5,173,152,0.3)] text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Valid Protocol v1.2
            </span>
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[rgba(5,173,152,0.10)] hover:bg-[rgba(5,173,152,0.20)] text-[#05AD98] border border-[rgba(5,173,152,0.25)] text-xs font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download .json
            </button>
          </div>
        </div>

        {/* 1-Click Industry Templates */}
        <div className="pt-2 border-t border-[rgba(187,191,191,0.08)] flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#878787] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Preset Templates:
          </span>
          <button
            onClick={() => applyTemplate('default')}
            className="px-2.5 py-1 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.12)] text-xs text-[#BBBFBF] hover:text-white hover:border-[#05AD98] transition-colors"
          >
            OmniRoute Standard
          </button>
          {Object.entries(INDUSTRY_TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              className="px-2.5 py-1 rounded-lg bg-[#111514] border border-[rgba(187,191,191,0.12)] text-xs text-[#BBBFBF] hover:text-white hover:border-[#05AD98] transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-[rgba(187,191,191,0.10)]">
        <button
          onClick={() => setActiveTab('visual')}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'visual'
              ? 'border-[#05AD98] text-[#05AD98] bg-[rgba(5,173,152,0.05)]'
              : 'border-transparent text-[#878787] hover:text-white'
          }`}
        >
          Visual Builder
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'json'
              ? 'border-[#05AD98] text-[#05AD98] bg-[rgba(5,173,152,0.05)]'
              : 'border-transparent text-[#878787] hover:text-white'
          }`}
        >
          Compiled agent.json
        </button>
        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-5 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'deploy'
              ? 'border-[#05AD98] text-[#05AD98] bg-[rgba(5,173,152,0.05)]'
              : 'border-transparent text-[#878787] hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Deploy Snippets (Next.js / Edge / Python)
        </button>
      </div>

      {/* Tab 1: Visual Builder */}
      {activeTab === 'visual' && (
        <div className="space-y-6">
          {/* Identity & Org */}
          <div className="glass-card rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#05AD98]" />
              Domain Identity & Publisher Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[#878787] block mb-1">Site / Platform Name</label>
                <input
                  type="text"
                  value={manifest.siteName}
                  onChange={(e) => setManifest({ ...manifest, siteName: e.target.value })}
                  className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#05AD98]"
                />
              </div>
              <div>
                <label className="text-[#878787] block mb-1">Domain Hostname</label>
                <input
                  type="text"
                  value={manifest.domain}
                  onChange={(e) => setManifest({ ...manifest, domain: e.target.value })}
                  className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#05AD98]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[#878787] block mb-1">Agent Discovery Description</label>
                <textarea
                  rows={2}
                  value={manifest.description}
                  onChange={(e) => setManifest({ ...manifest, description: e.target.value })}
                  className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#05AD98]"
                />
              </div>
              <div>
                <label className="text-[#878787] block mb-1">Legal Organization Name</label>
                <input
                  type="text"
                  value={manifest.organization.legalName}
                  onChange={(e) =>
                    setManifest({
                      ...manifest,
                      organization: { ...manifest.organization, legalName: e.target.value }
                    })
                  }
                  className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#05AD98]"
                />
              </div>
              <div>
                <label className="text-[#878787] block mb-1">Agent Contact Email</label>
                <input
                  type="email"
                  value={manifest.organization.contactEmail}
                  onChange={(e) =>
                    setManifest({
                      ...manifest,
                      organization: { ...manifest.organization, contactEmail: e.target.value }
                    })
                  }
                  className="w-full bg-[#0A0E0E] border border-[rgba(187,191,191,0.12)] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#05AD98]"
                />
              </div>
            </div>
          </div>

          {/* Endpoints */}
          <div className="glass-card rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#05AD98]" />
                Executable Agent Endpoints ({manifest.endpoints.length})
              </h3>
              <button
                onClick={addEndpoint}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1A2020] hover:bg-[#222a2a] text-[#05AD98] border border-[rgba(5,173,152,0.3)] text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Endpoint
              </button>
            </div>

            <div className="space-y-3">
              {manifest.endpoints.map((ep) => (
                <div key={ep.id} className="p-4 bg-[#0A0E0E] rounded-xl border border-[rgba(187,191,191,0.08)] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={ep.method}
                        onChange={(e) =>
                          setManifest({
                            ...manifest,
                            endpoints: manifest.endpoints.map((item) =>
                              item.id === ep.id ? { ...item, method: e.target.value as 'GET' | 'POST' } : item
                            )
                          })
                        }
                        className="bg-[#111514] text-[#05AD98] font-mono font-bold text-xs px-2 py-1 rounded-lg border border-[rgba(187,191,191,0.15)] focus:outline-none"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                      <input
                        type="text"
                        value={ep.path}
                        onChange={(e) =>
                          setManifest({
                            ...manifest,
                            endpoints: manifest.endpoints.map((item) =>
                              item.id === ep.id ? { ...item, path: e.target.value } : item
                            )
                          })
                        }
                        className="flex-1 bg-[#111514] text-white font-mono text-xs px-3 py-1 rounded-lg border border-[rgba(187,191,191,0.12)] focus:outline-none focus:border-[#05AD98]"
                      />
                    </div>
                    <button
                      onClick={() => removeEndpoint(ep.id)}
                      className="text-[#878787] hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={ep.description}
                    placeholder="Action description for agent reasoning models"
                    onChange={(e) =>
                      setManifest({
                        ...manifest,
                        endpoints: manifest.endpoints.map((item) =>
                          item.id === ep.id ? { ...item, description: e.target.value } : item
                        )
                      })
                    }
                    className="w-full bg-[#111514] text-[#BBBFBF] text-xs px-3 py-1 rounded-lg border border-[rgba(187,191,191,0.10)] focus:outline-none focus:border-[#05AD98]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Product Catalog */}
          <div className="glass-card rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#05AD98]" />
                Direct Agentic Products & SKUs ({manifest.products?.length || 0})
              </h3>
              <button
                onClick={addProduct}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1A2020] hover:bg-[#222a2a] text-[#05AD98] border border-[rgba(5,173,152,0.3)] text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(manifest.products || []).map((prod) => (
                <div key={prod.id} className="p-4 bg-[#0A0E0E] rounded-xl border border-[rgba(187,191,191,0.08)] space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={prod.name}
                      onChange={(e) =>
                        setManifest({
                          ...manifest,
                          products: (manifest.products || []).map((p) =>
                            p.id === prod.id ? { ...p, name: e.target.value } : p
                          )
                        })
                      }
                      className="bg-transparent font-bold text-white text-xs focus:outline-none focus:border-b border-[#05AD98]"
                    />
                    <button
                      onClick={() => removeProduct(prod.id)}
                      className="text-[#878787] hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#878787] font-mono">Price:</span>
                    <input
                      type="number"
                      value={prod.price}
                      onChange={(e) =>
                        setManifest({
                          ...manifest,
                          products: (manifest.products || []).map((p) =>
                            p.id === prod.id ? { ...p, price: parseFloat(e.target.value) || 0 } : p
                          )
                        })
                      }
                      className="w-20 bg-[#111514] text-[#05AD98] font-mono font-bold text-xs px-2 py-0.5 rounded border border-[rgba(187,191,191,0.12)] focus:outline-none"
                    />
                    <span className="text-[#878787] font-mono">{prod.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Compiled agent.json */}
      {activeTab === 'json' && (
        <div className="glass-card rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-mono">/.well-known/agent.json</span>
            <button
              onClick={() => handleCopy(JSON.stringify(manifest, null, 2), 'json')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2020] hover:bg-[#222a2a] text-[#05AD98] border border-[rgba(5,173,152,0.3)] text-xs font-semibold transition-all"
            >
              {copiedText === 'json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedText === 'json' ? 'Copied JSON!' : 'Copy agent.json'}
            </button>
          </div>
          <pre className="p-4 bg-[#0A0E0E] rounded-xl border border-[rgba(187,191,191,0.10)] text-xs text-[#05AD98] font-mono overflow-x-auto max-h-[500px]">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </div>
      )}

      {/* Tab 3: Multi-Platform Deploy Snippets */}
      {activeTab === 'deploy' && (
        <div className="glass-card rounded-2xl p-6 border border-[rgba(187,191,191,0.10)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgba(187,191,191,0.08)]">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#05AD98]" />
              <span className="text-xs font-bold text-white">Target Deployment Platform:</span>
            </div>
            <div className="flex gap-2">
              {[
                { id: 'nextjs', label: 'Next.js (Vercel)' },
                { id: 'cloudflare', label: 'Cloudflare Worker' },
                { id: 'fastapi', label: 'FastAPI (Python)' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDeployPlatform(p.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    deployPlatform === p.id
                      ? 'bg-[rgba(5,173,152,0.20)] text-[#05AD98] border-[rgba(5,173,152,0.4)]'
                      : 'bg-[#111514] text-[#878787] border-[rgba(187,191,191,0.10)] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#878787]">
              {deployPlatform === 'nextjs' && 'Create file at app/.well-known/agent.json/route.ts in your Next.js project:'}
              {deployPlatform === 'cloudflare' && 'Paste into Cloudflare Workers / Edge Gateway:'}
              {deployPlatform === 'fastapi' && 'Add route to your FastAPI / Python backend:'}
            </span>
            <button
              onClick={() => handleCopy(getDeployCode(), 'deploy')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2020] hover:bg-[#222a2a] text-[#05AD98] border border-[rgba(5,173,152,0.3)] text-xs font-semibold transition-all"
            >
              {copiedText === 'deploy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedText === 'deploy' ? 'Copied Code!' : 'Copy Deployment Code'}
            </button>
          </div>

          <pre className="p-4 bg-[#0A0E0E] rounded-xl border border-[rgba(187,191,191,0.10)] text-xs text-[#BBBFBF] font-mono overflow-x-auto max-h-[500px]">
            {getDeployCode()}
          </pre>
        </div>
      )}
    </div>
  );
}
