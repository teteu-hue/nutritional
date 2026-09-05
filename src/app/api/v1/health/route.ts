import { jsonOk } from "@/server/core/errors";
import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkDb = url.searchParams.get("db") === "1";

  if (!checkDb) return jsonOk({ status: "ok", version: "v1" });

  const started = Date.now();
  const checks: Record<
    string,
    { ok: boolean; latencyMs: number; error?: string; message?: string; result?: unknown }
  > = {};

  async function run(name: string, fn: () => Promise<unknown>) {
    const t = Date.now();
    try {
      const result = await fn();
      checks[name] = { ok: true, latencyMs: Date.now() - t, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errName = error instanceof Error ? error.name : "UnknownError";
      if (error instanceof Error) {
        console.error(`[health.${name}] ${errName}: ${message}`, error.stack ?? "");
      }
      checks[name] = {
        ok: false,
        latencyMs: Date.now() - t,
        error: errName,
        message,
      };
    }
  }

  await run("select1", () =>
    prisma.$queryRawUnsafe<Array<{ ok: number }>>("SELECT 1 AS ok"),
  );
  await run("currentDatabase", () =>
    prisma.$queryRawUnsafe<
      Array<{ database: string; user: string; schema: string }>
    >(
      "SELECT current_database() AS database, current_user AS user, current_schema() AS schema",
    ),
  );
  await run("publicTables", () =>
    prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    ),
  );
  await run("migrationsState", () =>
    prisma.$queryRawUnsafe<
      Array<{
        migration_name: string;
        started_at: Date | null;
        finished_at: Date | null;
        rolled_back_at: Date | null;
        logs: string | null;
      }>
    >(
      "SELECT migration_name, started_at, finished_at, rolled_back_at, logs FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10",
    ),
  );
  await run("usersCount", () => prisma.user.count());
  await run("prismaVersion", () =>
    prisma.$queryRawUnsafe<Array<{ version: string }>>("SELECT version() AS version"),
  );

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;
  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      version: "v1",
      db: { ok: allOk, latencyMs: Date.now() - started, checks },
    },
    { status },
  );
}

