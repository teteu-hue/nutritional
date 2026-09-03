import { prisma } from "@/server/core/db";
import { getActiveGoals } from "@/server/nutrition-goals/repository";
import { ApiError } from "@/server/core/errors";

export async function getDailyDashboard(userId: string, dateStr: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  const mealDate = new Date(dateStr);

  const meals = await prisma.meal.findMany({
    where: { userId, mealDate },
    include: { items: true },
    orderBy: [{ mealTime: "asc" }, { createdAt: "asc" }],
  });

  const consumed = meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + Number(m.totalsKcal),
      protein_g: acc.protein_g + Number(m.totalsProteinG),
      carb_g: acc.carb_g + Number(m.totalsCarbG),
      fat_g: acc.fat_g + Number(m.totalsFatG),
      fiber_g: acc.fiber_g + Number(m.totalsFiberG),
      sodium_mg: acc.sodium_mg + Number(m.totalsSodiumMg),
    }),
    { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0 },
  );

  let targets = null;
  if (profile) {
    try {
      targets = await getActiveGoals(userId);
    } catch {
      targets = null;
    }
  }

  return { date: dateStr, consumed, targets, meals_count: meals.length };
}

export async function getWeeklyDashboard(userId: string, isoWeek: string) {
  const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new ApiError(400, "Formato iso_week inválido. Use YYYY-Www");

  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const weekStart = new Date(jan4);
  weekStart.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);

  const days: Array<{ date: string; consumed: Awaited<ReturnType<typeof getDailyDashboard>>["consumed"] }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const daily = await getDailyDashboard(userId, dateStr);
    days.push({ date: dateStr, consumed: daily.consumed });
  }

  const nonEmpty = days.filter((d) => d.consumed.kcal > 0);
  const avg =
    nonEmpty.length > 0
      ? {
          kcal: nonEmpty.reduce((s, d) => s + d.consumed.kcal, 0) / nonEmpty.length,
          protein_g: nonEmpty.reduce((s, d) => s + d.consumed.protein_g, 0) / nonEmpty.length,
          carb_g: nonEmpty.reduce((s, d) => s + d.consumed.carb_g, 0) / nonEmpty.length,
          fat_g: nonEmpty.reduce((s, d) => s + d.consumed.fat_g, 0) / nonEmpty.length,
        }
      : null;

  return { iso_week: isoWeek, days, average: avg };
}
