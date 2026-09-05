/**
 * Maps Vercel Postgres env vars to what Prisma and the app expect.
 * Vercel Storage injects POSTGRES_* but not always DATABASE_URL.
 */
export function normalizeDatabaseEnv(): void {
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
