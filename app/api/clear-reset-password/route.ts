import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  const authResult = await withAuthApi();
  if (authResult instanceof NextResponse) return authResult;
  const { user: authUser } = authResult;
  await db
    .update(user)
    .set({ resetPassword: false })
    .where(eq(user.id, authUser.id));
  return NextResponse.json({ ok: true });
}
