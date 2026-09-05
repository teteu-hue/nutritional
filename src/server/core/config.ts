import { normalizeDatabaseEnv } from "@/server/core/env";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  POSTGRES_URL: z.string().optional(),
  POSTGRES_URL_NON_POOLING: z.string().optional(),
  AUTH_SECRET: z.string().min(16),
  AUTH_URL: z.string().url().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  AI_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(20),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cached) {
    normalizeDatabaseEnv();
    cached = envSchema.parse(process.env);
  }
  return cached;
}

export function hasDeepSeekKey(): boolean {
  const key = process.env.DEEPSEEK_API_KEY;
  return Boolean(key && key.length > 0);
}
