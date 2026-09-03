import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { goalsOverrideSchema } from "@/server/food-catalog/schemas";
import { validateOverrideConsistency } from "@/server/nutrition-goals/service";
import { prisma } from "@/server/core/db";

export async function PUT(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const parsed = goalsOverrideSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Override inválido");
    }

    const { kcal, protein_g, carb_g, fat_g } = parsed.data;
    if (!validateOverrideConsistency(kcal, protein_g, carb_g, fat_g)) {
      throw new ApiError(
        400,
        "A soma dos macros deve estar dentro de 5% do total de calorias informado",
      );
    }

    const override = await prisma.nutritionGoalOverride.upsert({
      where: { userId: user.id },
      create: { userId: user.id, kcal, proteinG: protein_g, carbG: carb_g, fatG: fat_g },
      update: { kcal, proteinG: protein_g, carbG: carb_g, fatG: fat_g },
    });

    return jsonOk({
      origin: "manual",
      kcal: Number(override.kcal),
      protein_g: Number(override.proteinG),
      carb_g: Number(override.carbG),
      fat_g: Number(override.fatG),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    await prisma.nutritionGoalOverride.deleteMany({ where: { userId: user.id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
