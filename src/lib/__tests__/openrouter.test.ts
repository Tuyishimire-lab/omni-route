import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isModelCoolingDown,
  markModelCooldown,
  resetModelCooldowns,
  clearModelCache,
  completeWithCascade,
  completeWithOpenRouterCascade,
  generateJson,
  generateOpenRouterJson,
  discoverFreeModels,
  isAiEngineConfigured,
  isOpenRouterConfigured,
} from '../openrouter';

describe('CiteRoute Engine — Model Orchestration', () => {
  beforeEach(() => {
    resetModelCooldowns();
    clearModelCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetModelCooldowns();
    clearModelCache();
    vi.restoreAllMocks();
  });

  it('exposes legacy aliases for backward compatibility', () => {
    expect(completeWithOpenRouterCascade).toBe(completeWithCascade);
    expect(generateOpenRouterJson).toBe(generateJson);
    expect(isOpenRouterConfigured).toBe(isAiEngineConfigured);
  });

  it('handles circuit breaker cooldowns properly', () => {
    const testModel = 'test/some-model:free';
    expect(isModelCoolingDown(testModel)).toBe(false);

    markModelCooldown(testModel, 5000);
    expect(isModelCoolingDown(testModel)).toBe(true);

    resetModelCooldowns();
    expect(isModelCoolingDown(testModel)).toBe(false);
  });

  it('dynamically discovers free models from API and caches them', async () => {
    const mockModels = {
      data: [
        {
          id: 'provider-a/model-one:free',
          name: 'Model One (free)',
          context_length: 131072,
          pricing: { prompt: '0', completion: '0' },
          architecture: { modality: 'text->text' },
          supported_parameters: ['response_format', 'max_tokens'],
        },
        {
          id: 'provider-b/model-two:free',
          name: 'Model Two (free)',
          context_length: 262144,
          pricing: { prompt: '0', completion: '0' },
          architecture: { modality: 'text+image->text' },
          supported_parameters: ['max_tokens'], // no JSON mode
        },
        {
          id: 'provider-c/paid-model',
          name: 'Paid Model',
          context_length: 32768,
          pricing: { prompt: '0.00001', completion: '0.00005' },
          architecture: { modality: 'text->text' },
          supported_parameters: ['response_format'],
        },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockModels,
    }));

    const models = await discoverFreeModels();

    // Should include the two free models but NOT the paid one
    expect(models).toContain('provider-a/model-one:free');
    expect(models).toContain('provider-b/model-two:free');
    expect(models).not.toContain('provider-c/paid-model');

    // JSON-capable model should come first (prioritized)
    expect(models[0]).toBe('provider-a/model-one:free');
  });

  it('fails over to secondary model when primary returns HTTP 429', async () => {
    const modelA = 'test/model-a:free';
    const modelB = 'test/model-b:free';

    // Pre-populate cache with known test models
    const discoveryFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: modelA, context_length: 128000, pricing: { prompt: '0', completion: '0' }, architecture: { modality: 'text->text' }, supported_parameters: ['response_format'] },
            { id: modelB, context_length: 128000, pricing: { prompt: '0', completion: '0' }, architecture: { modality: 'text->text' }, supported_parameters: ['response_format'] },
          ],
        }),
      })
      .mockImplementation(async (_url, init) => {
        const body = JSON.parse(init?.body as string);
        if (body.model === modelA) {
          return {
            ok: false,
            status: 429,
            text: async () => 'Rate limit reached',
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: modelB,
            choices: [{ message: { content: 'Success from model B' } }],
          }),
        };
      });

    vi.stubGlobal('fetch', discoveryFetch);

    const result = await completeWithCascade({
      overrideApiKey: 'test-key',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(result.modelUsed).toBe(modelB);
    expect(result.text).toBe('Success from model B');
    expect(isModelCoolingDown(modelA)).toBe(true);
  });

  it('strips markdown fences when parsing structured JSON', async () => {
    // First call = discovery, second call = chat completion
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { id: 'test/json-model:free', context_length: 128000, pricing: { prompt: '0', completion: '0' }, architecture: { modality: 'text->text' }, supported_parameters: ['response_format'] },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'test/json-model:free',
          choices: [
            {
              message: {
                content: '```json\n{\n  "status": "ok",\n  "score": 95\n}\n```',
              },
            },
          ],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const { data, modelUsed } = await generateJson<{ status: string; score: number }>({
      overrideApiKey: 'test-key',
      messages: [{ role: 'user', content: 'generate json' }],
    });

    expect(modelUsed).toBe('test/json-model:free');
    expect(data.status).toBe('ok');
    expect(data.score).toBe(95);
  });
});
