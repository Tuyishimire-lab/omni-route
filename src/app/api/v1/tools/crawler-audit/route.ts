import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '../../../../../lib/rateLimiter';

export const dynamic = 'force-dynamic';

export interface BotAuditResult {
  bot: string;
  name: string;
  owner: string;
  role: 'search_citation' | 'training_scrape' | 'general_crawler';
  status: 'ALLOWED' | 'BLOCKED' | 'DEFAULT_ALLOWED';
  matchedRule?: string;
  recommendation: string;
}

const AI_BOTS = [
  {
    bot: 'OAI-SearchBot',
    name: 'ChatGPT Search Bot',
    owner: 'OpenAI',
    role: 'search_citation' as const,
    recommendation: 'Allow if you want ChatGPT to search and cite your content in real-time answers.',
  },
  {
    bot: 'PerplexityBot',
    name: 'Perplexity Search Crawler',
    owner: 'Perplexity AI',
    role: 'search_citation' as const,
    recommendation: 'Allow to appear in Perplexity AI direct answers and citation cards.',
  },
  {
    bot: 'ClaudeBot',
    name: 'Claude AI Crawler',
    owner: 'Anthropic',
    role: 'search_citation' as const,
    recommendation: 'Allow for Anthropic Claude knowledge retrieval and citations.',
  },
  {
    bot: 'Applebot-Extended',
    name: 'Apple Intelligence Crawler',
    owner: 'Apple',
    role: 'search_citation' as const,
    recommendation: 'Allow for Siri and Apple Intelligence generative search features.',
  },
  {
    bot: 'GPTBot',
    name: 'OpenAI Foundation Model Crawler',
    owner: 'OpenAI',
    role: 'training_scrape' as const,
    recommendation: 'Allows OpenAI to use site data for future base model pre-training.',
  },
  {
    bot: 'Google-Extended',
    name: 'Google Gemini & Vertex AI Crawler',
    owner: 'Google',
    role: 'training_scrape' as const,
    recommendation: 'Controls whether Gemini and Vertex AI models train on your public content.',
  },
  {
    bot: 'Amazonbot',
    name: 'Amazon Bedrock & Alexa Crawler',
    owner: 'Amazon',
    role: 'general_crawler' as const,
    recommendation: 'Used by Amazon for Alexa voice queries and Bedrock LLM services.',
  },
  {
    bot: 'Bytespider',
    name: 'ByteDance AI Scraper',
    owner: 'ByteDance',
    role: 'training_scrape' as const,
    recommendation: 'Often blocked due to high request volumes and aggressive data mining.',
  },
];

