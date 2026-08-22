import { describe, it, expect } from 'vitest';
import { generateKeyString, hashApiKey, keyDisplayPrefix } from '../apiAuth';

describe('API key generation & hashing', () => {
  it('generates keys with the correct prefix format', () => {
    const live = generateKeyString('live');
    const test = generateKeyString('test');
    expect(live).toMatch(/^or-live_[a-f0-9]{48}$/);
    expect(test).toMatch(/^or-test_[a-f0-9]{48}$/);
  });

  it('generates unique keys', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateKeyString()));
    expect(keys.size).toBe(100);
  });

  it('hashes deterministically', () => {
    const key = generateKeyString();
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it('produces different hashes for different keys', () => {
    const a = hashApiKey(generateKeyString());
    const b = hashApiKey(generateKeyString());
    expect(a).not.toBe(b);
  });

  it('produces a sha256 hex digest (64 chars)', () => {
    const hash = hashApiKey(generateKeyString());
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('display prefix never contains the full secret', () => {
    const key = generateKeyString();
    const prefix = keyDisplayPrefix(key);
    expect(prefix.length).toBeLessThan(key.length);
    expect(key.startsWith(prefix)).toBe(true);
    // Prefix alone must not be usable as a key
    expect(hashApiKey(prefix)).not.toBe(hashApiKey(key));
  });
});
