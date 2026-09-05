/** Maps Vercel / Neon / Supabase Postgres env vars to what Prisma expects. */
const fs = require("fs");

/** Transaction pooler (6543) — runtime only, not migrations. */
function isTransactionPoolerUrl(url) {
  return /:6543(\/|\?|$)/.test(url) || /pgbouncer=true/i.test(url);
}

/** Session pooler (5432 on pooler host) or direct db host — OK for migrations. */
function isMigrationUrl(url) {
  return Boolean(url) && !isTransactionPoolerUrl(url);
}

function ensurePgbouncerParam(url) {
  if (!url || !isTransactionPoolerUrl(url) || url.includes("pgbouncer=")) return url;
  return url.includes("?") ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
}

/** Vercel Supabase Storage injects STORAGE_POSTGRES_* — mirror to standard names. */
function mapStoragePrefixedEnv() {
  const pairs = [
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

function resolveMigrationUrl() {
  const candidates = [
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.STORAGE_POSTGRES_URL_NON_POOLING,
    process.env.DIRECT_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.SUPABASE_DB_URL,
  ];

  for (const url of candidates) {
    if (isMigrationUrl(url)) return url;
  }

  return "";
}

function normalizeDatabaseEnv() {
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

function fail(message) {
  console.error(`\n[ensure-vercel-env] ERRO: ${message}\n`);
  process.exit(1);
}

/** Prisma CLI reads .env; child shells do not inherit Node process.env mutations. */
function writePrismaEnvFile() {
  const lines = [];
  if (process.env.DATABASE_URL) {
    lines.push(`DATABASE_URL=${JSON.stringify(process.env.DATABASE_URL)}`);
  }
  if (process.env.POSTGRES_URL_NON_POOLING) {
    lines.push(
      `POSTGRES_URL_NON_POOLING=${JSON.stringify(process.env.POSTGRES_URL_NON_POOLING)}`,
    );
  }
  fs.writeFileSync(".env", `${lines.join("\n")}\n`);
}

function prepareVercelEnv() {
  normalizeDatabaseEnv();

  if (!process.env.DATABASE_URL) {
    fail(
      "nenhuma URL de banco encontrada.\n" +
        "  Conecte Supabase via Vercel Storage ou defina DATABASE_URL / STORAGE_POSTGRES_PRISMA_URL",
    );
  }

  if (!isMigrationUrl(process.env.POSTGRES_URL_NON_POOLING)) {
    fail(
      "Falta URL para migrations (porta 5432, session pooler ou direct).\n" +
        "  Supabase via Vercel deve injetar STORAGE_POSTGRES_URL_NON_POOLING.\n" +
        "  Ou defina DIRECT_URL / POSTGRES_URL_NON_POOLING manualmente.",
    );
  }

  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
    fail(
      "AUTH_SECRET ausente ou curto demais (mínimo 16 caracteres).\n" +
        "  → Settings → Environment Variables → Add AUTH_SECRET\n" +
        "  → Gere com: openssl rand -base64 32",
    );
  }

  writePrismaEnvFile();
  const migrationHost = process.env.POSTGRES_URL_NON_POOLING.replace(
    /^postgres(ql)?:\/\//,
    "https://",
  ).split("@")[1]?.split("/")[0];
  console.log(
    `[ensure-vercel-env] OK — DATABASE_URL, migrations via ${migrationHost ?? "?"}, AUTH_SECRET ok.`,
  );
}

module.exports = { prepareVercelEnv, normalizeDatabaseEnv, isMigrationUrl, isTransactionPoolerUrl };

if (require.main === module) {
  prepareVercelEnv();
}
