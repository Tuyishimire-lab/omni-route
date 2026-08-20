import { createClient } from '@libsql/client';

const url = "libsql://omniroute-prod-tuyishimire-lab.aws-us-east-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODcyMzkzMDgsImlkIjoiMDFhMDFmYzItYWIwMS03YjVhLWFiOGItYzQ3OTA3ZTczYWVkIiwia2lkIjoiaGhXVEttQm5fZDVHY1NhYnJRUGh5UzBqai1iUTNZTXVhZ04wVUZxekUxMCIsInJpZCI6IjlhYzI2MzNhLTZjNTEtNDE1OS1iZGJkLTZjMmE0YTI5ZDZkYiJ9.okS0Tibgt0rk3O1Jqr5pTGdtRmmVymojBARky1tOllLUi1ZsLHaYXeTsXZHp26RhdCljeORc9pCetlrxg3EcDQ";

const client = createClient({ url, authToken });

async function test() {
  const res = await client.execute('SELECT * FROM "Domain" LIMIT 5');
  console.log('Sample domains in Turso:', res.rows);
}

test().catch(console.error);
