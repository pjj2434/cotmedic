import type { QuickBooksEnvironment } from "@/lib/quickbooks-env";

export type QuickBooksAppCredentials = {
  clientId: string;
  clientSecret: string;
  environment: QuickBooksEnvironment;
  redirectUri: string;
};

export function getQuickBooksEnvironment(): QuickBooksEnvironment {
  const envRaw = (process.env.QUICKBOOKS_ENVIRONMENT ?? "sandbox").trim().toLowerCase();
  return envRaw === "production" ? "production" : "sandbox";
}

export function getQuickBooksRedirectUri(): string {
  const explicit = process.env.QUICKBOOKS_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const base = process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "");
  if (!base) {
    throw new Error("Set BETTER_AUTH_URL or QUICKBOOKS_REDIRECT_URI for QuickBooks OAuth.");
  }
  return `${base}/api/quickbooks/callback`;
}

/** App credentials from env (set once on the server by you, not by the portal owner). */
export function getQuickBooksAppCredentials(): QuickBooksAppCredentials | null {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID?.trim();
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  try {
    return {
      clientId,
      clientSecret,
      environment: getQuickBooksEnvironment(),
      redirectUri: getQuickBooksRedirectUri(),
    };
  } catch {
    return null;
  }
}

export function isQuickBooksAppConfigured(): boolean {
  return !!getQuickBooksAppCredentials();
}
