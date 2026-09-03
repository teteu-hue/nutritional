import { PrismaClient, FoodSource, BaseUnit } from "@prisma/client";

const prisma = new PrismaClient();

const SAMPLE_FOODS = [
  { name: "Arroz, branco, cozido", kcal: 128, protein_g: 2.5, carb_g: 28.1, fat_g: 0.2, fiber_g: 1.6, sodium_mg: 1 },
  { name: "Feijão, carioca, cozido", kcal: 76, protein_g: 4.8, carb_g: 13.6, fat_g: 0.5, fiber_g: 8.5, sodium_mg: 2 },
  { name: "Frango, peito, grelhado", kcal: 159, protein_g: 32, carb_g: 0, fat_g: 2.5, fiber_g: 0, sodium_mg: 50 },
  { name: "Ovo, de galinha, cozido", kcal: 146, protein_g: 13.3, carb_g: 0.6, fat_g: 9.5, fiber_g: 0, sodium_mg: 140 },
  { name: "Banana, prata", kcal: 98, protein_g: 1.3, carb_g: 26, fat_g: 0.1, fiber_g: 2.6, sodium_mg: 0 },
  { name: "Açaí, polpa", kcal: 58, protein_g: 0.8, carb_g: 6.2, fat_g: 3.9, fiber_g: 2.6, sodium_mg: 4 },
  { name: "Batata, inglesa, cozida", kcal: 52, protein_g: 1.2, carb_g: 11.9, fat_g: 0, fiber_g: 1.3, sodium_mg: 2 },
  { name: "Leite, integral", kcal: 61, protein_g: 3.1, carb_g: 4.7, fat_g: 3.3, fiber_g: 0, sodium_mg: 50 },
];

async function main() {
  for (const food of SAMPLE_FOODS) {
    const existing = await prisma.food.findFirst({
      where: { source: FoodSource.base, name: food.name },
    });
    if (existing) {
      await prisma.food.update({
        where: { id: existing.id },
        data: {
          kcal: food.kcal,
          proteinG: food.protein_g,
          carbG: food.carb_g,
          fatG: food.fat_g,
          fiberG: food.fiber_g,
          sodiumMg: food.sodium_mg,
        },
      });
    } else {
      await prisma.food.create({
        data: {
          source: FoodSource.base,
          name: food.name,
          baseUnit: BaseUnit.g100,
          kcal: food.kcal,
          proteinG: food.protein_g,
          carbG: food.carb_g,
          fatG: food.fat_g,
          fiberG: food.fiber_g,
          sodiumMg: food.sodium_mg,
        },
      });
    }
  }

  const count = await prisma.food.count({ where: { source: FoodSource.base } });
  console.log(`Seed concluído: ${count} alimentos base`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
