import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendWelcomeEmail } from '../email';

describe('Transactional Welcome Email via Resend', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates and triggers welcome email with fallback in test environment', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await sendWelcomeEmail({
      to: 'founder@example.com',
      userName: 'Alex Founder',
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe('dev-welcome-id');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[CiteRoute Onboarding] Welcome Email Triggered'));

    if (originalKey) {
      process.env.RESEND_API_KEY = originalKey;
    }
  });

  it('handles invocation without userName gracefully', async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const result = await sendWelcomeEmail({
      to: 'user@example.com',
    });

    expect(result.success).toBe(true);

    if (originalKey) {
      process.env.RESEND_API_KEY = originalKey;
    }
  });
});
