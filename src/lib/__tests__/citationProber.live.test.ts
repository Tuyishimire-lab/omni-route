import { describe, it, expect } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { probeAllEngines, TARGET_ENGINES } from '../citationProber';

describe('Live citation probe verification', () => {
  it('correctly models all 4 engines with updated model slugs', () => {
    const claudeEngine = TARGET_ENGINES.find((e) => e.id === 'claude');
    const geminiEngine = TARGET_ENGINES.find((e) => e.id === 'gemini');

    expect(claudeEngine?.preferredModel).toBe('anthropic/claude-3-haiku');
    expect(geminiEngine?.preferredModel).toBe('google/gemini-2.5-flash');
  });

  it('runs live citation probe for inyarwanda.com across all engines with zero error leakage', async () => {
    const results = await probeAllEngines('inyarwanda.com', 'Best news outlet in Rwanda');
    expect(results).toHaveLength(4);

    for (const r of results) {
      console.log(`[Engine: ${r.name}] Snippet: "${r.citationSnippet}" (isLive: ${r.isLiveQuery}, status: ${r.citationStatus})`);
      // Must never leak internal engine details, free models, or retry cascade strings
      expect(r.citationSnippet).not.toContain('CiteRoute Engine exhausted');
      expect(r.citationSnippet).not.toContain('nex-agi');
      expect(r.citationSnippet).not.toContain('Probe timed out or model was unreachable');
      expect(r.citationSnippet).not.toContain('rate-limited');
      expect(r.citationSnippet.length).toBeGreaterThan(10);
    }
  }, 45000);
});
