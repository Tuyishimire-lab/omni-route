import { describe, it, expect } from 'vitest';
import { classifyRequest, extractDomainFromHost } from '../agentTraffic';

describe('classifyRequest', () => {
  it('classifies GPTBot as an AI training crawler', () => {
    const r = classifyRequest('GPTBot/1.0 (+https://openai.com/gptbot)', null);
    expect(r.classification).toBe('AI_TRAINING_CRAWLER');
    expect(r.agentName).toBe('GPTBot');
    expect(r.eventType).toBe('GEO_INDEX_PING');
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it('classifies PerplexityBot as an AI search crawler', () => {
    const r = classifyRequest('Mozilla/5.0 (compatible; PerplexityBot/1.0)', null);
    expect(r.classification).toBe('AI_SEARCH_CRAWLER');
    expect(r.agentName).toBe('PerplexityBot');
  });

  it('classifies OAI-SearchBot as an AI search crawler', () => {
    const r = classifyRequest('Mozilla/5.0 (compatible; OAI-SearchBot/1.0)', null);
    expect(r.classification).toBe('AI_SEARCH_CRAWLER');
  });

  it('classifies ClaudeBot as a training crawler', () => {
    const r = classifyRequest('ClaudeBot/1.0', null);
    expect(r.classification).toBe('AI_TRAINING_CRAWLER');
  });

  it('classifies ChatGPT referral traffic as an answer-engine citation', () => {
    const r = classifyRequest('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'https://chatgpt.com/');
    expect(r.classification).toBe('AI_ANSWER_ENGINE');
    expect(r.referredBy).toBe('ChatGPT');
    expect(r.eventType).toBe('AI_CITATION');
  });

  it('classifies Perplexity referral traffic as an answer-engine citation', () => {
    const r = classifyRequest('Mozilla/5.0', 'https://www.perplexity.ai/search?q=test');
    expect(r.classification).toBe('AI_ANSWER_ENGINE');
    expect(r.referredBy).toBe('Perplexity');
  });

  it('classifies headless automation as an AI agent', () => {
    const r = classifyRequest('Mozilla/5.0 (HeadlessChrome/120.0)', null);
    expect(r.classification).toBe('AI_AGENT');
    expect(r.eventType).toBe('AGENT_TX');
  });

  it('classifies LangChain agents as AI agents', () => {
    const r = classifyRequest('langchain-agent/0.1', null);
    expect(r.classification).toBe('AI_AGENT');
  });

  it('classifies normal browsers as human', () => {
    const r = classifyRequest(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'https://www.google.com/'
    );
    expect(r.classification).toBe('HUMAN');
    expect(r.agentName).toBeNull();
  });

  it('handles null headers gracefully', () => {
    const r = classifyRequest(null, null);
    expect(r.classification).toBe('HUMAN');
  });

  it('answer-engine referral wins over crawler UA', () => {
    // A user clicking through from ChatGPT may carry a bot-ish UA string
    const r = classifyRequest('GPTBot/1.0', 'https://chatgpt.com/');
    expect(r.classification).toBe('AI_ANSWER_ENGINE');
  });

  it('classifies Google AI Mode click-through (udm=50) as AI_ANSWER_ENGINE', () => {
    const r = classifyRequest(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'https://www.google.com/search?q=stripe+pricing&udm=50'
    );
    expect(r.classification).toBe('AI_ANSWER_ENGINE');
    expect(r.agentName).toBe('Google AI Mode');
    expect(r.referredBy).toBe('Google AI Mode');
    expect(r.eventType).toBe('AI_CITATION');
  });

  it('does NOT classify regular Google organic traffic as AI (no udm=50)', () => {
    const r = classifyRequest(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'https://www.google.com/search?q=stripe+pricing'
    );
    expect(r.classification).toBe('HUMAN');
  });
});

describe('extractDomainFromHost', () => {
  it('strips www prefix and port', () => {
    expect(extractDomainFromHost('www.stripe.com:443')).toBe('stripe.com');
  });

  it('handles plain hosts', () => {
    expect(extractDomainFromHost('example.com')).toBe('example.com');
  });

  it('returns null for missing host', () => {
    expect(extractDomainFromHost(null)).toBeNull();
  });
});
