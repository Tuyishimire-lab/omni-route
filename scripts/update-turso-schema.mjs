import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'libsql://omniroute-prod-tuyishimire-lab.aws-us-east-1.turso.io';
const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyMzkzMDgsImlkIjoiMDFhMDFmYzItYWIwMS03YjVhLWFiOGItYzQ3OTA3ZTczYWVkIiwia2lkIjoiaGhXVEttQm5fZDVHY1NhYnJRUGh5UzBqai1iUTNZTXVhZ04wVUZxekUxMCIsInJpZCI6IjlhYzI2MzNhLTZjNTEtNDE1OS1iZGJkLTZjMmE0YTI5ZDZkYiJ9.okS0Tibgt0rk3O1Jqr5pTGdtRmmVymojBARky1tOllLUi1ZsLHaYXeTsXZHp26RhdCljeORc9pCetlrxg3EcDQ';

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
