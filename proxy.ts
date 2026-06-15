import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  // Outside production the auth gate is disabled so the app can be used without
  // logging in (matches the stub session in lib/auth). NODE_ENV=production
  // restores the real check.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  // Optimistic check: only looks for the presence of the session cookie.
  // The (app) layout re-validates the session on the server for real.
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except the sign-in page, the auth API, Next internals,
  // and static files (anything with a file extension).
  matcher: ["/((?!sign-in|api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
