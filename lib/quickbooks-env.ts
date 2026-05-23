export type QuickBooksEnvironment = "sandbox" | "production";

export type QuickBooksConfig = {
  clientId: string;
  clientSecret: string;
  realmId: string;
  refreshToken: string;
  environment: QuickBooksEnvironment;
};

export function getQuickBooksConfig(): QuickBooksConfig | null {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID?.trim();
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET?.trim();
  const realmId = process.env.QUICKBOOKS_REALM_ID?.trim();
  const refreshToken = process.env.QUICKBOOKS_REFRESH_TOKEN?.trim();
  const envRaw = (process.env.QUICKBOOKS_ENVIRONMENT ?? "sandbox").trim().toLowerCase();
  const environment: QuickBooksEnvironment =
    envRaw === "production" ? "production" : "sandbox";

  if (!clientId || !clientSecret || !realmId || !refreshToken) return null;
  return { clientId, clientSecret, realmId, refreshToken, environment };
}

export function quickBooksApiBase(environment: QuickBooksEnvironment): string {
  return environment === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}
