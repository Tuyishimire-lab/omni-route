import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('ERROR: DATABASE_URL and DATABASE_AUTH_TOKEN must be set in env or .env.local');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function main() {
  console.log('Connecting to Turso database to synchronize User schema...');

  const columns = [
    { name: 'lemonCustomerId', type: 'TEXT' },
    { name: 'lemonSubscriptionId', type: 'TEXT' },
    { name: 'lemonVariantId', type: 'TEXT' },
    { name: 'subscriptionStatus', type: 'TEXT' },
    { name: 'subscriptionRenewsAt', type: 'DATETIME' },
    { name: 'subscriptionEndsAt', type: 'DATETIME' },
    { name: 'lemonPortalUrl', type: 'TEXT' },
  ];

  const tableInfo = await client.execute('PRAGMA table_info(User)');
  const existingCols = new Set(tableInfo.rows.map(r => r.name));

  for (const col of columns) {
    if (!existingCols.has(col.name)) {
      console.log(`Adding column "${col.name}" (${col.type}) to User table in Turso...`);
      await client.execute(`ALTER TABLE "User" ADD COLUMN "${col.name}" ${col.type};`);
      console.log(`✓ Added column "${col.name}"`);
    } else {
      console.log(`Column "${col.name}" already exists.`);
    }
  }

  await client.execute('CREATE INDEX IF NOT EXISTS "User_lemonCustomerId_idx" ON "User"("lemonCustomerId");');
  await client.execute('CREATE INDEX IF NOT EXISTS "User_lemonSubscriptionId_idx" ON "User"("lemonSubscriptionId");');
  console.log('✓ Verified indexes on User table');

  const updatedInfo = await client.execute('PRAGMA table_info(User)');
  console.log('\nFinal columns in Turso User table:');
  console.log(updatedInfo.rows.map(r => r.name));
  console.log('\n🎉 Turso schema update completed successfully!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
