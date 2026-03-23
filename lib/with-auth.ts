import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export type Role = "owner" | "technician" | "client";

export type WithAuthOptions = {
  /** If provided, user must have one of these roles. Otherwise redirects to /portal */
  roles?: Role[];
  /** Where to redirect unauthenticated users. Default: "/" */
  signInUrl?: string;
  /** Where to redirect unauthorized (wrong role) users. Default: "/portal" */
  unauthorizedUrl?: string;
};

/**
 * Server-side auth helper for page components.
 * Ensures user is signed in and optionally has one of the allowed roles.
 *
 * @example
 * // Any authenticated user
 * const { session, user } = await withAuth();
 *
 * @example
 * // Owner only
 * const { session, user } = await withAuth({ roles: ["owner"] });
 *
 * @example
 * // Owner or technician
 * const { session, user } = await withAuth({ roles: ["owner", "technician"] });
 */
export async function withAuth(options?: WithAuthOptions) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(options?.signInUrl ?? "/");
  }

  const userRole = (session.user.role ?? "client") as Role;

  if (options?.roles?.length && !options.roles.includes(userRole)) {
    redirect(options?.unauthorizedUrl ?? "/portal");
  }

  return {
    session,
    user: session.user,
    role: userRole,
  };
}

/**
 * Auth helper for API route handlers.
 * Returns JSON error response on failure instead of redirecting.
 * Use the result: if it's a NextResponse, return it; otherwise use session/user.
 *
 * @example
 * export async function GET() {
 *   const authResult = await withAuthApi({ roles: ["owner"] });
 *   if (authResult instanceof NextResponse) return authResult;
 *   const { user } = authResult;
 *   return NextResponse.json({ data: ... });
 * }
 */
export async function withAuthApi(options?: WithAuthOptions) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user.role ?? "client") as Role;

  if (options?.roles?.length && !options.roles.includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    session,
    user: session.user,
    role: userRole,
  };
}
