import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quickbooksConnection } from "@/db/schema";
import type { QuickBooksConfig } from "@/lib/quickbooks-env";
import { getQuickBooksAppCredentials } from "@/lib/quickbooks-app";

export const QUICKBOOKS_CONNECTION_ID = "default";

export type QuickBooksConnectionStatus = {
  appConfigured: boolean;
  connected: boolean;
  realmId?: string;
  environment?: string;
  connectedAt?: string;
};

export async function getStoredQuickBooksConnection() {
  const [row] = await db
    .select()
    .from(quickbooksConnection)
    .where(eq(quickbooksConnection.id, QUICKBOOKS_CONNECTION_ID))
    .limit(1);
  return row ?? null;
}

export async function saveQuickBooksConnection(input: {
  realmId: string;
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
}) {
  const app = getQuickBooksAppCredentials();
  if (!app) throw new Error("QuickBooks app credentials are not configured");

  const now = new Date().toISOString();
  const [existing] = await db
    .select({ id: quickbooksConnection.id })
    .from(quickbooksConnection)
    .where(eq(quickbooksConnection.id, QUICKBOOKS_CONNECTION_ID))
    .limit(1);

  const values = {
    realmId: input.realmId,
    refreshToken: input.refreshToken,
    accessToken: input.accessToken ?? null,
    accessTokenExpiresAt: input.accessTokenExpiresAt ?? null,
    environment: app.environment,
    updatedAt: now,
  };

  if (existing) {
    await db
      .update(quickbooksConnection)
      .set(values)
      .where(eq(quickbooksConnection.id, QUICKBOOKS_CONNECTION_ID));
  } else {
    await db.insert(quickbooksConnection).values({
      id: QUICKBOOKS_CONNECTION_ID,
      ...values,
      connectedAt: now,
    });
  }
}

export async function updateQuickBooksRefreshToken(refreshToken: string) {
  const stored = await getStoredQuickBooksConnection();
  if (!stored) return;

  const now = new Date().toISOString();
  await db
    .update(quickbooksConnection)
    .set({ refreshToken, updatedAt: now })
    .where(eq(quickbooksConnection.id, QUICKBOOKS_CONNECTION_ID));
}

export async function updateQuickBooksAccessToken(accessToken: string, expiresInSeconds: number) {
  const stored = await getStoredQuickBooksConnection();
  if (!stored) return;

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const now = new Date().toISOString();
  await db
    .update(quickbooksConnection)
    .set({
      accessToken,
      accessTokenExpiresAt: expiresAt,
      updatedAt: now,
    })
    .where(eq(quickbooksConnection.id, QUICKBOOKS_CONNECTION_ID));
}

export async function getStoredQuickBooksAccessToken(): Promise<string | null> {
  const stored = await getStoredQuickBooksConnection();
  if (!stored?.accessToken || !stored.accessTokenExpiresAt) return null;
  const expiresMs = new Date(stored.accessTokenExpiresAt).getTime();
  if (!Number.isFinite(expiresMs) || expiresMs <= Date.now() + 60_000) return null;
  return stored.accessToken;
}

export async function deleteQuickBooksConnection() {
  await db
    .delete(quickbooksConnection)
    .where(eq(quickbooksConnection.id, QUICKBOOKS_CONNECTION_ID));
}

/** Active config for API calls: DB connection first, then legacy env tokens. */
export async function resolveQuickBooksConfig(): Promise<QuickBooksConfig | null> {
  const app = getQuickBooksAppCredentials();
  if (!app) return null;

  const stored = await getStoredQuickBooksConnection();
  if (stored?.refreshToken && stored.realmId) {
    return {
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      realmId: stored.realmId,
      refreshToken: stored.refreshToken,
      environment: stored.environment === "production" ? "production" : "sandbox",
    };
  }

  const realmId = process.env.QUICKBOOKS_REALM_ID?.trim();
  const refreshToken = process.env.QUICKBOOKS_REFRESH_TOKEN?.trim();
  if (realmId && refreshToken) {
    return {
      clientId: app.clientId,
      clientSecret: app.clientSecret,
      realmId,
      refreshToken,
      environment: app.environment,
    };
  }

  return null;
}

export async function getQuickBooksConnectionStatus(): Promise<QuickBooksConnectionStatus> {
  const appConfigured = !!getQuickBooksAppCredentials();
  const stored = await getStoredQuickBooksConnection();
  if (stored) {
    return {
      appConfigured,
      connected: true,
      realmId: stored.realmId,
      environment: stored.environment,
      connectedAt: stored.connectedAt,
    };
  }

  const legacy =
    !!process.env.QUICKBOOKS_REALM_ID?.trim() && !!process.env.QUICKBOOKS_REFRESH_TOKEN?.trim();
  return {
    appConfigured,
    connected: legacy && appConfigured,
    realmId: process.env.QUICKBOOKS_REALM_ID?.trim() || undefined,
    environment: getQuickBooksAppCredentials()?.environment,
  };
}

export async function isQuickBooksReady(): Promise<boolean> {
  return !!(await resolveQuickBooksConfig());
}