// Recuperação manual: remove uma migration Prisma marcada como failed
// (finished_at IS NULL AND rolled_back_at IS NULL) e opcionalmente sinaliza
// que o schema deve ser recriado no próximo build. Protegido por AUTH_SECRET.
//
// Uso:
//   curl -X POST "$HOST/api/v1/health?repair=1" -H "x-repair-token: $AUTH_SECRET"
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("repair") !== "1") {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const token = request.headers.get("x-repair-token");
  if (!token || token !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const started = Date.now();
  const steps: Array<{
    name: string;
    ok: boolean;
    detail?: unknown;
    error?: string;
  }> = [];

  async function step(name: string, fn: () => Promise<unknown>) {
    try {
      const detail = await fn();
      steps.push({ name, ok: true, detail });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof Error) {
        console.error(`[repair.${name}] ${error.name}: ${message}`, error.stack ?? "");
      }
      steps.push({ name, ok: false, error: message });
    }
  }

  await step("deleteFailedMigrations", async () =>
    prisma.$executeRawUnsafe(
      "DELETE FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL",
    ),
  );

  // DDL mínimo idempotente: cria todas as tabelas do schema.prisma no
  // Neon/Postgres. Não cria f_unaccent nem o índice funcional
  // foods_name_unaccent_idx — esses são otimizações que podem ficar para
  // depois; o app funciona sem eles.
  const ddlStatements: Array<[string, string]> = [
    [
      "createEnum_BiologicalSex",
      "DO $$ BEGIN CREATE TYPE \"BiologicalSex\" AS ENUM ('male','female'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    ],
    [
      "createEnum_ActivityLevel",
      "DO $$ BEGIN CREATE TYPE \"ActivityLevel\" AS ENUM ('sedentario','leve','moderado','ativo','muito_ativo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    ],
    [
      "createEnum_Goal",
      "DO $$ BEGIN CREATE TYPE \"Goal\" AS ENUM ('perder_peso','manter_peso','ganhar_peso'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    ],
    [
      "createEnum_FoodSource",
      "DO $$ BEGIN CREATE TYPE \"FoodSource\" AS ENUM ('base','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    ],
    [
      "createEnum_BaseUnit",
      "DO $$ BEGIN CREATE TYPE \"BaseUnit\" AS ENUM ('100g','100ml'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    ],
    [
      "createEnum_MealType",
      "DO $$ BEGIN CREATE TYPE \"MealType\" AS ENUM ('cafe_da_manha','almoco','jantar','lanche'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    ],
    [
      "createEnum_AiInteractionStatus",
      "DO $$ BEGIN CREATE TYPE \"AiInteractionStatus\" AS ENUM ('success','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
    ],
    [
      "createTable_users",
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password_hash" TEXT NOT NULL,
        "onboarding_completed_at" TIMESTAMP(3),
        "email_verified" TIMESTAMP(3),
        "name" TEXT,
        "image" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      )`,
    ],
    [
      "index_users_email",
      'CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")',
    ],
    [
      "createTable_accounts",
      `CREATE TABLE IF NOT EXISTS "accounts" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "provider_account_id" TEXT NOT NULL,
        "refresh_token" TEXT,
        "access_token" TEXT,
        "expires_at" INTEGER,
        "token_type" TEXT,
        "scope" TEXT,
        "id_token" TEXT,
        "session_state" TEXT,
        CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
      )`,
    ],
    [
      "index_accounts_provider",
      'CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" ON "accounts"("provider","provider_account_id")',
    ],
    [
      "createTable_sessions",
      `CREATE TABLE IF NOT EXISTS "sessions" (
        "id" TEXT NOT NULL,
        "session_token" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "expires" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
      )`,
    ],
    [
      "index_sessions_token",
      'CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" ON "sessions"("session_token")',
    ],
    [
      "createTable_verification_tokens",
      `CREATE TABLE IF NOT EXISTS "verification_tokens" (
        "identifier" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "expires" TIMESTAMP(3) NOT NULL
      )`,
    ],
    [
      "index_verification_tokens",
      'CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier","token")',
    ],
    [
      "createTable_user_profiles",
      `CREATE TABLE IF NOT EXISTS "user_profiles" (
        "user_id" TEXT NOT NULL,
        "date_of_birth" DATE NOT NULL,
        "biological_sex" "BiologicalSex" NOT NULL,
        "height_cm" DECIMAL(6,2) NOT NULL,
        "weight_kg" DECIMAL(6,2) NOT NULL,
        "body_fat_percent" DECIMAL(4,2),
        "activity_level" "ActivityLevel" NOT NULL,
        "goal" "Goal" NOT NULL,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
      )`,
    ],
    [
      "createTable_foods",
      `CREATE TABLE IF NOT EXISTS "foods" (
        "id" TEXT NOT NULL,
        "source" "FoodSource" NOT NULL,
        "owner_user_id" TEXT,
        "name" TEXT NOT NULL,
        "base_unit" "BaseUnit" NOT NULL,
        "kcal" DECIMAL(10,2) NOT NULL,
        "protein_g" DECIMAL(10,2) NOT NULL,
        "carb_g" DECIMAL(10,2) NOT NULL,
        "fat_g" DECIMAL(10,2) NOT NULL,
        "fiber_g" DECIMAL(10,2) NOT NULL,
        "sodium_mg" DECIMAL(10,2) NOT NULL,
        "deleted_at" TIMESTAMP(3),
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
      )`,
    ],
    [
      "index_foods_source",
      'CREATE INDEX IF NOT EXISTS "foods_source_idx" ON "foods"("source")',
    ],
    [
      "index_foods_owner_name",
      'CREATE UNIQUE INDEX IF NOT EXISTS "foods_owner_user_id_name_key" ON "foods"("owner_user_id","name")',
    ],
    [
      "createTable_meals",
      `CREATE TABLE IF NOT EXISTS "meals" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "meal_date" DATE NOT NULL,
        "meal_time" TIME(0),
        "meal_type" "MealType" NOT NULL,
        "totals_kcal" DECIMAL(10,2) NOT NULL,
        "totals_protein_g" DECIMAL(10,2) NOT NULL,
        "totals_carb_g" DECIMAL(10,2) NOT NULL,
        "totals_fat_g" DECIMAL(10,2) NOT NULL,
        "totals_fiber_g" DECIMAL(10,2) NOT NULL,
        "totals_sodium_mg" DECIMAL(10,2) NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
      )`,
    ],
    [
      "index_meals_user_date",
      'CREATE INDEX IF NOT EXISTS "meals_user_id_meal_date_idx" ON "meals"("user_id","meal_date")',
    ],
    [
      "createTable_meal_items",
      `CREATE TABLE IF NOT EXISTS "meal_items" (
        "id" TEXT NOT NULL,
        "meal_id" TEXT NOT NULL,
        "food_id" TEXT NOT NULL,
        "food_name_snapshot" TEXT NOT NULL,
        "portion_amount" DECIMAL(10,2) NOT NULL,
        "portion_unit" "BaseUnit" NOT NULL,
        "kcal_snapshot" DECIMAL(10,2) NOT NULL,
        "protein_g_snapshot" DECIMAL(10,2) NOT NULL,
        "carb_g_snapshot" DECIMAL(10,2) NOT NULL,
        "fat_g_snapshot" DECIMAL(10,2) NOT NULL,
        "fiber_g_snapshot" DECIMAL(10,2) NOT NULL,
        "sodium_mg_snapshot" DECIMAL(10,2) NOT NULL,
        CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
      )`,
    ],
    [
      "createTable_nutrition_goal_overrides",
      `CREATE TABLE IF NOT EXISTS "nutrition_goal_overrides" (
        "user_id" TEXT NOT NULL,
        "kcal" DECIMAL(10,2) NOT NULL,
        "protein_g" DECIMAL(10,2) NOT NULL,
        "carb_g" DECIMAL(10,2) NOT NULL,
        "fat_g" DECIMAL(10,2) NOT NULL,
        "updated_at" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "nutrition_goal_overrides_pkey" PRIMARY KEY ("user_id")
      )`,
    ],
    [
      "createTable_ai_interactions",
      `CREATE TABLE IF NOT EXISTS "ai_interactions" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "intent" TEXT NOT NULL,
        "redacted_context" JSONB NOT NULL,
        "response" TEXT,
        "provider" TEXT NOT NULL DEFAULT 'deepseek',
        "tokens_prompt" INTEGER,
        "tokens_completion" INTEGER,
        "status" "AiInteractionStatus" NOT NULL,
        "error_message" TEXT,
        CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("id")
      )`,
    ],
    [
      "index_ai_interactions",
      'CREATE INDEX IF NOT EXISTS "ai_interactions_user_id_created_at_idx" ON "ai_interactions"("user_id","created_at")',
    ],
    [
      "createTable_rate_limit_hits",
      `CREATE TABLE IF NOT EXISTS "rate_limit_hits" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "scope" TEXT NOT NULL,
        "hit_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
      )`,
    ],
    [
      "index_rate_limit_hits",
      'CREATE INDEX IF NOT EXISTS "rate_limit_hits_user_id_scope_hit_at_idx" ON "rate_limit_hits"("user_id","scope","hit_at")',
    ],
  ];

  // FKs em pares (drop + add) — $executeRawUnsafe só aceita 1 statement.
  const foreignKeys: Array<[string, string]> = [];
  const fkDefs: Array<{
    table: string;
    name: string;
    column: string;
    refTable: string;
    refColumn: string;
    onDelete: "CASCADE" | "RESTRICT";
  }> = [
    { table: "accounts", name: "accounts_user_id_fkey", column: "user_id", refTable: "users", refColumn: "id", onDelete: "CASCADE" },
    { table: "sessions", name: "sessions_user_id_fkey", column: "user_id", refTable: "users", refColumn: "id", onDelete: "CASCADE" },
    { table: "user_profiles", name: "user_profiles_user_id_fkey", column: "user_id", refTable: "users", refColumn: "id", onDelete: "CASCADE" },
    { table: "foods", name: "foods_owner_user_id_fkey", column: "owner_user_id", refTable: "users", refColumn: "id", onDelete: "CASCADE" },
    { table: "meals", name: "meals_user_id_fkey", column: "user_id", refTable: "users", refColumn: "id", onDelete: "CASCADE" },
    { table: "meal_items", name: "meal_items_meal_id_fkey", column: "meal_id", refTable: "meals", refColumn: "id", onDelete: "CASCADE" },
    { table: "meal_items", name: "meal_items_food_id_fkey", column: "food_id", refTable: "foods", refColumn: "id", onDelete: "RESTRICT" },
    { table: "nutrition_goal_overrides", name: "nutrition_goal_overrides_user_id_fkey", column: "user_id", refTable: "users", refColumn: "id", onDelete: "CASCADE" },
    { table: "ai_interactions", name: "ai_interactions_user_id_fkey", column: "user_id", refTable: "users", refColumn: "id", onDelete: "CASCADE" },
    { table: "rate_limit_hits", name: "rate_limit_hits_user_id_fkey", column: "user_id", refTable: "users", refColumn: "id", onDelete: "CASCADE" },
  ];
  for (const fk of fkDefs) {
    foreignKeys.push([
      `dropFk_${fk.name}`,
      `ALTER TABLE "${fk.table}" DROP CONSTRAINT IF EXISTS "${fk.name}"`,
    ]);
    foreignKeys.push([
      `addFk_${fk.name}`,
      `ALTER TABLE "${fk.table}" ADD CONSTRAINT "${fk.name}" FOREIGN KEY ("${fk.column}") REFERENCES "${fk.refTable}"("${fk.refColumn}") ON DELETE ${fk.onDelete} ON UPDATE CASCADE`,
    ]);
  }

  for (const [name, sql] of [...ddlStatements, ...foreignKeys]) {
    await step(name, async () => prisma.$executeRawUnsafe(sql));
  }

  return NextResponse.json({
    ok: steps.every((s) => s.ok),
    elapsedMs: Date.now() - started,
    steps,
  });
}
