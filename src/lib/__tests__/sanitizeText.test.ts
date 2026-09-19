import { describe, it, expect } from 'vitest';
import {
  cleanEmDashes,
  deepCleanEmDashes,
  validateAndSanitizeName,
  escapeHtml,
  sanitizeEmailRecipientName,
} from '../sanitizeText';

describe('cleanEmDashes', () => {
  it('replaces em-dash before capital letter with period', () => {
    const input = 'The domain has high authority — However, schema void detected.';
    const output = cleanEmDashes(input);
    expect(output).toBe('The domain has high authority. However, schema void detected.');
  });

  it('replaces em-dash in continuation clause with comma', () => {
    const input = 'Measures how resilient content is against zero-click search — where engines answer queries directly.';
    const output = cleanEmDashes(input);
    expect(output).toBe('Measures how resilient content is against zero-click search, where engines answer queries directly.');
  });

  it('handles number ranges with en-dash or em-dash', () => {
    expect(cleanEmDashes('24–48 h')).toBe('24-48 h');
    expect(cleanEmDashes('Score (0–100)')).toBe('Score (0-100)');
    expect(cleanEmDashes('Years 2020—2025')).toBe('Years 2020-2025');
  });

  it('replaces HTML entities &mdash; and &ndash;', () => {
    const input = 'CiteRoute Engine &mdash; Deep Intelligence';
    const output = cleanEmDashes(input);
    expect(output).not.toContain('&mdash;');
    expect(output).not.toContain('—');
  });

  it('replaces double dash -- with comma or period', () => {
    const input = 'Fast indexing -- especially for AI crawlers';
    const output = cleanEmDashes(input);
    expect(output).toBe('Fast indexing, especially for AI crawlers');
  });

  it('cleans excessive punctuation combinations', () => {
    const input = 'High authority: — missing schemas';
    const output = cleanEmDashes(input);
    expect(output).toBe('High authority: missing schemas');
  });
});

describe('deepCleanEmDashes', () => {
  it('recursively cleans strings in nested objects and arrays', () => {
    const input = {
      summary: 'Executive Summary — Strong visibility — however schema void exists.',
      risks: [
        'Risk 1 — Unstructured data',
        'Risk 2 — Missing agent.json'
      ],
      schemas: [
        { title: 'Schema Title — Organization', description: 'Critical — needed for grounding.' }
      ],
      score: 85,
    };

    const cleaned = deepCleanEmDashes(input);

    expect(cleaned.summary).not.toContain('—');
    expect(cleaned.risks[0]).not.toContain('—');
    expect(cleaned.risks[1]).not.toContain('—');
    expect(cleaned.schemas[0].title).not.toContain('—');
    expect(cleaned.schemas[0].description).not.toContain('—');
    expect(cleaned.score).toBe(85);
  });
});

