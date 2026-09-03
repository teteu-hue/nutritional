import { auth, createDatabaseSession } from "@/auth";
import { prisma } from "@/server/core/db";
import { ApiError } from "@/server/core/errors";
import type { Session } from "next-auth";

export type AuthUser = {
  id: string;
  email: string;
  onboardingCompletedAt: Date | null;
};

export type RequireUserOptions = {
  allowIncompleteOnboarding?: boolean;
};

async function resolveBearerSession(token: string): Promise<AuthUser | null> {
  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    include: { user: true },
  });
  if (!session || session.expires < new Date()) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    onboardingCompletedAt: session.user.onboardingCompletedAt,
  };
}

export async function requireUser(
  request?: Request,
  options: RequireUserOptions = {},
): Promise<AuthUser> {
  let user: AuthUser | null = null;

  const authHeader = request?.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (!token) throw new ApiError(401, "Credenciais inválidas");
    user = await resolveBearerSession(token);
    if (!user) throw new ApiError(401, "Sessão inválida ou expirada");
  } else {
    const session = (await auth()) as Session | null;
    if (!session?.user?.id) {
      throw new ApiError(401, "Sessão inválida ou expirada");
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompletedAt: true, email: true },
    });
    user = {
      id: session.user.id,
      email: dbUser?.email ?? session.user.email,
      onboardingCompletedAt: dbUser?.onboardingCompletedAt ?? null,
    };
  }

  if (
    !options.allowIncompleteOnboarding &&
    !user.onboardingCompletedAt &&
    request
  ) {
    const url = new URL(request.url);
    const isProfileRoute = url.pathname.startsWith("/api/v1/profile");
    const isAuthRoute = url.pathname.startsWith("/api/v1/auth");
    if (!isProfileRoute && !isAuthRoute) {
      throw new ApiError(409, "Complete o onboarding antes de continuar", "onboarding_required");
    }
  }

  return user;
}

export { createDatabaseSession };
