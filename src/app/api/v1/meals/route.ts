import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { mealCreateSchema } from "@/server/food-catalog/schemas";
import { getAccessibleFood } from "@/server/food-catalog/repository";
import { computeItemNutrition, sumTotals } from "@/server/meal-logging/service";
import { prisma } from "@/server/core/db";
import type { MealType } from "@prisma/client";

import type { Meal, MealItem } from "@prisma/client";

type MealWithItems = Meal & { items: MealItem[] };

function serializeMeal(meal: MealWithItems) {
  return {
    id: meal.id,
    meal_date: meal.mealDate.toISOString().slice(0, 10),
    meal_time: meal.mealTime ? meal.mealTime.toISOString().slice(11, 19) : null,
    meal_type: meal.mealType,
    totals: {
      kcal: Number(meal.totalsKcal),
      protein_g: Number(meal.totalsProteinG),
      carb_g: Number(meal.totalsCarbG),
      fat_g: Number(meal.totalsFatG),
      fiber_g: Number(meal.totalsFiberG),
      sodium_mg: Number(meal.totalsSodiumMg),
    },
    items: meal.items.map((item) => ({
      id: item.id,
      food_id: item.foodId,
      food_name: item.foodNameSnapshot,
      portion_amount: Number(item.portionAmount),
      portion_unit: item.portionUnit,
      kcal: Number(item.kcalSnapshot),
      protein_g: Number(item.proteinGSnapshot),
      carb_g: Number(item.carbGSnapshot),
      fat_g: Number(item.fatGSnapshot),
      fiber_g: Number(item.fiberGSnapshot),
      sodium_mg: Number(item.sodiumMgSnapshot),
    })),
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) throw new ApiError(400, "Parâmetro date é obrigatório");

    const meals = await prisma.meal.findMany({
      where: { userId: user.id, mealDate: new Date(date) },
      include: { items: true },
      orderBy: [{ mealTime: "asc" }, { createdAt: "asc" }],
    });

    return jsonOk({ items: meals.map((m) => serializeMeal(m)) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const parsed = mealCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Refeição inválida");
    }

    const itemSnapshots = [];
    for (const item of parsed.data.items) {
      const food = await getAccessibleFood(user.id, item.food_id);
      const nutrition = computeItemNutrition(food, item.portion_amount);
      itemSnapshots.push({ food, item, nutrition });
    }

    const totals = sumTotals(itemSnapshots.map((s) => s.nutrition));

    const meal = await prisma.meal.create({
      data: {
        userId: user.id,
        mealDate: new Date(parsed.data.meal_date),
        mealTime: parsed.data.meal_time
          ? new Date(`1970-01-01T${parsed.data.meal_time}`)
          : null,
        mealType: parsed.data.meal_type as MealType,
        totalsKcal: totals.kcal,
        totalsProteinG: totals.protein_g,
        totalsCarbG: totals.carb_g,
        totalsFatG: totals.fat_g,
        totalsFiberG: totals.fiber_g,
        totalsSodiumMg: totals.sodium_mg,
        items: {
          create: itemSnapshots.map(({ food, item, nutrition }) => ({
            foodId: food.id,
            foodNameSnapshot: food.name,
            portionAmount: item.portion_amount,
            portionUnit: item.portion_unit,
            kcalSnapshot: nutrition.kcal,
            proteinGSnapshot: nutrition.protein_g,
            carbGSnapshot: nutrition.carb_g,
            fatGSnapshot: nutrition.fat_g,
            fiberGSnapshot: nutrition.fiber_g,
            sodiumMgSnapshot: nutrition.sodium_mg,
          })),
        },
      },
      include: { items: true },
    });

    return jsonOk(serializeMeal(meal), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
