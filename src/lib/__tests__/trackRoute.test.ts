import { describe, it, expect } from 'vitest';
import { classifyRequest, extractDomainFromHost } from '../agentTraffic';

describe('Telemetry Ingestion & Attribution Logic', () => {
  it('extracts clean root domain from various Host header formats', () => {
    expect(extractDomainFromHost('stripe.com')).toBe('stripe.com');
    expect(extractDomainFromHost('www.stripe.com')).toBe('stripe.com');
    expect(extractDomainFromHost('api.stripe.com:3000')).toBe('api.stripe.com');
    expect(extractDomainFromHost('localhost:3000')).toBe('localhost');
    expect(extractDomainFromHost(null)).toBeNull();
  });

  it('correctly attributes AI answer engine referral traffic', () => {
    const chatGptVisit = classifyRequest(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'https://chatgpt.com/'
    );
    expect(chatGptVisit.classification).toBe('AI_ANSWER_ENGINE');
    expect(chatGptVisit.referredBy).toBe('ChatGPT');
    expect(chatGptVisit.eventType).toBe('AI_CITATION');

    const perplexityVisit = classifyRequest(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'https://www.perplexity.ai/search/test-query'
    );
    expect(perplexityVisit.classification).toBe('AI_ANSWER_ENGINE');
    expect(perplexityVisit.referredBy).toBe('Perplexity');
    expect(perplexityVisit.eventType).toBe('AI_CITATION');
  });

  it('correctly attributes headless AI crawlers', () => {
    const gptBot = classifyRequest('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)', null);
    expect(gptBot.classification).toBe('AI_TRAINING_CRAWLER');
    expect(gptBot.agentName).toBe('GPTBot');

    const claudeBot = classifyRequest('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', null);
    expect(claudeBot.classification).toBe('AI_TRAINING_CRAWLER');
    expect(claudeBot.agentName).toBe('ClaudeBot');

    const perplexityCrawler = classifyRequest('PerplexityBot/1.0', null);
    expect(perplexityCrawler.classification).toBe('AI_SEARCH_CRAWLER');
    expect(perplexityCrawler.agentName).toBe('PerplexityBot');
  });

  it('classifies normal human visitors with non-AI referrers as HUMAN', () => {
    const human = classifyRequest(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'https://google.com/'
    );
    expect(human.classification).toBe('HUMAN');
    expect(human.agentName).toBeNull();
    expect(human.referredBy).toBeNull();
  });
});
