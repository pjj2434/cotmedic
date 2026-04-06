import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { user } from "@/db/schema";

export async function GET() {
  const authResult = await withAuthApi({ roles: ["owner", "administrator"] });
  if (authResult instanceof NextResponse) return authResult;

  const technicians = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.role, "technician"))
    .orderBy(asc(user.name));

  return NextResponse.json({ technicians });
}

