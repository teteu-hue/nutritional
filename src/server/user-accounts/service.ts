import { prisma } from "@/server/core/db";
import { hashPassword } from "@/server/user-accounts/security";
import type { ProfileInput } from "@/server/user-accounts/schemas";
import { ApiError } from "@/server/core/errors";
import type { ActivityLevel, BiologicalSex, Goal } from "@prisma/client";

export async function createUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "Este e-mail já está em uso");
  }
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: { email, passwordHash },
  });
}

export async function upsertProfile(userId: string, input: ProfileInput) {
  const dateOfBirth = new Date(input.date_of_birth);
  const profileData = {
    dateOfBirth,
    biologicalSex: input.biological_sex as BiologicalSex,
    heightCm: input.height_cm,
    weightKg: input.weight_kg,
    bodyFatPercent: input.body_fat_percent ?? null,
    activityLevel: input.activity_level as ActivityLevel,
    goal: input.goal as Goal,
  };

  return prisma.$transaction(async (tx) => {
    const profile = await tx.userProfile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    });

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (user && !user.onboardingCompletedAt) {
      await tx.user.update({
        where: { id: userId },
        data: { onboardingCompletedAt: new Date() },
      });
    }

    return profile;
  });
}

export async function getProfile(userId: string) {
  return prisma.userProfile.findUnique({ where: { userId } });
}

export function serializeProfile(profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>) {
  return {
    date_of_birth: profile.dateOfBirth.toISOString().slice(0, 10),
    biological_sex: profile.biologicalSex,
    height_cm: Number(profile.heightCm),
    weight_kg: Number(profile.weightKg),
    body_fat_percent: profile.bodyFatPercent ? Number(profile.bodyFatPercent) : null,
    activity_level: profile.activityLevel,
    goal: profile.goal,
    updated_at: profile.updatedAt.toISOString(),
  };
}
