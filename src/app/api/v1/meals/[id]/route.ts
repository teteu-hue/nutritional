import { requireUser } from "@/server/core/auth";
import { jsonError, jsonOk, ApiError } from "@/server/core/errors";
import { prisma } from "@/server/core/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const meal = await prisma.meal.findFirst({
      where: { id, userId: user.id },
      include: { items: true },
    });
    if (!meal) throw new ApiError(404, "Refeição não encontrada");

    return jsonOk({
      id: meal.id,
      meal_date: meal.mealDate.toISOString().slice(0, 10),
      meal_type: meal.mealType,
      totals: {
        kcal: Number(meal.totalsKcal),
        protein_g: Number(meal.totalsProteinG),
        carb_g: Number(meal.totalsCarbG),
        fat_g: Number(meal.totalsFatG),
      },
      items: meal.items,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const meal = await prisma.meal.findFirst({ where: { id, userId: user.id } });
    if (!meal) throw new ApiError(404, "Refeição não encontrada");
    await prisma.meal.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
