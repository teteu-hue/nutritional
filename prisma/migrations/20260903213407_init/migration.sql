-- CreateExtension e wrapper imutavel para unaccent.
-- Precisa funcionar em Supabase (extensao geralmente vive em "extensions")
-- e em Postgres padrao (schema "extensions" pode nao existir).
-- Como f_unaccent e LANGUAGE sql, o corpo e resolvido na criacao — entao
-- referencias a "extensions.unaccent" so podem existir quando aquele schema
-- realmente contem a funcao. Detectamos e montamos o corpo com EXECUTE.
DO $$
DECLARE
  target_schema text;
  dict_name text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'unaccent' AND n.nspname = 'extensions'
  ) THEN
    target_schema := 'extensions';
    dict_name := 'extensions.unaccent';
  ELSE
    BEGIN
      CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE 'sem permissao para criar extensao unaccent — assumindo que ja existe';
      WHEN undefined_file THEN
        RAISE NOTICE 'unaccent nao instalavel neste Postgres — f_unaccent sera fallback';
    END;
    target_schema := 'public';
    dict_name := 'public.unaccent';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text ' ||
    'LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $F$ ' ||
    'SELECT %I.unaccent(%L::regdictionary, $1) $F$',
    target_schema,
    dict_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'falha ao configurar unaccent (%): usando fallback lower(text)', SQLERRM;
    EXECUTE 'CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text ' ||
            'LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $F$ SELECT lower($1) $F$';
END $$;

-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('sedentario', 'leve', 'moderado', 'ativo', 'muito_ativo');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('perder_peso', 'manter_peso', 'ganhar_peso');

-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('base', 'user');

-- CreateEnum
CREATE TYPE "BaseUnit" AS ENUM ('100g', '100ml');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('cafe_da_manha', 'almoco', 'jantar', 'lanche');

-- CreateEnum
CREATE TYPE "AiInteractionStatus" AS ENUM ('success', 'error');

-- CreateTable
CREATE TABLE "users" (
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

-- CreateTable
CREATE TABLE "accounts" (
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

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "user_profiles" (
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

-- CreateTable
CREATE TABLE "foods" (
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

-- CreateTable
CREATE TABLE "meals" (
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

-- CreateTable
CREATE TABLE "meal_items" (
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

-- CreateTable
CREATE TABLE "nutrition_goal_overrides" (
    "user_id" TEXT NOT NULL,
    "kcal" DECIMAL(10,2) NOT NULL,
    "protein_g" DECIMAL(10,2) NOT NULL,
    "carb_g" DECIMAL(10,2) NOT NULL,
    "fat_g" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_goal_overrides_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "ai_interactions" (
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

-- CreateTable
CREATE TABLE "rate_limit_hits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "hit_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "foods_source_idx" ON "foods"("source");

-- CreateIndex (functional search index)
CREATE INDEX "foods_name_unaccent_idx" ON "foods" (LOWER(f_unaccent(name)));

-- CreateIndex
CREATE UNIQUE INDEX "foods_owner_user_id_name_key" ON "foods"("owner_user_id", "name");

-- CreateIndex
CREATE INDEX "meals_user_id_meal_date_idx" ON "meals"("user_id", "meal_date");

-- CreateIndex
CREATE INDEX "ai_interactions_user_id_created_at_idx" ON "ai_interactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "rate_limit_hits_user_id_scope_hit_at_idx" ON "rate_limit_hits"("user_id", "scope", "hit_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foods" ADD CONSTRAINT "foods_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_goal_overrides" ADD CONSTRAINT "nutrition_goal_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_limit_hits" ADD CONSTRAINT "rate_limit_hits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
