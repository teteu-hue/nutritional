/** Maps Vercel / Neon / Supabase Postgres env vars to what Prisma expects. */
function isPoolerUrl(url) {
  return /pooler|:6543|pgbouncer/i.test(url);
}

function ensurePgbouncerParam(url) {
  if (!url || !isPoolerUrl(url) || url.includes("pgbouncer=")) return url;
  return url.includes("?") ? `${url}&pgbouncer=true` : `${url}?pgbouncer=true`;
}

function normalizeDatabaseEnv() {
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

  // Migrations must use a direct connection (port 5432), not the pooler (6543).
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

normalizeDatabaseEnv();

if (!process.env.DATABASE_URL) {
  fail(
    "nenhuma URL de banco encontrada.\n" +
      "  Supabase: Settings → Environment Variables\n" +
      "    DATABASE_URL = Transaction pooler (porta 6543)\n" +
      "    DIRECT_URL   = Direct connection (porta 5432)\n" +
      "  Ou conecte via Vercel → Storage → Marketplace → Supabase",
  );
}

if (
  isPoolerUrl(process.env.DATABASE_URL) &&
  (!process.env.POSTGRES_URL_NON_POOLING || isPoolerUrl(process.env.POSTGRES_URL_NON_POOLING))
) {
  fail(
    "DATABASE_URL aponta para o pooler, mas falta DIRECT_URL (conexão direta, porta 5432).\n" +
      "  Supabase Dashboard → Project Settings → Database → Connection string\n" +
      "    URI (Transaction, 6543) → DATABASE_URL\n" +
      "    URI (Direct, 5432)     → DIRECT_URL",
  );
}

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
  fail(
    "AUTH_SECRET ausente ou curto demais (mínimo 16 caracteres).\n" +
      "  → Settings → Environment Variables → Add AUTH_SECRET\n" +
      "  → Gere com: openssl rand -base64 32",
  );
}

console.log("[ensure-vercel-env] OK — DATABASE_URL, DIRECT_URL e AUTH_SECRET configurados.");
