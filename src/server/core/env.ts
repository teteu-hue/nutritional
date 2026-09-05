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

function mapStoragePrefixedEnv(): void {
  const pairs: [string, string][] = [
    ["STORAGE_POSTGRES_PRISMA_URL", "POSTGRES_PRISMA_URL"],
    ["STORAGE_POSTGRES_URL", "POSTGRES_URL"],
    ["STORAGE_POSTGRES_URL_NON_POOLING", "POSTGRES_URL_NON_POOLING"],
    ["STORAGE_POSTGRES_USER", "POSTGRES_USER"],
    ["STORAGE_POSTGRES_PASSWORD", "POSTGRES_PASSWORD"],
    ["STORAGE_POSTGRES_HOST", "POSTGRES_HOST"],
    ["STORAGE_POSTGRES_DATABASE", "POSTGRES_DATABASE"],
  ];

  for (const [storageKey, targetKey] of pairs) {
    if (process.env[storageKey] && !process.env[targetKey]) {
      process.env[targetKey] = process.env[storageKey];
    }
  }

  if (
    process.env.STORAGE_POSTGRES_HOST &&
    process.env.STORAGE_POSTGRES_PASSWORD &&
    !process.env.DIRECT_URL
  ) {
    const host = process.env.STORAGE_POSTGRES_HOST;
    const db = process.env.STORAGE_POSTGRES_DATABASE || "postgres";
    const user = process.env.STORAGE_POSTGRES_USER || "postgres";
    const password = encodeURIComponent(process.env.STORAGE_POSTGRES_PASSWORD);
    if (!host.includes("pooler")) {
      process.env.DIRECT_URL = `postgres://${user}:${password}@${host}:5432/${db}?sslmode=require`;
    }
  }
}

export function normalizeDatabaseEnv(): void {
  mapStoragePrefixedEnv();

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
