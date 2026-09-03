import { prisma } from "@/server/core/db";
import { computeDailyTargets } from "@/server/nutrition-goals/service";
import { ApiError } from "@/server/core/errors";

export async function getActiveGoals(userId: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new ApiError(422, "Complete seu perfil nutricional antes de consultar metas");
  }

  const override = await prisma.nutritionGoalOverride.findUnique({ where: { userId } });
  if (override) {
    return {
      origin: "manual" as const,
      kcal: Number(override.kcal),
      protein_g: Number(override.proteinG),
      carb_g: Number(override.carbG),
      fat_g: Number(override.fatG),
    };
  }

  const targets = computeDailyTargets(profile);
  return { origin: "auto" as const, ...targets };
}
