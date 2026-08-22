# OmniRoute

**Generative Engine Optimization (GEO) and AI-traffic analytics for the post-search web.**

OmniRoute tells you how visible your domain is to AI answer engines (ChatGPT, Perplexity, Claude, Gemini), and — uniquely — measures the AI agent traffic *actually hitting your site*.

## What it does

| Capability | How it works |
|---|---|
| **GEO Audit** (`/audit`) | Live-crawls any URL via [Jina Reader](https://jina.ai/reader/), extracts real signals (JSON-LD schemas, heading structure, content depth, entity markup) and computes a transparent weighted score. Falls back to a clearly-labeled deterministic estimate when a site can't be crawled. |
| **Agent Traffic Analytics** | Install one `<script>` tag; OmniRoute classifies every visitor server-side as human, AI training crawler, AI search crawler, autonomous agent, or answer-engine referral — then records real telemetry to your dashboard. |
| **Watchlist** (`/watchlist`) | Continuous score tracking with history sparklines and trend deltas across your domain portfolio. |
| **Leaderboard** (`/leaderboard`) | Public ranking of domains by GEO authority. |
| **agent.json Generator** (`/manifest`) | Produce machine-readable manifests so autonomous buyer agents can discover and transact with your products. |
| **API** (`/docs`) | Key-authenticated REST API with tiered rate limits (free / pro / enterprise). |

## Quick start

```bash
pnpm install
cp .env.example .env.local   # set DATABASE_URL + JWT_SECRET
pnpm exec prisma migrate deploy
pnpm dev
```

Requires Node ≥ 22 and pnpm ≥ 10.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Turso/libSQL connection string (SQLite-compatible) |
| `JWT_SECRET` | Session signing secret — **required in production**, app refuses to boot without it |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth (optional) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |

### Installing the tracking snippet

Add one line to any site you want to monitor:

```html
<script async src="https://your-omniroute-deployment/api/v1/track.js"
        data-omniroute-endpoint="https://your-omniroute-deployment"></script>
```

No cookies, no PII. Classification happens server-side from request headers.

## Architecture

- **Next.js 16 App Router** · React 19 · TypeScript strict
- **Prisma 7 + libSQL/Turso** — serverless-safe persistence
- **DB-backed rate limiting & scan caching** — correct across cold starts
- **API keys hashed at rest** (sha256); plaintext shown exactly once at creation
- **SSRF-hardened crawler** — private ranges, link-local, and cloud-metadata targets blocked
- **Vitest** unit tests: `pnpm test`

```
src/
  app/api/v1/     scan · track · leaderboard · analytics · keys · manifest · watchlist
  lib/            geoAnalyzer · liveCrawler · agentTraffic · apiAuth · auth · rateLimiter
  components/     dashboard UI (telemetry feed, audit view, ROI calculator, …)
prisma/schema.prisma   Domain · ScanEvent · TelemetryEvent · ApiKey · User · RateLimitRecord
```

## Honest-data policy

Anything simulated is labeled **"Demo Data"** in the UI. Scores derived from live crawls are marked as live scans; uncrawlable domains get a clearly-flagged fallback estimate. We never present synthetic traffic as real.

## Deploy

Optimized for Vercel (uses `after()` for background persistence). See `vercel.json`.

```bash
vercel deploy --prod
```

---

© 2026 OmniRoute Protocol — see DOCUMENTATION.md for the full product spec.
