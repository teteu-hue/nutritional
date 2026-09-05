-- Bootstrap idempotente do schema Nutritional.
--
-- Executado a partir do vercel-build.js via `prisma db execute --file`
-- para garantir que as tabelas existem em Neon/Supabase antes do runtime.
--
-- E idempotente (usa IF NOT EXISTS, DROP + ADD para constraints, etc).
-- Deve ser seguro rodar em cima de banco vazio OU em cima de schema ja
-- existente sem perder dados.

-- 1) Remove qualquer migration marcada como failed no Prisma
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
  ) THEN
    DELETE FROM _prisma_migrations
    WHERE finished_at IS NULL AND rolled_back_at IS NULL;
  END IF;
END $$;

-- 2) Enums (idempotente)
DO $$ BEGIN CREATE TYPE "BiologicalSex" AS ENUM ('male','female'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ActivityLevel" AS ENUM ('sedentario','leve','moderado','ativo','muito_ativo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Goal" AS ENUM ('perder_peso','manter_peso','ganhar_peso'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FoodSource" AS ENUM ('base','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BaseUnit" AS ENUM ('100g','100ml'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MealType" AS ENUM ('cafe_da_manha','almoco','jantar','lanche'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AiInteractionStatus" AS ENUM ('success','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tabelas
CREATE TABLE IF NOT EXISTS "users" (
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
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "accounts" (
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
);
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" ON "accounts"("provider","provider_account_id");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "session_token" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" ON "sessions"("session_token");

CREATE TABLE IF NOT EXISTS "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier","token");

CREATE TABLE IF NOT EXISTS "user_profiles" (
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
);

CREATE TABLE IF NOT EXISTS "foods" (
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
);
CREATE INDEX IF NOT EXISTS "foods_source_idx" ON "foods"("source");
CREATE UNIQUE INDEX IF NOT EXISTS "foods_owner_user_id_name_key" ON "foods"("owner_user_id","name");

CREATE TABLE IF NOT EXISTS "meals" (
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
);
CREATE INDEX IF NOT EXISTS "meals_user_id_meal_date_idx" ON "meals"("user_id","meal_date");

CREATE TABLE IF NOT EXISTS "meal_items" (
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
);

CREATE TABLE IF NOT EXISTS "nutrition_goal_overrides" (
  "user_id" TEXT NOT NULL,
  "kcal" DECIMAL(10,2) NOT NULL,
  "protein_g" DECIMAL(10,2) NOT NULL,
  "carb_g" DECIMAL(10,2) NOT NULL,
  "fat_g" DECIMAL(10,2) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nutrition_goal_overrides_pkey" PRIMARY KEY ("user_id")
);

CREATE TABLE IF NOT EXISTS "ai_interactions" (
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
);
CREATE INDEX IF NOT EXISTS "ai_interactions_user_id_created_at_idx" ON "ai_interactions"("user_id","created_at");

CREATE TABLE IF NOT EXISTS "rate_limit_hits" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "hit_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "rate_limit_hits_user_id_scope_hit_at_idx" ON "rate_limit_hits"("user_id","scope","hit_at");

-- 4) Foreign keys (DROP + ADD para ser idempotente)
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_user_id_fkey";
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_fkey";
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_user_id_fkey";
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "foods" DROP CONSTRAINT IF EXISTS "foods_owner_user_id_fkey";
ALTER TABLE "foods" ADD CONSTRAINT "foods_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meals" DROP CONSTRAINT IF EXISTS "meals_user_id_fkey";
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_items" DROP CONSTRAINT IF EXISTS "meal_items_meal_id_fkey";
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meal_items" DROP CONSTRAINT IF EXISTS "meal_items_food_id_fkey";
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nutrition_goal_overrides" DROP CONSTRAINT IF EXISTS "nutrition_goal_overrides_user_id_fkey";
ALTER TABLE "nutrition_goal_overrides" ADD CONSTRAINT "nutrition_goal_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_interactions" DROP CONSTRAINT IF EXISTS "ai_interactions_user_id_fkey";
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rate_limit_hits" DROP CONSTRAINT IF EXISTS "rate_limit_hits_user_id_fkey";
ALTER TABLE "rate_limit_hits" ADD CONSTRAINT "rate_limit_hits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
