import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// better-auth session cookie (default: better-auth.session_token or chunked)
function hasSession(request: NextRequest): boolean {
  const cookie = request.cookies.get("better-auth.session_token");
  if (cookie?.value) return true;
  // Chunked cookies: better-auth.session_token.0, .1, etc.
  const all = request.cookies.getAll();
  return all.some((c) => c.name.startsWith("better-auth.session_token"));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Don't redirect / to /portal here—cookie can be stale (banned/revoked).
  // The login page uses useSession and redirects only when session is valid.

  // Protected portal routes (except change-password)
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
