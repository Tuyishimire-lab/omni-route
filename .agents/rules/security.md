# Security Rules

1. **NEVER hardcode secrets, tokens, API keys, or database credentials in source files.** Always read from `process.env` and fail fast if they're missing.
2. **NEVER use fallback values for credentials** (e.g., `process.env.TOKEN || "actual-token-here"`). The fallback pattern is what caused the Turso token leak.
3. All secrets must live in `.env.local` (local dev) or Vercel Environment Variables (production). Both are gitignored/encrypted.
4. When creating scripts that connect to databases or external services, always use this pattern:
   ```js
   const token = process.env.DATABASE_AUTH_TOKEN;
   if (!token) {
     console.error('ERROR: DATABASE_AUTH_TOKEN must be set');
     process.exit(1);
   }
   ```
5. If a secret is accidentally committed, it must be rotated immediately - removing it from code is not enough since git history preserves it.
