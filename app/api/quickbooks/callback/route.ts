import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withAuthApi } from "@/lib/with-auth";
import { exchangeQuickBooksAuthCode } from "@/lib/quickbooks-oauth";
import { isDevRuntime } from "@/lib/is-dev-runtime";

const STATE_COOKIE = "qb_oauth_state";
const RETURN_PATH = "/portal/client-database";

function redirectWith(query: string) {
  const base = process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") ?? "";
  return NextResponse.redirect(`${base}${RETURN_PATH}?${query}`);
}

/** GET — QuickBooks OAuth callback (owner session required). */
export async function GET(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) {
    const message = isDevRuntime() ? error : "authorization_denied";
    return redirectWith(`qb=error&message=${encodeURIComponent(message)}`);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !realmId || !expectedState || state !== expectedState) {
    return redirectWith("qb=error&message=invalid_oauth_state");
  }

  try {
    await exchangeQuickBooksAuthCode(code, realmId);
    return redirectWith("qb=connected");
  } catch (e) {
    const message =
      isDevRuntime() && e instanceof Error ? e.message : "connection_failed";
    return redirectWith(`qb=error&message=${encodeURIComponent(message)}`);
  }
}
