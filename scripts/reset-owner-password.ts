#!/usr/bin/env npx tsx
/**
 * Reset an owner account password (database + credential row).
 * Use when the owner is locked out and cannot use the portal.
 *
 * Usage:
 *   pnpm reset-owner-password --userId admin --password NewPass1!
 *   pnpm reset-owner-password   (prompts; targets the single owner user)
 *
 * Loads .env.local and .env before connecting to DB.
 */

import "./load-env";
import { db } from "../db";
import { user as userTable, account, session } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import * as readline from "readline";

function parseArgs(): { userId?: string; password?: string } {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--userId" || args[i] === "-u") {
      out.userId = args[++i];
    } else if (args[i] === "--password" || args[i] === "-p") {
      out.password = args[++i];
    }
  }
  return out;
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (ans) => resolve(ans.trim()));
  });
}

async function main() {
  let { userId, password } = parseArgs();

  const owners = await db
    .select({ id: userTable.id, username: userTable.username })
    .from(userTable)
    .where(eq(userTable.role, "owner"));

  if (owners.length === 0) {
    console.error("Error: No user with role owner found.");
    process.exit(1);
  }

  if (!userId) {
    if (owners.length > 1) {
      console.error("Error: Multiple owners found. Pass --userId <username>.");
      owners.forEach((o) => console.error("  -", o.username ?? o.id));
      process.exit(1);
    }
    userId = owners[0].username ?? undefined;
    if (!userId) {
      console.error("Error: Owner has no username set.");
      process.exit(1);
    }
  }

  const normalizedUsername = userId.trim().toLowerCase();
  const ownerRow = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(and(eq(userTable.role, "owner"), eq(userTable.username, normalizedUsername)))
    .limit(1);

  if (ownerRow.length === 0) {
    console.error("Error: No owner found with user ID:", normalizedUsername);
    process.exit(1);
  }

  const ownerId = ownerRow[0].id;

  if (!password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    password = await ask(rl, "New password: ");
    rl.close();
  }

  if (!password || password.length < 8) {
    console.error("Error: Password must be at least 8 characters.");
    process.exit(1);
  }

  const now = new Date().toISOString();
  const hashedPassword = await hashPassword(password);

  await db
    .update(account)
    .set({ password: hashedPassword, updatedAt: now })
    .where(and(eq(account.userId, ownerId), eq(account.providerId, "credential")));

  await db.delete(session).where(eq(session.userId, ownerId));

  await db
    .update(userTable)
    .set({ resetPassword: true, updatedAt: now })
    .where(eq(userTable.id, ownerId));

  console.log("Owner password reset.");
  console.log("  User ID:", normalizedUsername);
  console.log("  They must sign in and will be prompted to set a new password at /portal/change-password.");
}

main().catch((err) => {
  const msg = err?.cause?.message ?? err?.message ?? String(err);
  if (msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
    console.error("\nError: Database tables not found.");
    console.error("Run: pnpm db:push\n");
  } else {
    console.error(err);
  }
  process.exit(1);
});
