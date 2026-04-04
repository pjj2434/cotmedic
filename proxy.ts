import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// better-auth session cookie (default: better-auth.session_token or chunked)
function hasSession(request: NextRequest): boolean {
  // Standard and secure-prefixed session cookies
  const directNames = [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
  ];
  for (const name of directNames) {
    const cookie = request.cookies.get(name);
    if (cookie?.value) return true;
  }

  // Chunked cookies (and secure-prefixed chunked variants):
  // better-auth.session_token.0, __Secure-better-auth.session_token.0, etc.
  const all = request.cookies.getAll();
  return all.some(
    (c) =>
      c.name.startsWith("better-auth.session_token") ||
      c.name.startsWith("__Secure-better-auth.session_token")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Don't redirect / to /portal here—cookie can be stale (banned/revoked).
  // The login page uses useSession and redirects only when session is valid.

  // Protected portal routes (legacy /portal/change-password redirects without extra guard)
  if (pathname.startsWith("/portal") && !pathname.startsWith("/portal/change-password")) {
    if (!hasSession(request)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*"],
};
