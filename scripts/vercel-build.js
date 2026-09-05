const { execSync } = require("child_process");
const { prepareVercelEnv } = require("./ensure-vercel-env");

prepareVercelEnv();

const env = process.env;

function run(cmd) {
  console.log(`\n[vercel-build] → ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", env });
}

function tryRun(cmd) {
  try {
    run(cmd);
    return true;
  } catch {
    return false;
  }
}

function syncDatabaseSchema() {
  if (tryRun("pnpm exec prisma migrate deploy")) {
    console.log("[vercel-build] migrate deploy OK");
    return;
  }

  console.warn("[vercel-build] migrate deploy falhou — tentando resolver P3009...");

  tryRun("pnpm exec prisma migrate resolve --rolled-back 20260903213407_init");

  if (tryRun("pnpm exec prisma migrate deploy")) {
    console.log("[vercel-build] migrate deploy OK após resolve");
    return;
  }

  console.warn("[vercel-build] migrate deploy falhou — tentando db push...");

  if (tryRun("pnpm exec prisma db push --skip-generate --accept-data-loss")) {
    console.log("[vercel-build] db push OK");
    return;
  }

  console.error(
    "\n[vercel-build] ERRO: não foi possível aplicar o schema no banco.\n" +
      "  → Supabase Dashboard → Database → Reset database (se P3009)\n" +
      "  → Extensions → habilitar 'unaccent'\n" +
      "  → Confira STORAGE_POSTGRES_URL_NON_POOLING na Vercel\n",
  );
  process.exit(1);
}

syncDatabaseSchema();
run("pnpm exec prisma generate");
run("pnpm exec next build --webpack");
