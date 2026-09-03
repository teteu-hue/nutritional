import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { mealItemSchema } from "@/server/food-catalog/schemas";
import { getAccessibleFood } from "@/server/food-catalog/repository";
import { computeItemNutrition, sumTotals } from "@/server/meal-logging/service";
import { prisma } from "@/server/core/db";

type Params = { params: Promise<{ id: string }> };

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

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id: mealId } = await params;
    const meal = await prisma.meal.findFirst({ where: { id: mealId, userId: user.id } });
    if (!meal) throw new ApiError(404, "Refeição não encontrada");

    const body = await request.json();
    const parsed = mealItemSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Item inválido");

    const food = await getAccessibleFood(user.id, parsed.data.food_id);
    const nutrition = computeItemNutrition(food, parsed.data.portion_amount);

    await prisma.$transaction(async (tx) => {
      await tx.mealItem.create({
        data: {
          mealId,
          foodId: food.id,
          foodNameSnapshot: food.name,
          portionAmount: parsed.data.portion_amount,
          portionUnit: parsed.data.portion_unit,
          kcalSnapshot: nutrition.kcal,
          proteinGSnapshot: nutrition.protein_g,
          carbGSnapshot: nutrition.carb_g,
          fatGSnapshot: nutrition.fat_g,
          fiberGSnapshot: nutrition.fiber_g,
          sodiumMgSnapshot: nutrition.sodium_mg,
        },
      });
    });
    await recomputeMealTotals(mealId);

    return jsonOk({ ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
