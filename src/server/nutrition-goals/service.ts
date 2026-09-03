import Decimal from "decimal.js";
import type { ActivityLevel, Goal, UserProfile } from "@prisma/client";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  ativo: 1.725,
  muito_ativo: 1.9,
};

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  perder_peso: -0.15,
  manter_peso: 0,
  ganhar_peso: 0.1,
};

export type DailyTargets = {
  kcal: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

function ageFromBirthDate(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

export function computeDailyTargets(profile: UserProfile): DailyTargets {
  const weight = new Decimal(profile.weightKg.toString());
  const height = new Decimal(profile.heightCm.toString());
  const age = ageFromBirthDate(profile.dateOfBirth);

  let bmr: Decimal;
  if (profile.biologicalSex === "male") {
    bmr = new Decimal(10).times(weight).plus(new Decimal(6.25).times(height)).minus(new Decimal(5).times(age)).plus(5);
  } else {
    bmr = new Decimal(10).times(weight).plus(new Decimal(6.25).times(height)).minus(new Decimal(5).times(age)).minus(161);
  }

  const activityFactor = ACTIVITY_FACTORS[profile.activityLevel];
  const goalAdj = GOAL_ADJUSTMENTS[profile.goal];
  const tdee = bmr.times(activityFactor).times(1 + goalAdj);
  const kcal = tdee.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  const proteinKcal = kcal * 0.3;
  const carbKcal = kcal * 0.4;
  const fatKcal = kcal * 0.3;

  return {
    kcal,
    protein_g: new Decimal(proteinKcal).div(4).toDecimalPlaces(2).toNumber(),
    carb_g: new Decimal(carbKcal).div(4).toDecimalPlaces(2).toNumber(),
    fat_g: new Decimal(fatKcal).div(9).toDecimalPlaces(2).toNumber(),
  };
}

export function validateOverrideConsistency(
  kcal: number,
  proteinG: number,
  carbG: number,
  fatG: number,
): boolean {
  const computed = proteinG * 4 + carbG * 4 + fatG * 9;
  const diff = Math.abs(computed - kcal);
  return diff <= kcal * 0.05;
}
