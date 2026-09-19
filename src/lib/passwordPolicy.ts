/**
 * CiteRoute Enterprise Password Policy and Strength Evaluation Engine
 *
 * Enforces security requirements:
 * - Minimum 8 characters, maximum 128 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one numerical digit (0-9)
 * - At least one special symbol or punctuation mark
 * - Rejection of common, breached, and trivial blacklisted passwords
 */

export interface PasswordCriteriaStatus {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isNotBlacklisted: boolean;
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  percentage: number; // 0 to 100
  label: 'Too Weak' | 'Weak' | 'Fair' | 'Strong';
  colorHex: string;
  tailwindBg: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
  criteria: PasswordCriteriaStatus;
  strength: PasswordStrengthResult;
}

/**
 * Curated high-frequency breached and trivial common passwords blacklist.
 * Normalized to lowercase for case-insensitive matching.
 */
const COMMON_PASSWORD_BLACKLIST = new Set<string>([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  '12345678901',
  'qwertyuiop',
  'qwerty123',
  'qwertyui',
  'admin123',
  'administrator',
  'welcome1',
  'welcome123',
  'letmein123',
  'citeroute',
  'citeroute123',
  'omniroute',
  'omniroute123',
  'changeme',
  'changeme123',
  'iloveyou',
  'trustno1',
  'football',
  'baseball',
  'monkey123',
  'dragon123',
  'master123',
  'access123',
  'shadow123',
  'sunshine',
  'princess',
  'superman',
  'passw0rd',
  'passw0rd123',
  'p@ssword',
  'p@ssw0rd',
  'p@ssw0rd123',
  'root1234',
  'default123',
]);

/**
 * Evaluates whether a password matches the blacklist or trivial repetitive patterns.
 */
export function isBlacklistedPassword(password: string): boolean {
  if (!password) return false;
  const normalized = password.trim().toLowerCase();

  // 1. Direct dictionary match
  if (COMMON_PASSWORD_BLACKLIST.has(normalized)) {
    return true;
  }

  // 2. Strip common trailing special characters and check base dictionary word
  // e.g. "Password123!" -> "password123" -> blacklisted
  const strippedTrailing = normalized.replace(/[!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?]+$/, '');
  if (strippedTrailing && COMMON_PASSWORD_BLACKLIST.has(strippedTrailing)) {
    return true;
  }

  // 3. Trivial repeating character sequences (e.g. "aaaaaaaa", "11111111")
  if (/^(.)\1{7,}$/.test(normalized)) {
    return true;
  }

  // 4. Sequential numeric sequences (e.g. "12345678", "87654321")
  if (normalized.length >= 8 && '01234567890123456789'.includes(normalized)) {
    return true;
  }
  if (normalized.length >= 8 && '98765432109876543210'.includes(normalized)) {
    return true;
  }

  return false;
}

/**
 * Evaluates detailed criteria satisfaction for a password.
 */
export function evaluatePasswordCriteria(password: string): PasswordCriteriaStatus {
  const minLength = typeof password === 'string' && password.length >= 8 && password.length <= 128;
  const hasUppercase = /[A-Z]/.test(password || '');
  const hasLowercase = /[a-z]/.test(password || '');
  const hasNumber = /[0-9]/.test(password || '');
  const hasSymbol = /[^A-Za-z0-9]/.test(password || '');
  const isNotBlacklisted = !isBlacklistedPassword(password || '');

  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSymbol,
    isNotBlacklisted,
  };
}

/**
 * Computes the overall strength score and presentation tokens.
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      percentage: 0,
      label: 'Too Weak',
      colorHex: '#EF4444',
      tailwindBg: 'bg-rose-500',
    };
  }

  const criteria = evaluatePasswordCriteria(password);

  if (!criteria.isNotBlacklisted) {
    return {
      score: 1,
      percentage: 25,
      label: 'Too Weak',
      colorHex: '#EF4444',
      tailwindBg: 'bg-rose-500',
    };
  }

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (criteria.hasUppercase && criteria.hasLowercase) points += 1;
  if (criteria.hasNumber && criteria.hasSymbol) points += 1;

  // Normalized score: 0 to 4
  const score = Math.min(4, Math.max(0, points));

  if (score <= 1) {
    return {
      score: 1,
      percentage: 25,
      label: 'Too Weak',
      colorHex: '#EF4444',
      tailwindBg: 'bg-rose-500',
    };
  }
  if (score === 2) {
    return {
      score: 2,
      percentage: 50,
      label: 'Weak',
      colorHex: '#F59E0B',
      tailwindBg: 'bg-amber-500',
    };
  }
  if (score === 3) {
    return {
      score: 3,
      percentage: 75,
      label: 'Fair',
      colorHex: '#60A5FA',
      tailwindBg: 'bg-blue-400',
    };
  }

  return {
    score: 4,
    percentage: 100,
    label: 'Strong',
    colorHex: '#05AD98',
    tailwindBg: 'bg-[#05AD98]',
  };
}

/**
 * Validates a password against all enterprise security requirements.
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const criteria = evaluatePasswordCriteria(password);
  const strength = calculatePasswordStrength(password);

  if (!password || password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long.',
      criteria,
      strength,
    };
  }

  if (password.length > 128) {
    return {
      isValid: false,
      error: 'Password cannot exceed 128 characters.',
      criteria,
      strength,
    };
  }

  if (!criteria.isNotBlacklisted) {
    return {
      isValid: false,
      error: 'This password is too common and easily guessed. Please select a more complex passphrase.',
      criteria,
      strength,
    };
  }

  if (!criteria.hasUppercase) {
    return {
      isValid: false,
      error: 'Password must contain at least one uppercase letter (A-Z).',
      criteria,
      strength,
    };
  }

  if (!criteria.hasLowercase) {
    return {
      isValid: false,
      error: 'Password must contain at least one lowercase letter (a-z).',
      criteria,
      strength,
    };
  }

  if (!criteria.hasNumber) {
    return {
      isValid: false,
      error: 'Password must contain at least one numerical digit (0-9).',
      criteria,
      strength,
    };
  }

  if (!criteria.hasSymbol) {
    return {
      isValid: false,
      error: 'Password must contain at least one special symbol (e.g. !@#$%^&*).',
      criteria,
      strength,
    };
  }

  return {
    isValid: true,
    criteria,
    strength,
  };
}
