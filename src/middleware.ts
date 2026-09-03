import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const APP_ROUTES = ["/dashboard", "/foods", "/meals", "/goals", "/assistant", "/onboarding"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isAppRoute = APP_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthPage && session?.user) {
    const dest = (session.user as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt
      ? "/dashboard"
      : "/onboarding";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (isAppRoute && !session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (
    session?.user &&
    !(session.user as { onboardingCompletedAt?: Date | null }).onboardingCompletedAt &&
    isAppRoute &&
    !pathname.startsWith("/onboarding")
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/foods/:path*",
    "/meals/:path*",
    "/goals/:path*",
    "/assistant/:path*",
    "/onboarding/:path*",
    "/login",
    "/signup",
  ],
};
