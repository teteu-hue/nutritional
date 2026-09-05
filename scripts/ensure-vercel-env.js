/** Vercel Postgres injects POSTGRES_* — map to DATABASE_URL for Prisma. */
function normalizeDatabaseEnv() {
  if (!process.env.DATABASE_URL) {
    if (process.env.POSTGRES_PRISMA_URL) {
      process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
    } else if (process.env.POSTGRES_URL) {
      process.env.DATABASE_URL = process.env.POSTGRES_URL;
    }
  }
  if (!process.env.POSTGRES_URL_NON_POOLING && process.env.POSTGRES_URL) {
    process.env.POSTGRES_URL_NON_POOLING = process.env.POSTGRES_URL;
  }
}

normalizeDatabaseEnv();
