import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { searchFoods } from "@/server/food-catalog/repository";
import { foodCreateSchema } from "@/server/food-catalog/schemas";
import { prisma } from "@/server/core/db";
import { serializeFood } from "@/server/meal-logging/service";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "20");

    const foods = await searchFoods(user.id, search, page, pageSize);
    return jsonOk({ items: foods, page, pageSize });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const parsed = foodCreateSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new ApiError(400, issue?.message ?? "Alimento inválido");
    }

    const food = await prisma.food.create({
      data: {
        source: "user",
        ownerUserId: user.id,
        name: parsed.data.name,
        baseUnit: parsed.data.base_unit,
        kcal: parsed.data.kcal,
        proteinG: parsed.data.protein_g,
        carbG: parsed.data.carb_g,
        fatG: parsed.data.fat_g,
        fiberG: parsed.data.fiber_g,
        sodiumMg: parsed.data.sodium_mg,
      },
    });

    return jsonOk(serializeFood(food), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
