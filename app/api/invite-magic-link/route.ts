import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { withAuthApi } from "@/lib/with-auth";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Owner sends a magic link to an existing account’s primary email (must match DB). */
export async function POST(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !emailRe.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (email.endsWith("@cotmedic.local")) {
    return NextResponse.json(
      { error: "Magic link must use a real inbox address (not @cotmedic.local)" },
      { status: 400 }
    );
  }

  const [row] = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "No account found with this email" }, { status: 404 });
  }
  if (row.role === "owner") {
    return NextResponse.json({ error: "Not allowed for this account" }, { status: 403 });
  }

  try {
    await auth.api.signInMagicLink({
      body: { email, callbackURL: "/portal" },
      headers: await headers(),
    });
  } catch (e) {
    console.error("[invite-magic-link]", e);
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
