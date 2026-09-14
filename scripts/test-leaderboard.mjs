import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('ERROR: DATABASE_URL and DATABASE_AUTH_TOKEN must be set in env or .env.local');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function test() {
  const res = await client.execute('SELECT * FROM "Domain" LIMIT 5');
  console.log('Sample domains in Turso:', res.rows);
}

test().catch(console.error);
