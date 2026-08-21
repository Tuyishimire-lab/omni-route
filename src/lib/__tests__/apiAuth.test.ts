import { describe, it, expect } from 'vitest';
import { generateKeyString } from '../apiAuth';

describe('API Key Generation', () => {
  it('generates keys with correct prefix for live mode', () => {
    const key = generateKeyString('live');
    expect(key.startsWith('or-live_')).toBe(true);
  });

  it('generates keys with correct prefix for test mode', () => {
    const key = generateKeyString('test');
    expect(key.startsWith('or-test_')).toBe(true);
  });

  it('generates unique keys on each call', () => {
    const key1 = generateKeyString('live');
    const key2 = generateKeyString('live');
    expect(key1).not.toBe(key2);
  });

  it('generates keys with sufficient length for security', () => {
    const key = generateKeyString('live');
    // or-live_ = 8 chars + 48 hex chars = 56 total minimum
    expect(key.length).toBeGreaterThanOrEqual(50);
  });

  it('key contains only valid characters', () => {
    const key = generateKeyString('live');
    // Should be or-live_ followed by hex chars
    expect(key).toMatch(/^or-(live|test)_[a-f0-9]+$/);
  });
});
