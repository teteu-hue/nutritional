import Decimal from "decimal.js";
import type { Food } from "@prisma/client";

export type NutritionTotals = {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
};

export function computeItemNutrition(
  food: Pick<Food, "kcal" | "proteinG" | "carbG" | "fatG" | "fiberG" | "sodiumMg">,
  portionAmount: number,
): NutritionTotals {
  const factor = new Decimal(portionAmount).div(100);
  return {
    kcal: new Decimal(food.kcal.toString()).times(factor).toDecimalPlaces(1).toNumber(),
    protein_g: new Decimal(food.proteinG.toString()).times(factor).toDecimalPlaces(2).toNumber(),
    carb_g: new Decimal(food.carbG.toString()).times(factor).toDecimalPlaces(2).toNumber(),
    fat_g: new Decimal(food.fatG.toString()).times(factor).toDecimalPlaces(2).toNumber(),
    fiber_g: new Decimal(food.fiberG.toString()).times(factor).toDecimalPlaces(2).toNumber(),
    sodium_mg: new Decimal(food.sodiumMg.toString()).times(factor).toDecimalPlaces(2).toNumber(),
  };
}

export function sumTotals(items: NutritionTotals[]): NutritionTotals {
  return items.reduce(
    (acc, item) => ({
      kcal: new Decimal(acc.kcal).plus(item.kcal).toDecimalPlaces(1).toNumber(),
      protein_g: new Decimal(acc.protein_g).plus(item.protein_g).toDecimalPlaces(2).toNumber(),
      carb_g: new Decimal(acc.carb_g).plus(item.carb_g).toDecimalPlaces(2).toNumber(),
      fat_g: new Decimal(acc.fat_g).plus(item.fat_g).toDecimalPlaces(2).toNumber(),
      fiber_g: new Decimal(acc.fiber_g).plus(item.fiber_g).toDecimalPlaces(2).toNumber(),
      sodium_mg: new Decimal(acc.sodium_mg).plus(item.sodium_mg).toDecimalPlaces(2).toNumber(),
    }),
    { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0 },
  );
}

export function serializeFood(food: Food) {
  return {
    id: food.id,
    source: food.source,
    name: food.name,
    base_unit: food.baseUnit,
    kcal: Number(food.kcal),
    protein_g: Number(food.proteinG),
    carb_g: Number(food.carbG),
    fat_g: Number(food.fatG),
    fiber_g: Number(food.fiberG),
    sodium_mg: Number(food.sodiumMg),
  };
}
