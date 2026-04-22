import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink, username } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendPortalMagicLinkEmail } from "@/lib/send-magic-link-email";
import { sendPasswordResetEmail } from "@/lib/send-password-reset-email";

function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

/** Warn or fail when the public auth URL is still localhost in a real deployment. */
function validateProductionAuthBaseUrl(origin: string) {
  if (!isLocalhostOrigin(origin)) return;

  if (process.env.VERCEL_ENV === "production") {
    console.error(
      "[auth] baseURL resolved to localhost on Vercel production. Set BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL to your public https origin (magic links and password reset links use this)."
    );
  }

  const enforce =
    process.env.AUTH_ENFORCE_PRODUCTION_URL === "1" ||
    process.env.AUTH_ENFORCE_PRODUCTION_URL === "true";
  if (enforce) {
    throw new Error(
      "Auth base URL must not be localhost when AUTH_ENFORCE_PRODUCTION_URL is set. Set BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL."
    );
  }
}

/**
 * Public origin for Better Auth (magic links, reset links, cookies). Prefer
 * BETTER_AUTH_URL, then NEXT_PUBLIC_APP_URL, then Vercel preview URL, else localhost.
 */
function getAuthBaseUrl() {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const candidates = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    vercelUrl ? `https://${vercelUrl}` : undefined,
    "http://localhost:3000",
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      const origin = new URL(value).origin;
      validateProductionAuthBaseUrl(origin);
      return origin;
    } catch (e) {
      if (e instanceof Error && e.message.includes("localhost")) throw e;
      // ignore invalid URL values and keep checking candidates
    }
  }

  const fallback = "http://localhost:3000";
  validateProductionAuthBaseUrl(fallback);
  return fallback;
}

function addTrustedOriginFromUrl(raw: string | undefined, into: Set<string>) {
  const value = raw?.trim();
  if (!value) return;
  try {
    const u = new URL(value);
    into.add(u.origin);
    if (u.hostname && !u.hostname.startsWith("www.")) {
      into.add(`${u.protocol}//www.${u.hostname}`);
    }
  } catch {
    // ignore invalid URL values
  }
}

function getTrustedOrigins() {
  const fromEnv =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((v) => v.trim())
      .filter(Boolean) ?? [];

  const origins = new Set<string>(fromEnv);

  addTrustedOriginFromUrl(process.env.BETTER_AUTH_URL, origins);
  addTrustedOriginFromUrl(process.env.NEXT_PUBLIC_APP_URL, origins);
  addTrustedOriginFromUrl(getAuthBaseUrl(), origins);
  if (process.env.VERCEL_URL?.trim()) {
    addTrustedOriginFromUrl(`https://${process.env.VERCEL_URL.trim()}`, origins);
  }

  return Array.from(origins);
}

// Custom roles: owner (admin) | technician | client
const ac = createAccessControl({
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
});
const ownerAc = ac.newRole({
  user: ["create", "list", "set-role", "ban", "impersonate", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
});
const technicianAc = ac.newRole({
  user: [],
  session: [],
});
const clientAc = ac.newRole({ user: [], session: [] });
const employeeAc = ac.newRole({ user: [], session: [] });
const administratorAc = ac.newRole({ user: [], session: [] });

export const auth = betterAuth({
  baseURL: getAuthBaseUrl(),
  rateLimit: {
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/username": { window: 15, max: 5 },
      "/sign-in/magic-link": { window: 60, max: 10 },
      "/request-password-reset": { window: 60, max: 5 },
    },
  },
  trustedOrigins: getTrustedOrigins(),
  user: {
    additionalFields: {
      resetPassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
      },
      customerType: {
        type: "string",
        required: false,
        input: true,
      },
      address: {
        type: "string",
        required: false,
        input: true,
      },
      locationId: {
        type: "string",
        required: false,
        input: true,
      },
      managedLocationIds: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, url });
    },
    onPasswordReset: async ({ user }) => {
      const now = new Date().toISOString();
      await db
        .update(schema.user)
        .set({ resetPassword: false, updatedAt: now })
        .where(eq(schema.user.id, user.id));
    },
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  plugins: [
    username(),
    magicLink({
      disableSignUp: true,
      expiresIn: 604800, // 7 days (seconds)
      sendMagicLink: async ({ email, url }) => {
        await sendPortalMagicLinkEmail({ to: email, url });
      },
    }),
    admin({
      defaultRole: "client",
      adminRoles: ["owner"],
      roles: {
        owner: ownerAc,
        technician: technicianAc,
        client: clientAc,
        employee: employeeAc,
        administrator: administratorAc,
      },
    }),
  ],
});
