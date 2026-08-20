import path from 'node:path';
import { defineConfig } from 'prisma/config';

const DB_URL = 'file:./omniroute.db';

export default defineConfig({
  schema: path.join(process.cwd(), 'prisma/schema.prisma'),
  datasource: {
    url: DB_URL,
  },
});
