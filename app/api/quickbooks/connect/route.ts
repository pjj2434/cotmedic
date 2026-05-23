import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withAuthApi } from "@/lib/with-auth";
import { getQuickBooksAppCredentials } from "@/lib/quickbooks-app";
import { buildQuickBooksAuthorizeUrl } from "@/lib/quickbooks-oauth";
import { isDevRuntime } from "@/lib/is-dev-runtime";

const STATE_COOKIE = "qb_oauth_state";

/** GET — Start QuickBooks OAuth (owner only). In development, ?debug=1 returns OAuth setup metadata. */
export async function GET(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const app = getQuickBooksAppCredentials();
  if (!app) {
    return NextResponse.json(
      {
        error:
          "QuickBooks app is not configured on the server. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  if (isDevRuntime() && searchParams.get("debug") === "1") {
    const state = crypto.randomUUID();
    return NextResponse.json({
      redirectUri: app.redirectUri,
      environment: app.environment,
      hint: "Add redirectUri exactly under Development → Keys → Redirect URIs. Webhooks are not required. (Debug endpoint is disabled in production.)",
    });
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  const url = buildQuickBooksAuthorizeUrl(state);
  return NextResponse.redirect(url);
}
