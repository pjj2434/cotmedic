import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { magicLinkDelivery } from "@/db/schema";
import { withAuthApi } from "@/lib/with-auth";

export async function POST(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  let body: { emails?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emails = Array.isArray(body.emails)
    ? body.emails
        .map((e) => String(e ?? "").trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 500)
    : [];

  if (emails.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const rows = await db
    .select({
      email: magicLinkDelivery.email,
      status: magicLinkDelivery.status,
      updatedAt: magicLinkDelivery.updatedAt,
    })
    .from(magicLinkDelivery)
    .where(inArray(magicLinkDelivery.email, emails));

  return NextResponse.json({ rows });
}
