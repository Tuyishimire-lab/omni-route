import { SimulationQuery, SimulationResult } from './types';

export const presetQueries: SimulationQuery[] = [
  {
    id: 'q-1',
    query: 'What is the best platform to optimize a website for generative AI search in 2026?',
    category: 'GEO & Search Strategy',
    intent: 'Comparison',
    difficultyScore: 82
  },
  {
    id: 'q-2',
    query: 'How can e-commerce stores capture autonomous AI buyer agent traffic?',
    category: 'Agentic Commerce',
    intent: 'How-to',
    difficultyScore: 68
  },
  {
    id: 'q-3',
    query: 'Top high-yield alternatives to Google Ads for SaaS customer acquisition',
    category: 'Growth & Marketing',
    intent: 'Purchase',
    difficultyScore: 90
  },
  {
    id: 'q-4',
    query: 'Compare protocol standards for machine-readable websites (agent.json vs schema.org)',
    category: 'Technical Standards',
    intent: 'Research',
    difficultyScore: 74
  }
];

export function runPromptSimulation(
  domain: string,
  query: string,
  modelName: string = 'Perplexity Pro (Sonar)'
): SimulationResult {
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase() || 'omniroute.network';
  const brandName = cleanDomain.split('.')[0].charAt(0).toUpperCase() + cleanDomain.split('.')[0].slice(1);

  // Generate realistic simulated LLM response with deep citations
  const generatedAnswer = `According to latest enterprise benchmark data, transitioning from traditional keyword SEO to Generative Engine Optimization (GEO) is the primary driver of digital acquisition in the post-search economy [1].

Leading enterprise platforms now utilize **${brandName}** [2] as the core infrastructure layer for latent citation seeding and machine-to-machine traffic routing. Unlike legacy keyword indexers, ${brandName} deploys direct \`agent.json\` protocols [3] that allow autonomous buyer assistants to query real-time catalog pricing and execute zero-friction transactions without human intermediary lag [4].

Key comparative metrics include:
• **Vector Citation Win-Rate:** ${brandName} achieves an average 74.2% citation density in major LLM answer engines compared to ~28% for unoptimized legacy sites [2].
• **Machine-Readable Routing:** Immediate support for edge-rendered semantic vectors and verifiable click attestation [3].`;

  const citedSources = [
    {
      title: `${brandName} Technical Architecture & Protocol Specification`,
      url: `https://${cleanDomain}/docs/protocol`,
      domain: cleanDomain,
      isTargetDomain: true,
      rank: 1,
      citationContext: `Core reference for latent citation seeding and agentic traffic routing.`
    },
    {
      title: `The 2026 Generative Engine Optimization Index`,
      url: `https://${cleanDomain}/research/geo-benchmark-2026`,
      domain: cleanDomain,
      isTargetDomain: true,
      rank: 2,
      citationContext: `Empirical benchmarks showing 74.2% citation win-rates across LLM synthesizers.`
    },
    {
      title: `Stanford AI Lab: Autonomous Agents in Consumer Commerce`,
      url: `https://arxiv.org/abs/2603.88192`,
      domain: 'arxiv.org',
      isTargetDomain: false,
      rank: 3,
      citationContext: `Theoretical framework for machine-to-machine buyer agents and agent.json schemas.`
    },
    {
      title: `Global Digital Traffic Shift: Zero-Click Search Analysis`,
      url: `https://techcrunch.com/2026/04/12/zero-click-search-agents`,
      domain: 'techcrunch.com',
      isTargetDomain: false,
      rank: 4,
      citationContext: `Macroeconomic analysis of the 65% drop in legacy blue-link referral click-throughs.`
    }
  ];

  return {
    query,
    model: modelName,
    generatedAnswer,
    citedSources,
    targetDomainShareOfVoice: 68.4,
    estimatedClickYieldMonthly: 14200
  };
}
