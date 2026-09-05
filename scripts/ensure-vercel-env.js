/** Maps Vercel / Neon / Supabase Postgres env vars to what Prisma expects. */
const fs = require("fs");

function isPoolerUrl(url) {
  return /pooler|:6543|pgbouncer/i.test(url);
}

function ensurePgbouncerParam(url) {
  if (!url || !isPoolerUrl(url) || url.includes("pgbouncer=")) return url;
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

function normalizeDatabaseEnv() {
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

  if (
    isPoolerUrl(process.env.DATABASE_URL) &&
    (!process.env.POSTGRES_URL_NON_POOLING ||
      isPoolerUrl(process.env.POSTGRES_URL_NON_POOLING))
  ) {
    fail(
      "DATABASE_URL aponta para o pooler, mas falta conexão direta para migrations.\n" +
        "  A integração Supabase deve injetar STORAGE_POSTGRES_HOST (db.*.supabase.co).\n" +
        "  Ou defina DIRECT_URL manualmente (porta 5432, host db.*.supabase.co).",
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
  console.log("[ensure-vercel-env] OK — DATABASE_URL, DIRECT_URL e AUTH_SECRET configurados.");
}

module.exports = { prepareVercelEnv, normalizeDatabaseEnv };

if (require.main === module) {
  prepareVercelEnv();
}
