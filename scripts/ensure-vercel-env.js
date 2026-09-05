/** Vercel Postgres injects POSTGRES_* — map env vars Prisma and the app expect. */
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
      process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || "";
  }

  if (!process.env.DATABASE_URL && process.env.POSTGRES_URL_NON_POOLING) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL_NON_POOLING;
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
      "  → Vercel Dashboard → Storage → Create Database → Postgres → Connect to Project\n" +
      "  → Ou defina DATABASE_URL manualmente em Settings → Environment Variables",
  );
}

if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
  fail(
    "AUTH_SECRET ausente ou curto demais (mínimo 16 caracteres).\n" +
      "  → Settings → Environment Variables → Add AUTH_SECRET\n" +
      "  → Gere com: openssl rand -base64 32",
  );
}

console.log("[ensure-vercel-env] OK — DATABASE_URL e AUTH_SECRET configurados.");
