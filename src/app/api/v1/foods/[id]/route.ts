import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { getFoodById } from "@/server/food-catalog/repository";
import { foodCreateSchema } from "@/server/food-catalog/schemas";
import { prisma } from "@/server/core/db";
import { serializeFood } from "@/server/meal-logging/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const food = await getFoodById(user.id, id);
    return jsonOk(food);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const existing = await prisma.food.findFirst({
      where: { id, ownerUserId: user.id, source: "user", deletedAt: null },
    });
    if (!existing) throw new ApiError(404, "Alimento não encontrado");

    const body = await request.json();
    const parsed = foodCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? "Alimento inválido");
    }

    const food = await prisma.food.update({
      where: { id },
      data: {
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

    return jsonOk(serializeFood(food));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const existing = await prisma.food.findFirst({
      where: { id, ownerUserId: user.id, source: "user", deletedAt: null },
    });
    if (!existing) throw new ApiError(404, "Alimento não encontrado");

    await prisma.food.update({ where: { id }, data: { deletedAt: new Date() } });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
