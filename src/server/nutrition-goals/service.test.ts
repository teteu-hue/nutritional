import { describe, it, expect } from "vitest";
import { computeDailyTargets } from "@/server/nutrition-goals/service";
import type { UserProfile } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const baseProfile: UserProfile = {
  userId: "u1",
  dateOfBirth: new Date("1990-01-15"),
  biologicalSex: "male",
  heightCm: new Decimal(175),
  weightKg: new Decimal(75),
  bodyFatPercent: null,
  activityLevel: "moderado",
  goal: "manter_peso",
  updatedAt: new Date(),
};

describe("computeDailyTargets", () => {
  it("computes targets for moderado + manter", () => {
    const targets = computeDailyTargets(baseProfile);
    expect(targets.kcal).toBeGreaterThan(1500);
    expect(targets.protein_g).toBeGreaterThan(0);
  });

  it("adjusts for perder_peso", () => {
    const lose = computeDailyTargets({ ...baseProfile, goal: "perder_peso" });
    const maintain = computeDailyTargets({ ...baseProfile, goal: "manter_peso" });
    expect(lose.kcal).toBeLessThan(maintain.kcal);
  });

  it("adjusts for ganhar_peso", () => {
    const gain = computeDailyTargets({ ...baseProfile, goal: "ganhar_peso" });
    const maintain = computeDailyTargets({ ...baseProfile, goal: "manter_peso" });
    expect(gain.kcal).toBeGreaterThan(maintain.kcal);
  });
});
