import { describe, it, expect } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { computeItemNutrition, sumTotals } from "@/server/meal-logging/service";

describe("meal-logging service", () => {
  it("computes 150g x 200kcal/100g = 300kcal", () => {
    const result = computeItemNutrition(
      {
        kcal: new Decimal(200),
        proteinG: new Decimal(10),
        carbG: new Decimal(30),
        fatG: new Decimal(5),
        fiberG: new Decimal(2),
        sodiumMg: new Decimal(100),
      },
      150,
    );
    expect(result.kcal).toBe(300);
  });

  it("sums totals", () => {
    const total = sumTotals([
      { kcal: 100, protein_g: 10, carb_g: 20, fat_g: 5, fiber_g: 2, sodium_mg: 50 },
      { kcal: 200, protein_g: 20, carb_g: 30, fat_g: 10, fiber_g: 3, sodium_mg: 100 },
    ]);
    expect(total.kcal).toBe(300);
    expect(total.protein_g).toBe(30);
  });
});
