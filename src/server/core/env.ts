/**
 * Maps Vercel / Neon / Supabase Postgres env vars to what Prisma and the app expect.
 */
function isPoolerUrl(url: string): boolean {
  return /pooler|:6543|pgbouncer/i.test(url);
}

function ensurePgbouncerParam(url: string): string {
  if (!isPoolerUrl(url) || url.includes("pgbouncer=")) return url;
  return url.includes("?") ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
}

export function normalizeDatabaseEnv(): void {
  if (!process.env.DATABASE_URL) {
    if (process.env.POSTGRES_PRISMA_URL) {
      process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
    } else if (process.env.POSTGRES_URL) {
      process.env.DATABASE_URL = process.env.POSTGRES_URL;
    }
  }

  if (!process.env.POSTGRES_URL_NON_POOLING) {
    process.env.POSTGRES_URL_NON_POOLING =
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.SUPABASE_DB_URL ||
      "";
  }

  if (
    !process.env.POSTGRES_URL_NON_POOLING ||
    isPoolerUrl(process.env.POSTGRES_URL_NON_POOLING)
  ) {
    const fallback =
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.SUPABASE_DB_URL ||
      "";
    if (fallback && !isPoolerUrl(fallback)) {
      process.env.POSTGRES_URL_NON_POOLING = fallback;
    }
  }

  if (!process.env.DATABASE_URL && process.env.POSTGRES_URL_NON_POOLING) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL_NON_POOLING;
  }

  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = ensurePgbouncerParam(process.env.DATABASE_URL);
  }
}
