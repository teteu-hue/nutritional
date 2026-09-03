import { prisma } from "@/server/core/db";
import { getConfig } from "@/server/core/config";
import { ApiError } from "@/server/core/errors";

export type RateLimitResult = {
  allowed: boolean;
  resetAt?: Date;
};

export async function rateLimit(params: {
  userId: string;
  scope: string;
  limit?: number;
  windowMs?: number;
}): Promise<RateLimitResult> {
  const config = getConfig();
  const limit = params.limit ?? config.AI_RATE_LIMIT_PER_HOUR;
  const windowMs = params.windowMs ?? 3_600_000;
  const windowStart = new Date(Date.now() - windowMs);

  const hits = await prisma.rateLimitHit.count({
    where: {
      userId: params.userId,
      scope: params.scope,
      hitAt: { gte: windowStart },
    },
  });

  if (hits >= limit) {
    const oldest = await prisma.rateLimitHit.findFirst({
      where: { userId: params.userId, scope: params.scope, hitAt: { gte: windowStart } },
      orderBy: { hitAt: "asc" },
    });
    const resetAt = oldest ? new Date(oldest.hitAt.getTime() + windowMs) : new Date(Date.now() + windowMs);
    return { allowed: false, resetAt };
  }

  await prisma.rateLimitHit.create({
    data: { userId: params.userId, scope: params.scope },
  });

  return { allowed: true };
}

export function assertRateLimitAllowed(result: RateLimitResult) {
  if (!result.allowed) {
    throw new ApiError(
      429,
      `Limite atingido. Tente novamente após ${result.resetAt?.toISOString() ?? "mais tarde"}`,
      "rate_limit_exceeded",
      { reset_at: result.resetAt?.toISOString() },
    );
  }
}
