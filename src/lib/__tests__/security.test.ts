import { describe, it, expect } from 'vitest';
import { validateAndSanitizeUrl } from '../security';

describe('validateAndSanitizeUrl', () => {
  // ── Valid URLs ──
  it('accepts a plain domain and prepends https', () => {
    const result = validateAndSanitizeUrl('stripe.com');
    expect(result.isValid).toBe(true);
    expect(result.domain).toBe('stripe.com');
    expect(result.normalizedUrl).toContain('https://stripe.com');
  });

  it('accepts https URL', () => {
    const result = validateAndSanitizeUrl('https://vercel.com/docs');
    expect(result.isValid).toBe(true);
    expect(result.domain).toBe('vercel.com');
  });

  it('strips www from domain', () => {
    const result = validateAndSanitizeUrl('https://www.github.com');
    expect(result.isValid).toBe(true);
    expect(result.domain).toBe('github.com');
  });

  it('accepts http URL', () => {
    const result = validateAndSanitizeUrl('http://example.com');
    expect(result.isValid).toBe(true);
    expect(result.domain).toBe('example.com');
  });

  // ── SSRF Protection ──
  it('blocks localhost', () => {
    const result = validateAndSanitizeUrl('localhost');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('internal');
  });

  it('blocks 127.0.0.1', () => {
    const result = validateAndSanitizeUrl('http://127.0.0.1');
    expect(result.isValid).toBe(false);
  });

  it('blocks 10.x private range', () => {
    const result = validateAndSanitizeUrl('http://10.0.0.1');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('private');
  });

  it('blocks 192.168.x private range', () => {
    const result = validateAndSanitizeUrl('http://192.168.1.1');
    expect(result.isValid).toBe(false);
  });

  it('blocks 172.16.x private range', () => {
    const result = validateAndSanitizeUrl('http://172.16.0.1');
    expect(result.isValid).toBe(false);
  });

  it('blocks cloud metadata endpoint', () => {
    const result = validateAndSanitizeUrl('http://169.254.169.254');
    expect(result.isValid).toBe(false);
  });

  it('blocks metadata.google.internal', () => {
    const result = validateAndSanitizeUrl('http://metadata.google.internal');
    expect(result.isValid).toBe(false);
  });

  it('blocks .internal TLD', () => {
    const result = validateAndSanitizeUrl('http://service.internal');
    expect(result.isValid).toBe(false);
  });

  it('blocks .local TLD', () => {
    const result = validateAndSanitizeUrl('http://myserver.local');
    expect(result.isValid).toBe(false);
  });

  it('blocks .onion TLD', () => {
    const result = validateAndSanitizeUrl('http://hidden.onion');
    expect(result.isValid).toBe(false);
  });

  // ── Edge Cases ──
  it('rejects empty input', () => {
    const result = validateAndSanitizeUrl('');
    expect(result.isValid).toBe(false);
  });

  it('rejects overly long URLs', () => {
    const result = validateAndSanitizeUrl('a'.repeat(501));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('maximum length');
  });

  it('rejects invalid URL format', () => {
    const result = validateAndSanitizeUrl('not a url at all!!!');
    expect(result.isValid).toBe(false);
  });

  it('rejects domain without TLD', () => {
    const result = validateAndSanitizeUrl('justahostname');
    expect(result.isValid).toBe(false);
  });
});
