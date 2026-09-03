import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { prisma } from "@/server/core/db";
import { computeItemNutrition, sumTotals } from "@/server/meal-logging/service";
import { z } from "zod";

type Params = { params: Promise<{ id: string; itemId: string }> };

const updateItemSchema = z.object({
  portion_amount: z.coerce.number().positive(),
});

async function recomputeMealTotals(mealId: string) {
  const items = await prisma.mealItem.findMany({ where: { mealId } });
  const totals = sumTotals(
    items.map((i) => ({
      kcal: Number(i.kcalSnapshot),
      protein_g: Number(i.proteinGSnapshot),
      carb_g: Number(i.carbGSnapshot),
      fat_g: Number(i.fatGSnapshot),
      fiber_g: Number(i.fiberGSnapshot),
      sodium_mg: Number(i.sodiumMgSnapshot),
    })),
  );
  await prisma.meal.update({
    where: { id: mealId },
    data: {
      totalsKcal: totals.kcal,
      totalsProteinG: totals.protein_g,
      totalsCarbG: totals.carb_g,
      totalsFatG: totals.fat_g,
      totalsFiberG: totals.fiber_g,
      totalsSodiumMg: totals.sodium_mg,
    },
  });
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id: mealId, itemId } = await params;
    const meal = await prisma.meal.findFirst({ where: { id: mealId, userId: user.id }, include: { items: true } });
    if (!meal) throw new ApiError(404, "Refeição não encontrada");
    const item = meal.items.find((i) => i.id === itemId);
    if (!item) throw new ApiError(404, "Item não encontrado");

    const body = await request.json();
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Porção inválida");

    const food = await prisma.food.findUnique({ where: { id: item.foodId } });
    if (!food) throw new ApiError(404, "Alimento não encontrado");

    const nutrition = computeItemNutrition(food, parsed.data.portion_amount);
    await prisma.mealItem.update({
      where: { id: itemId },
      data: {
        portionAmount: parsed.data.portion_amount,
        kcalSnapshot: nutrition.kcal,
        proteinGSnapshot: nutrition.protein_g,
        carbGSnapshot: nutrition.carb_g,
        fatGSnapshot: nutrition.fat_g,
        fiberGSnapshot: nutrition.fiber_g,
        sodiumMgSnapshot: nutrition.sodium_mg,
      },
    });
    await recomputeMealTotals(mealId);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id: mealId, itemId } = await params;
    const meal = await prisma.meal.findFirst({ where: { id: mealId, userId: user.id } });
    if (!meal) throw new ApiError(404, "Refeição não encontrada");

    const item = await prisma.mealItem.findFirst({ where: { id: itemId, mealId } });
    if (!item) throw new ApiError(404, "Item não encontrado");

    await prisma.mealItem.delete({ where: { id: itemId } });
    await recomputeMealTotals(mealId);
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
