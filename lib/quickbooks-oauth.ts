import { getQuickBooksAppCredentials } from "@/lib/quickbooks-app";
import { saveQuickBooksConnection } from "@/lib/quickbooks-connection";
import { clearQuickBooksAccessTokenCache } from "@/lib/quickbooks";
import { failQuickBooksRequest } from "@/lib/quickbooks-error-log";

const INTUIT_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_SCOPE = "com.intuit.quickbooks.accounting";

export function buildQuickBooksAuthorizeUrl(state: string): string {
  const app = getQuickBooksAppCredentials();
  if (!app) {
    throw new Error("QuickBooks app credentials are not configured on the server.");
  }

  const params = new URLSearchParams({
    client_id: app.clientId,
    redirect_uri: app.redirectUri,
    response_type: "code",
    scope: QB_SCOPE,
    state,
  });

  return `${INTUIT_AUTHORIZE_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  x_refresh_token_expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeQuickBooksAuthCode(code: string, realmId: string) {
  const app = getQuickBooksAppCredentials();
  if (!app) {
    throw new Error("QuickBooks app credentials are not configured on the server.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: app.redirectUri,
  });

  const res = await fetch(INTUIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${app.clientId}:${app.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await res.json().catch(() => ({}))) as TokenResponse;

  if (!res.ok || !data.refresh_token || !data.access_token) {
    failQuickBooksRequest({
      operation: "oauth:authorization_code",
      res,
      json: data,
      realmId,
      fallbackMessage: "Failed to connect QuickBooks (token exchange)",
      oauthError: data.error,
      oauthErrorDescription: data.error_description,
    });
  }

  const expiresIn = Number(data.expires_in ?? 3600);

  await saveQuickBooksConnection({
    realmId,
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  });

  clearQuickBooksAccessTokenCache();

  return { realmId, expiresIn };
}
