import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { authConfig } from "@/auth.config";
import { prisma } from "@/server/core/db";
import { verifyPassword } from "@/server/user-accounts/security";
import { getConfig } from "@/server/core/config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: getConfig().AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          onboardingCompletedAt: user.onboardingCompletedAt,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, ...rest }) {
      let nextToken = token;
      if (authConfig.callbacks?.jwt) {
        nextToken = (await authConfig.callbacks.jwt({ token, user, ...rest })) ?? token;
      }
      if (nextToken.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: nextToken.id as string },
          select: { onboardingCompletedAt: true, email: true },
        });
        if (dbUser) {
          (nextToken as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt =
            dbUser.onboardingCompletedAt;
          nextToken.email = dbUser.email;
        }
      }
      return nextToken;
    },
  },
});

export async function createDatabaseSession(userId: string): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { sessionToken, userId, expires },
  });
  return sessionToken;
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