describe('validateAndSanitizeName (OWASP A03 URL / HTML Injection Prevention)', () => {
  it('rejects the exact reported attack payload with markdown link and URL', () => {
    const payload = 'Didn’t create this account? Click [evil.com](http://evil.com/)';
    const result = validateAndSanitizeName(payload);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Name cannot contain URLs, website links, or HTML tags.');
  });

  it('rejects standard URL schemes and protocols', () => {
    const payloads = [
      'https://evil.com/login',
      'http://phishing.site',
      'ftp://ftp.attacker.org',
      'mailto:victim@phish.com',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '//evil.com/account',
      'www.evil.com/reset',
    ];

    for (const p of payloads) {
      const result = validateAndSanitizeName(p);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name cannot contain URLs, website links, or HTML tags.');
    }
  });

  it('rejects raw domain names with common TLDs', () => {
    const domains = [
      'evil.com',
      'attacker.net',
      'verify-security.org',
      'phish.xyz',
      'malicious.io',
      'account-update.co',
      'reset.dev',
      'login.security.app',
      'secure-portal.top',
      'coke.store',
    ];

    for (const d of domains) {
      const result = validateAndSanitizeName(d);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name cannot contain URLs, website links, or HTML tags.');
    }
  });

  it('rejects HTML tags and XSS injection vectors', () => {
    const htmlPayloads = [
      '<script>alert(1)</script>',
      '<a href="https://evil.com">Click Here</a>',
      'Alex<img src=x onerror=alert(1)>',
      '<b>Bold Name</b>',
      '<iframe src="https://evil.com"></iframe>',
    ];

    for (const h of htmlPayloads) {
      const result = validateAndSanitizeName(h);
      expect(result.isValid).toBe(false);
    }
  });

  it('rejects non-alphanumeric special symbols and punctuation', () => {
    const symbols = [
      'John @ Developer',
      'Jane # Designer',
      'User $ Dollar',
      'Test % Percent',
      'Admin * Star',
      'Alice + Bob',
      'User = Equal',
      'User {Brackets}',
    ];

    for (const s of symbols) {
      const result = validateAndSanitizeName(s);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name may only contain letters, numbers, spaces, hyphens, and apostrophes.');
    }
  });

  it('rejects empty, short, or excessively long strings', () => {
    expect(validateAndSanitizeName('').isValid).toBe(false);
    expect(validateAndSanitizeName(' ').isValid).toBe(false);
    expect(validateAndSanitizeName('A').isValid).toBe(false);
    expect(validateAndSanitizeName('A'.repeat(71)).isValid).toBe(false);
    expect(validateAndSanitizeName(null).isValid).toBe(false);
    expect(validateAndSanitizeName(undefined).isValid).toBe(false);
  });

  it('accepts legitimate names and trims / normalizes excessive whitespace', () => {
    const validCases = [
      { input: 'Alex Morgan', expected: 'Alex Morgan' },
      { input: '  Jane   O\'Connor  ', expected: 'Jane O\'Connor' },
      { input: 'Jean-Luc Picard', expected: 'Jean-Luc Picard' },
      { input: 'Dr. John Watson, Jr.', expected: 'Dr. John Watson, Jr.' },
      { input: 'Renée Müller', expected: 'Renée Müller' },
      { input: 'Mary-Jane Watson-Parker', expected: 'Mary-Jane Watson-Parker' },
      { input: 'Acme Corp 24', expected: 'Acme Corp 24' },
    ];

    for (const c of validCases) {
      const result = validateAndSanitizeName(c.input);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(c.expected);
    }
  });
});

describe('escapeHtml', () => {
  it('escapes standard HTML entity characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#39;');
  });

  it('handles empty or non-string input safely', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null as unknown as string)).toBe('');
    expect(escapeHtml(undefined as unknown as string)).toBe('');
  });
});

describe('sanitizeEmailRecipientName (Defense-in-depth for email templates)', () => {
  it('neutralizes the reported URL injection payload', () => {
    const payload = 'Didn’t create this account? Click [evil.com](http://evil.com/)';
    const safe = sanitizeEmailRecipientName(payload);
    expect(safe).not.toContain('evil.com');
    expect(safe).not.toContain('http');
    expect(safe).not.toContain('[');
    expect(safe).not.toContain(']');
  });

  it('strips HTML tags and script elements', () => {
    const payload = 'Alex <script>alert("hack")</script>';
    const safe = sanitizeEmailRecipientName(payload);
    expect(safe).not.toContain('<script>');
    expect(safe).not.toContain('alert');
  });

  it('falls back to "there" when name is invalid, empty, or stripped entirely', () => {
    expect(sanitizeEmailRecipientName('')).toBe('there');
    expect(sanitizeEmailRecipientName('   ')).toBe('there');
    expect(sanitizeEmailRecipientName(undefined)).toBe('there');
    expect(sanitizeEmailRecipientName('http://evil.com')).toBe('there');
    expect(sanitizeEmailRecipientName('a')).toBe('there');
  });

  it('preserves and safely sanitizes clean names', () => {
    expect(sanitizeEmailRecipientName('Alex Morgan')).toBe('Alex Morgan');
    expect(sanitizeEmailRecipientName('Jean-Luc')).toBe('Jean-Luc');
  });
});

