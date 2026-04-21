import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink, username } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendPortalMagicLinkEmail } from "@/lib/send-magic-link-email";
import { sendPasswordResetEmail } from "@/lib/send-password-reset-email";

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
      return new URL(value).origin;
    } catch {
      // ignore invalid URL values and keep checking candidates
    }
  }

  return "http://localhost:3000";
}

function getTrustedOrigins() {
  const fromEnv =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((v) => v.trim())
      .filter(Boolean) ?? [];

  const auto = [getAuthBaseUrl()];
  if (process.env.VERCEL_URL?.trim()) {
    auto.push(`https://${process.env.VERCEL_URL.trim()}`);
  }

  return Array.from(new Set([...fromEnv, ...auto]));
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
      expiresIn: 3600, // 60 minutes (seconds)
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
