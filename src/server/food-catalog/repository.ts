import { prisma } from "@/server/core/db";
import { ApiError } from "@/server/core/errors";
import { serializeFood } from "@/server/meal-logging/service";

export async function getAccessibleFood(userId: string, foodId: string) {
  const food = await prisma.food.findFirst({
    where: {
      id: foodId,
      deletedAt: null,
      OR: [{ source: "base" }, { ownerUserId: userId }],
    },
  });
  if (!food) throw new ApiError(404, "Alimento não encontrado");
  return food;
}

export async function searchFoods(userId: string, search: string, page: number, pageSize: number) {
  const limit = Math.min(pageSize, 50);
  const offset = (page - 1) * limit;
  const term = `%${search.trim()}%`;

  const foods = await prisma.$queryRaw<
    Array<{
      id: string;
      source: string;
      name: string;
      base_unit: string;
      kcal: number;
      protein_g: number;
      carb_g: number;
      fat_g: number;
      fiber_g: number;
      sodium_mg: number;
    }>
  >`
    SELECT f.id, f.source, f.name, f.base_unit, f.kcal, f.protein_g, f.carb_g, f.fat_g, f.fiber_g, f.sodium_mg
    FROM foods f
    WHERE f.deleted_at IS NULL
      AND (f.source = 'base' OR f.owner_user_id = ${userId})
      AND LOWER(f_unaccent(f.name)) LIKE LOWER(f_unaccent(${term}))
    ORDER BY f.name ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return foods.map((f) => ({
    id: f.id,
    source: f.source,
    name: f.name,
    base_unit: f.base_unit,
    kcal: Number(f.kcal),
    protein_g: Number(f.protein_g),
    carb_g: Number(f.carb_g),
    fat_g: Number(f.fat_g),
    fiber_g: Number(f.fiber_g),
    sodium_mg: Number(f.sodium_mg),
  }));
}

export async function getFoodById(userId: string, id: string) {
  const food = await getAccessibleFood(userId, id);
  return serializeFood(food);
}
