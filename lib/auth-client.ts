import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";

function getClientBaseUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) return undefined;
  return value;
}

const baseURL = getClientBaseUrl();

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  plugins: [adminClient(), usernameClient()],
});
