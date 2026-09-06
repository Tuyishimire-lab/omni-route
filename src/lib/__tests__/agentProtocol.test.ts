import { describe, it, expect } from 'vitest';
import {
  defaultSampleManifest,
  INDUSTRY_TEMPLATES,
  generateCloudflareWorkerScript,
  generateEdgeWorkerWithBotDetection
} from '../agentProtocol';

describe('agentProtocol - Specifications & Schema', () => {
  it('validates defaultSampleManifest conformity with agent.json standard', () => {
    expect(defaultSampleManifest.version).toBe('1.2.0');
    expect(defaultSampleManifest.siteName).toBeTruthy();
    expect(defaultSampleManifest.domain).toBeTruthy();
    expect(defaultSampleManifest.description).toBeTruthy();
    expect(Array.isArray(defaultSampleManifest.capabilities)).toBe(true);
    expect(defaultSampleManifest.capabilities.length).toBeGreaterThan(0);
    expect(Array.isArray(defaultSampleManifest.endpoints)).toBe(true);
    expect(defaultSampleManifest.endpoints.length).toBeGreaterThan(0);
    expect(defaultSampleManifest.accessPolicy).toBeDefined();
    expect(typeof defaultSampleManifest.accessPolicy.allowAgentCrawlers).toBe('boolean');
  });

  it('validates all industry templates have valid structure', () => {
    const templates = Object.entries(INDUSTRY_TEMPLATES);
    expect(templates.length).toBeGreaterThanOrEqual(3);

    for (const [key, tpl] of templates) {
      expect(tpl.label).toBeTruthy();
      expect(tpl.description).toBeTruthy();
      expect(tpl.manifest).toBeDefined();

      const m = tpl.manifest;
      expect(m.version, `${key} missing version`).toBeTruthy();
      expect(m.domain, `${key} missing domain`).toBeTruthy();
      expect(m.capabilities.length, `${key} missing capabilities`).toBeGreaterThan(0);
      expect(m.endpoints.length, `${key} missing endpoints`).toBeGreaterThan(0);
      expect(m.accessPolicy, `${key} missing accessPolicy`).toBeDefined();
    }
  });

  it('generates valid Cloudflare Worker script for manifest serving', () => {
    const script = generateCloudflareWorkerScript(defaultSampleManifest);

    expect(script).toContain('export default {');
    expect(script).toContain('/.well-known/agent.json');
    expect(script).toContain('X-OmniRoute-Protocol');
  });

  it('generates valid edge worker with AI bot detection and telemetry', () => {
    const worker = generateEdgeWorkerWithBotDetection(defaultSampleManifest, 'or-live_12345678');

    expect(worker).toContain('export default {');
    expect(worker).toContain('/.well-known/agent.json');
    expect(worker).toContain('PerplexityBot');
    expect(worker).toContain('GPTBot');
    expect(worker).toContain('ClaudeBot');
    expect(worker).toContain('or-live_12345678');
  });
});
