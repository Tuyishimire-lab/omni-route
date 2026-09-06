import { describe, it, expect } from 'vitest';
import { formatTelemetryTimestamp, formatFullDateTime } from '../timestamp';

describe('formatTelemetryTimestamp', () => {
  it('formats an ISO date from today with time, date and relative indicator', () => {
    const now = new Date();
    const iso = now.toISOString();
    const result = formatTelemetryTimestamp(iso);

    expect(result.time).toMatch(/\d{1,2}:\d{2}:\d{2}\s*(AM|PM)/i);
    expect(result.date).toContain('Today');
    expect(result.relative).toBe('just now');
    expect(result.full).toContain(String(now.getFullYear()));
  });

  it('formats a date from yesterday correctly', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(14, 30, 0, 0);

    const result = formatTelemetryTimestamp(yesterday.toISOString());
    expect(result.date).toContain('Yesterday');
    expect(result.time).toMatch(/\d{1,2}:\d{2}:\d{2}\s*(AM|PM)/i);
  });

  it('formats an older date with month, day and year if different year', () => {
    const pastDate = new Date('2024-05-12T10:15:30Z');
    const result = formatTelemetryTimestamp(pastDate.toISOString());

    expect(result.date).toContain('2024');
    expect(result.date).toContain('May');
    expect(result.full).toContain('2024');
  });

  it('handles legacy time-only strings gracefully without throwing', () => {
    const legacy = '9:28:34 PM';
    const result = formatTelemetryTimestamp(legacy);

    expect(result.time).toBe('9:28:34 PM');
    expect(result.date).toBe('Today');
    expect(result.relative).toBe('Recent');
  });

  it('handles null, undefined and empty values safely', () => {
    const nullResult = formatTelemetryTimestamp(null);
    expect(nullResult.time).toBe('--:--');
    expect(nullResult.date).toBe('Unknown');

    const undefResult = formatTelemetryTimestamp(undefined);
    expect(undefResult.time).toBe('--:--');
  });

  it('formatFullDateTime produces a comprehensive label', () => {
    const now = new Date();
    const formattedNow = formatFullDateTime(now);
    expect(formattedNow).toContain('Today');
    expect(formattedNow).toContain('just now');

    const pastDate = new Date(Date.now() - 5 * 60_000);
    const formattedPast = formatFullDateTime(pastDate);
    expect(formattedPast).toContain('5m ago');
  });
});
