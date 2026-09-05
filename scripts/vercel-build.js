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

function tryRunCapture(cmd) {
  console.log(`\n[vercel-build] → ${cmd}\n`);
  try {
    const out = execSync(cmd, { env, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = out.toString();
    if (stdout) console.log(stdout);
    return { ok: true, stdout, stderr: "" };
  } catch (error) {
    const stdout = error.stdout ? error.stdout.toString() : "";
    const stderr = error.stderr ? error.stderr.toString() : "";
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return { ok: false, stdout, stderr };
  }
}

function ensureTablesExist() {
  // Estratégia: sempre tentar db push primeiro para GARANTIR que as tabelas
  // existem. db push é idempotente (não recria o que já está lá) e não depende
  // do estado de _prisma_migrations. Se essa etapa falhar, aborta o build —
  // sem tabelas o app inteiro está morto.
  const push = tryRunCapture(
    "pnpm exec prisma db push --skip-generate --accept-data-loss",
  );
  if (!push.ok) {
    console.error(
      "\n[vercel-build] ERRO CRÍTICO: prisma db push falhou.\n" +
        "  → Verifique STORAGE_POSTGRES_URL_NON_POOLING no Vercel\n" +
        "  → No Supabase, extensão 'unaccent' precisa estar habilitada\n" +
        "  → Se veio de deploy quebrado: Supabase → Database → Reset\n",
    );
    process.exit(1);
  }
  console.log("[vercel-build] db push OK — schema sincronizado");
}

function alignMigrationHistory() {
  // Depois de garantir que as tabelas existem via db push, tentamos alinhar o
  // histórico do _prisma_migrations para que próximos deploys usem o fluxo
  // padrão de migrate deploy. Falhas aqui NÃO bloqueiam o build — o app já
  // funciona sem esse alinhamento.
  const deploy = tryRunCapture("pnpm exec prisma migrate deploy");
  if (deploy.ok) {
    console.log("[vercel-build] migrate deploy OK");
    return;
  }

  const failedMigrationHint = /P3009|failed migrations/i.test(
    `${deploy.stdout}\n${deploy.stderr}`,
  );
  if (failedMigrationHint) {
    console.warn(
      "[vercel-build] migrate deploy encontrou migration com estado failed — resolvendo...",
    );
    tryRunCapture(
      "pnpm exec prisma migrate resolve --rolled-back 20260903213407_init",
    );
    const retry = tryRunCapture("pnpm exec prisma migrate deploy");
    if (retry.ok) {
      console.log("[vercel-build] migrate deploy OK após resolve");
      return;
    }
  }

  // Marca migration como aplicada (as tabelas já foram criadas via db push).
  console.warn(
    "[vercel-build] migrate deploy ainda falhou — marcando como aplicada (tabelas já existem via db push)",
  );
  tryRunCapture(
    "pnpm exec prisma migrate resolve --applied 20260903213407_init",
  );
}

ensureTablesExist();
alignMigrationHistory();
run("pnpm exec prisma generate");
run("pnpm exec next build --webpack");
