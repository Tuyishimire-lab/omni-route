import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluatePasswordCriteria,
  calculatePasswordStrength,
  isBlacklistedPassword,
  validatePasswordPolicy,
} from '../passwordPolicy';
import { registerUser } from '../auth';
import { prisma } from '../prisma';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}));

describe('passwordPolicy - Criteria Evaluation', () => {
  it('identifies missing minimum length', () => {
    const result = evaluatePasswordCriteria('Aa1!');
    expect(result.minLength).toBe(false);
    expect(result.hasUppercase).toBe(true);
    expect(result.hasLowercase).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSymbol).toBe(true);
  });

  it('identifies missing uppercase letter', () => {
    const result = evaluatePasswordCriteria('lowercase123!@#');
    expect(result.minLength).toBe(true);
    expect(result.hasUppercase).toBe(false);
    expect(result.hasLowercase).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSymbol).toBe(true);
  });

  it('identifies missing lowercase letter', () => {
    const result = evaluatePasswordCriteria('UPPERCASE123!@#');
    expect(result.minLength).toBe(true);
    expect(result.hasUppercase).toBe(true);
    expect(result.hasLowercase).toBe(false);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSymbol).toBe(true);
  });

  it('identifies missing numerical digit', () => {
    const result = evaluatePasswordCriteria('Alphabetical!@#');
    expect(result.minLength).toBe(true);
    expect(result.hasUppercase).toBe(true);
    expect(result.hasLowercase).toBe(true);
    expect(result.hasNumber).toBe(false);
    expect(result.hasSymbol).toBe(true);
  });

  it('identifies missing special symbol', () => {
    const result = evaluatePasswordCriteria('SecurePassword2026');
    expect(result.minLength).toBe(true);
    expect(result.hasUppercase).toBe(true);
    expect(result.hasLowercase).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSymbol).toBe(false);
  });

  it('validates a compliant strong password', () => {
    const result = evaluatePasswordCriteria('CiteRoute#Opt2026!');
    expect(result.minLength).toBe(true);
    expect(result.hasUppercase).toBe(true);
    expect(result.hasLowercase).toBe(true);
    expect(result.hasNumber).toBe(true);
    expect(result.hasSymbol).toBe(true);
    expect(result.isNotBlacklisted).toBe(true);
  });
});

describe('passwordPolicy - Blacklist & Common Password Rejection', () => {
  it('detects standard common dictionary entries', () => {
    expect(isBlacklistedPassword('password')).toBe(true);
    expect(isBlacklistedPassword('12345678')).toBe(true);
    expect(isBlacklistedPassword('1234567890')).toBe(true);
    expect(isBlacklistedPassword('admin123')).toBe(true);
    expect(isBlacklistedPassword('welcome123')).toBe(true);
    expect(isBlacklistedPassword('citeroute123')).toBe(true);
  });

  it('detects common passwords with trivial trailing symbols', () => {
    expect(isBlacklistedPassword('Password123!')).toBe(true);
    expect(isBlacklistedPassword('Welcome123#')).toBe(true);
  });

  it('detects trivial repeating sequences', () => {
    expect(isBlacklistedPassword('aaaaaaaa')).toBe(true);
    expect(isBlacklistedPassword('11111111')).toBe(true);
  });

  it('detects sequential number runs', () => {
    expect(isBlacklistedPassword('12345678')).toBe(true);
    expect(isBlacklistedPassword('87654321')).toBe(true);
  });

  it('allows sufficiently complex non-blacklisted passwords', () => {
    expect(isBlacklistedPassword('K9#mX9$vL2!qR')).toBe(false);
    expect(isBlacklistedPassword('Apex#GeoEngine2026')).toBe(false);
  });
});

describe('passwordPolicy - Strength Scoring & Color Tokens', () => {
  it('returns Too Weak for empty or blacklisted strings', () => {
    const emptyStrength = calculatePasswordStrength('');
    expect(emptyStrength.score).toBe(0);
    expect(emptyStrength.label).toBe('Too Weak');
    expect(emptyStrength.tailwindBg).toBe('bg-rose-500');

    const blacklistedStrength = calculatePasswordStrength('password123');
    expect(blacklistedStrength.score).toBe(1);
    expect(blacklistedStrength.label).toBe('Too Weak');
  });

  it('returns Strong for fully diversified passwords', () => {
    const strong = calculatePasswordStrength('Vertex#Auth99*');
    expect(strong.score).toBe(4);
    expect(strong.percentage).toBe(100);
    expect(strong.label).toBe('Strong');
    expect(strong.tailwindBg).toBe('bg-[#05AD98]');
    expect(strong.colorHex).toBe('#05AD98');
  });
});

describe('passwordPolicy - validatePasswordPolicy API', () => {
  it('rejects passwords shorter than 8 chars with an explicit error', () => {
    const res = validatePasswordPolicy('Ab1!');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('at least 8 characters');
  });

  it('rejects blacklisted common passwords with a descriptive message', () => {
    const res = validatePasswordPolicy('Password123!');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('too common and easily guessed');
  });

  it('rejects passwords lacking symbols', () => {
    const res = validatePasswordPolicy('ValidPassword123');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('special symbol');
  });

  it('approves compliant strong passwords', () => {
    const res = validatePasswordPolicy('SuperV1sor#9876');
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});

describe('auth - registerUser Password Policy Enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks registration when password is weak or missing symbols', async () => {
    const result = await registerUser('test@example.com', 'Alex Dev', 'weakpass');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('blocks registration when password is on the blacklist', async () => {
    const result = await registerUser('test@example.com', 'Alex Dev', 'Password123!');
    expect(result.success).toBe(false);
    expect(result.error).toContain('too common');
  });

  it('proceeds with registration when password is fully compliant', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.user, 'findMany').mockResolvedValue([{ id: 'existing-1' }] as any);
    vi.spyOn(prisma.user, 'create').mockResolvedValue({
      id: 'usr_new_99',
      email: 'alex@example.com',
      name: 'Alex Dev',
      role: 'user',
      tier: 'free',
      avatarUrl: null,
    } as any);

    const result = await registerUser('alex@example.com', 'Alex Dev', 'S3cure#P@ssw0rd!');
    expect(result.success).toBe(true);
    expect(result.user?.email).toBe('alex@example.com');
  });
});
