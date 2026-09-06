import { prisma } from "@/server/core/db";
import { ApiError } from "@/server/core/errors";
import { serializeFood } from "@/server/meal-logging/service";
import type { Prisma } from "@prisma/client";

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
  const term = search.trim();

  const where: Prisma.FoodWhereInput = {
    deletedAt: null,
    OR: [{ source: "base" }, { ownerUserId: userId }],
  };

  if (term) {
    where.name = { contains: term, mode: "insensitive" };
  }

  const foods = await prisma.food.findMany({
    where,
    orderBy: [{ source: "desc" }, { name: "asc" }],
    take: limit,
    skip: offset,
  });

  return foods.map(serializeFood);
}

export async function getFoodById(userId: string, id: string) {
  const food = await getAccessibleFood(userId, id);
  return serializeFood(food);
}
