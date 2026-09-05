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
  // Estrategia: rodar um DDL idempotente via `prisma db execute --file`.
  // Esse script (scripts/bootstrap-schema.sql):
  //   - Limpa migrations failed em _prisma_migrations (destrava o Prisma)
  //   - Cria enums, tabelas, indices e FKs usando IF NOT EXISTS / DROP+ADD
  // E preferivel a `prisma db push` porque:
  //   - Nao depende do estado do _prisma_migrations
  //   - Nao tenta criar f_unaccent (que quebrava em Neon/PG18)
  //   - Falha alto e claro se houver erro (exit code != 0)
  const bootstrap = tryRunCapture(
    "pnpm exec prisma db execute --file scripts/bootstrap-schema.sql --schema prisma/schema.prisma",
  );
  if (!bootstrap.ok) {
    console.error(
      "\n[vercel-build] ERRO CRITICO: bootstrap do schema falhou.\n" +
        "  Verifique DATABASE_URL / POSTGRES_URL_NON_POOLING no Vercel.\n",
    );
    process.exit(1);
  }
  console.log("[vercel-build] bootstrap-schema.sql OK — tabelas garantidas");
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
