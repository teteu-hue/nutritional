import { prisma } from "@/server/core/db";
import { getActiveGoals } from "@/server/nutrition-goals/repository";

export async function buildRedactedContext(userId: string, intent: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new Error("Perfil incompleto");
  }

  const goals = await getActiveGoals(userId);
  const today = new Date().toISOString().slice(0, 10);
  const meals = await prisma.meal.findMany({
    where: { userId, mealDate: new Date(today) },
  });

  const consumedToday = meals.reduce(
    (acc, meal) => ({
      kcal: acc.kcal + Number(meal.totalsKcal),
      protein_g: acc.protein_g + Number(meal.totalsProteinG),
      carb_g: acc.carb_g + Number(meal.totalsCarbG),
      fat_g: acc.fat_g + Number(meal.totalsFatG),
      fiber_g: acc.fiber_g + Number(meal.totalsFiberG),
      sodium_mg: acc.sodium_mg + Number(meal.totalsSodiumMg),
    }),
    { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0 },
  );

  return {
    activeTargets: {
      kcal: goals.kcal,
      protein_g: goals.protein_g,
      carb_g: goals.carb_g,
      fat_g: goals.fat_g,
    },
    consumedToday,
    goal: profile.goal,
    intent,
  };
}
