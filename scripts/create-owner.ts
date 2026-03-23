#!/usr/bin/env npx tsx
/**
 * Create an owner account.
 * Usage:
 *   pnpm create-owner --userId admin --name "Admin User" --password secret123
 *   pnpm create-owner   (prompts for input)
 *
 * Loads .env.local and .env before connecting to DB.
 */

import "./load-env";
import { db } from "../db";
import { user as userTable, account } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import * as readline from "readline";

function parseArgs(): { userId?: string; name?: string; password?: string } {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--userId" || args[i] === "-u") {
      out.userId = args[++i];
    } else if (args[i] === "--name" || args[i] === "-n") {
      out.name = args[++i];
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
  let { userId, name, password } = parseArgs();

  if (!userId || !name || !password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    userId = userId || (await ask(rl, "User ID: "));
    name = name || (await ask(rl, "Name: "));
    password = password || (await ask(rl, "Password: "));
    rl.close();
  }

  if (!userId?.trim() || !password?.trim() || !name?.trim()) {
    console.error("Error: user ID, name, and password are required.");
    process.exit(1);
  }

  const normalizedUsername = userId.trim().toLowerCase();
  const normalizedEmail = `${normalizedUsername}@cotmedic.local`;

  const existingByUsername = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.username, normalizedUsername))
    .limit(1);
  if (existingByUsername.length > 0) {
    console.error("Error: A user with this user ID already exists.");
    process.exit(1);
  }

  const existingByEmail = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1);
  if (existingByEmail.length > 0) {
    console.error("Error: A user with this user ID already exists.");
    process.exit(1);
  }

  const newUserId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const now = new Date().toISOString();
  const hashedPassword = await hashPassword(password);

  await db.insert(userTable).values({
    id: newUserId,
    name: name.trim(),
    email: normalizedEmail,
    username: normalizedUsername,
    displayUsername: userId.trim(),
    emailVerified: false,
    image: null,
    createdAt: now,
    updatedAt: now,
    role: "owner",
    banned: false,
    banReason: null,
    banExpires: null,
  });

  await db.insert(account).values({
    id: accountId,
    userId: newUserId,
    accountId: newUserId,
    providerId: "credential",
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  console.log("Owner account created successfully.");
  console.log("  User ID:", normalizedUsername);
  console.log("  Name:", name.trim());
}

main().catch((err) => {
  const msg = err?.cause?.message ?? err?.message ?? String(err);
  if (msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
    console.error("\nError: Database tables not found.");
    console.error("Run this first to create the schema:  pnpm db:push\n");
  } else {
    console.error(err);
  }
  process.exit(1);
});
