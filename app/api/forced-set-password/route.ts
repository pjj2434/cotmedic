import { hashPassword } from "better-auth/crypto";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { account, user } from "@/db/schema";
import { validateNewPassword } from "@/lib/password-policy";
import { withAuthApi } from "@/lib/with-auth";

export async function POST(req: Request) {
  const authResult = await withAuthApi();
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const newPassword =
    typeof body === "object" && body !== null && "newPassword" in body
      ? String((body as { newPassword: unknown }).newPassword)
      : "";

  const policyError = validateNewPassword(newPassword);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  const userId = authResult.user.id;
  const now = new Date().toISOString();

  const [row] = await db
    .select({ resetPassword: user.resetPassword })
    .from(user)
    .where(eq(user.id, userId));

  if (!row?.resetPassword) {
    return NextResponse.json({ error: "Password change is not required." }, { status: 403 });
  }

  const [cred] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));

  if (!cred) {
    return NextResponse.json(
      { error: "No password login is set for this account." },
      { status: 400 }
    );
  }

  const hashedPassword = await hashPassword(newPassword);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(account)
        .set({ password: hashedPassword, updatedAt: now })
        .where(eq(account.id, cred.id));
      await tx
        .update(user)
        .set({ resetPassword: false, updatedAt: now })
        .where(eq(user.id, userId));
    });
  } catch {
    return NextResponse.json({ error: "Could not update password." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
