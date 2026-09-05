/**
 * Maps Vercel / Neon / Supabase Postgres env vars to what Prisma and the app expect.
 */
function isTransactionPoolerUrl(url: string): boolean {
  return /:6543(\/|\?|$)/.test(url) || /pgbouncer=true/i.test(url);
}

function isMigrationUrl(url: string | undefined): boolean {
  return Boolean(url) && !isTransactionPoolerUrl(url);
}

function ensurePgbouncerParam(url: string): string {
  if (!isTransactionPoolerUrl(url) || url.includes("pgbouncer=")) return url;
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
}

function resolveMigrationUrl(): string {
  const candidates = [
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.STORAGE_POSTGRES_URL_NON_POOLING,
    process.env.DIRECT_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.SUPABASE_DB_URL,
  ];

  for (const url of candidates) {
    if (url && isMigrationUrl(url)) return url;
  }

  return "";
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

  const migrationUrl = resolveMigrationUrl();
  if (migrationUrl) {
    process.env.POSTGRES_URL_NON_POOLING = migrationUrl;
  }

  if (!process.env.DATABASE_URL && process.env.POSTGRES_URL_NON_POOLING) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL_NON_POOLING;
  }

  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = ensurePgbouncerParam(process.env.DATABASE_URL);
  }
}
