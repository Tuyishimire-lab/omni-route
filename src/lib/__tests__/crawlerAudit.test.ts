import { describe, it, expect } from 'vitest';
import { parseRobotsForBot } from '../../app/api/v1/tools/crawler-audit/route';

describe('Robots.txt AI Crawler Parser', () => {
  it('defaults to allowed if robots.txt is empty or unparseable', () => {
    const res = parseRobotsForBot('', 'GPTBot');
    expect(res.status).toBe('DEFAULT_ALLOWED');
  });

  it('detects explicit disallow rule for target AI bot', () => {
    const robots = `
User-agent: Googlebot
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: *
Allow: /
`;
    const res = parseRobotsForBot(robots, 'GPTBot');
    expect(res.status).toBe('BLOCKED');
    expect(res.rule).toBe('Disallow: /');
  });

  it('respects specific bot allow rule over global wildcard disallow', () => {
    const robots = `
User-agent: *
Disallow: /

User-agent: PerplexityBot
Allow: /
`;
    const perplexityResult = parseRobotsForBot(robots, 'PerplexityBot');
    expect(perplexityResult.status).toBe('ALLOWED');

    const claudeResult = parseRobotsForBot(robots, 'ClaudeBot');
    expect(claudeResult.status).toBe('BLOCKED');
  });

  it('handles Disallow without path as Allow (standard robots.txt convention)', () => {
    const robots = `
User-agent: ClaudeBot
Disallow:
`;
    const res = parseRobotsForBot(robots, 'ClaudeBot');
    expect(res.status).toBe('ALLOWED');
  });

  it('correctly handles case-insensitivity in User-agent directives', () => {
    const robots = `
user-agent: oai-searchbot
disallow: /
`;
    const res = parseRobotsForBot(robots, 'OAI-SearchBot');
    expect(res.status).toBe('BLOCKED');
  });
});
