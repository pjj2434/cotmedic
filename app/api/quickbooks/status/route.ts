import { NextResponse } from "next/server";
import { withAuthApi } from "@/lib/with-auth";
import { getQuickBooksConnectionStatus } from "@/lib/quickbooks-connection";
import {
  getQuickBooksAppCredentials,
  getQuickBooksRedirectUri,
} from "@/lib/quickbooks-app";
import { isDevRuntime } from "@/lib/is-dev-runtime";

/** GET — QuickBooks connection status (owner only). */
export async function GET() {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const status = await getQuickBooksConnectionStatus();

  if (isDevRuntime()) {
    const app = getQuickBooksAppCredentials();
    let redirectUri: string | undefined;
    try {
      redirectUri = getQuickBooksRedirectUri();
    } catch {
      redirectUri = undefined;
    }
    return NextResponse.json({
      ...status,
      redirectUri,
      oauthEnvironment: app?.environment,
    });
  }

  return NextResponse.json(status);
}