export function parseRobotsForBot(
  robotsText: string,
  botName: string
): { status: 'ALLOWED' | 'BLOCKED' | 'DEFAULT_ALLOWED'; rule?: string } {
  if (!robotsText || !robotsText.trim()) {
    return { status: 'DEFAULT_ALLOWED' };
  }

  const lines = robotsText.split(/\r?\n/).map((l) => l.trim());
  let currentAgents: string[] = [];
  const rulesForBot: Array<{ type: 'allow' | 'disallow'; path: string; line: string }> = [];
  const rulesForStar: Array<{ type: 'allow' | 'disallow'; path: string; line: string }> = [];

  for (const line of lines) {
    // Strip comments
    const cleanLine = line.split('#')[0].trim();
    if (!cleanLine) continue;

    const [directive, ...rest] = cleanLine.split(':');
    const key = directive.trim().toLowerCase();
    const value = rest.join(':').trim();

    if (key === 'user-agent') {
      currentAgents = [value.toLowerCase()];
    } else if (key === 'disallow' || key === 'allow') {
      const isTargetBot = currentAgents.some(
        (a) => a === botName.toLowerCase() || a === '*'
      );
      if (isTargetBot) {
        const entry = {
          type: key as 'allow' | 'disallow',
          path: value,
          line: cleanLine,
        };
        if (currentAgents.includes(botName.toLowerCase())) {
          rulesForBot.push(entry);
        } else if (currentAgents.includes('*')) {
          rulesForStar.push(entry);
        }
      }
    }
  }

  // Explicit bot rules take priority over wildcard (*) rules
  const effectiveRules = rulesForBot.length > 0 ? rulesForBot : rulesForStar;

  if (effectiveRules.length === 0) {
    return { status: 'DEFAULT_ALLOWED' };
  }

  // Check root path "/" rule
  const rootDisallow = effectiveRules.find(
    (r) => r.type === 'disallow' && (r.path === '/' || r.path === '')
  );
  const rootAllow = effectiveRules.find(
    (r) => r.type === 'allow' && (r.path === '/' || r.path === '')
  );

  if (rootDisallow && rootDisallow.path === '/') {
    return { status: 'BLOCKED', rule: rootDisallow.line };
  }

  if (rootAllow) {
    return { status: 'ALLOWED', rule: rootAllow.line };
  }

  // If Disallow has no path (Disallow: ), it means allow everything
  if (rootDisallow && rootDisallow.path === '') {
    return { status: 'ALLOWED', rule: rootDisallow.line };
  }

  // Any other disallow rule
  const anyDisallow = effectiveRules.find((r) => r.type === 'disallow' && r.path);
  if (anyDisallow) {
    return { status: 'BLOCKED', rule: anyDisallow.line };
  }

  return { status: 'DEFAULT_ALLOWED' };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(ip, 'crawler-audit', 60_000, 15);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many audit requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let domainInput = typeof body.domain === 'string' ? body.domain.trim() : '';

    if (!domainInput) {
      return NextResponse.json({ error: 'Domain is required.' }, { status: 400 });
    }

    // Clean protocol and trailing slashes
    domainInput = domainInput.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();

    const targetRobotsUrl = `https://${domainInput}/robots.txt`;
    const targetLlmsUrl = `https://${domainInput}/llms.txt`;
    const targetHomeUrl = `https://${domainInput}`;

    let robotsText = '';
    let robotsFound = false;
    let llmsFound = false;
    let siteTitle = domainInput;
    let siteDescription = '';

    // Fetch robots.txt with 4s timeout
    try {
      const robotsRes = await fetch(targetRobotsUrl, {
        headers: {
          'User-Agent': 'CiteRouteBot/1.0 (+https://citeroute.com/bot)',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (robotsRes.ok) {
        robotsText = await robotsRes.text();
        robotsFound = robotsText.trim().length > 0 && !robotsText.includes('<!DOCTYPE');
      }
    } catch {
      // Ignore network failures, robotsFound remains false
    }

    // Check if llms.txt exists
    try {
      const llmsRes = await fetch(targetLlmsUrl, {
        headers: {
          'User-Agent': 'CiteRouteBot/1.0 (+https://citeroute.com/bot)',
        },
        signal: AbortSignal.timeout(3000),
      });

      if (llmsRes.ok) {
        const text = await llmsRes.text();
        llmsFound = text.trim().length > 0 && !text.includes('<!DOCTYPE');
      }
    } catch {
      // Ignore
    }

    // Fetch homepage metadata for llms.txt auto-population
    try {
      const homeRes = await fetch(targetHomeUrl, {
        headers: {
          'User-Agent': 'CiteRouteBot/1.0 (+https://citeroute.com/bot)',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (homeRes.ok) {
        const html = await homeRes.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          siteTitle = titleMatch[1].trim();
        }

        const descMatch =
          html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
        if (descMatch && descMatch[1]) {
          siteDescription = descMatch[1].trim();
        }
      }
    } catch {
      // Ignore
    }

    // Audit each bot
    const botAudits: BotAuditResult[] = AI_BOTS.map((botDef) => {
      const parsed = parseRobotsForBot(robotsText, botDef.bot);
      return {
        bot: botDef.bot,
        name: botDef.name,
        owner: botDef.owner,
        role: botDef.role,
        status: parsed.status,
        matchedRule: parsed.rule,
        recommendation: botDef.recommendation,
      };
    });

    const allowedCount = botAudits.filter((b) => b.status !== 'BLOCKED').length;
    const blockedCount = botAudits.filter((b) => b.status === 'BLOCKED').length;

    return NextResponse.json({
      success: true,
      domain: domainInput,
      robotsFound,
      robotsUrl: targetRobotsUrl,
      rawRobots: robotsText.slice(0, 10000),
      llmsFound,
      llmsUrl: targetLlmsUrl,
      siteMeta: {
        title: siteTitle,
        description: siteDescription,
      },
      bots: botAudits,
      summary: {
        total: botAudits.length,
        allowed: allowedCount,
        blocked: blockedCount,
      },
    });
  } catch (err: unknown) {
    console.error('[tools/crawler-audit] Error:', err);
    return NextResponse.json(
      { error: 'Failed to inspect domain robots.txt. Please verify the domain and try again.' },
      { status: 500 }
    );
  }
}
