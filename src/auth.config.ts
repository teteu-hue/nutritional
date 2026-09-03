import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.email = user.email!;
        (token as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt =
          (user as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.onboardingCompletedAt =
        ((token as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt as Date | null) ??
        null;
      return session;
    },
  },
  providers: [],
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      onboardingCompletedAt: Date | null;
    };
  }

  interface User {
    onboardingCompletedAt?: Date | null;
  }
}
