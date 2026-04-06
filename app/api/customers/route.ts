import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { user } from "@/db/schema";

type WorkType = "cot" | "lift";

function customerMatchesWorkType(customerType: string | null, workType: WorkType): boolean {
  const normalized = String(customerType ?? "cot").trim().toLowerCase();
  if (!normalized) return workType === "cot";
  if (normalized === "both") return true;
  const types = normalized
    .split(/[,\s|/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return types.includes(workType);
}

export async function GET(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner", "technician", "administrator"] });
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  if (type !== "cot" && type !== "lift") {
    return NextResponse.json({ error: "type must be cot or lift" }, { status: 400 });
  }

  const clients = await db
    .select({ id: user.id, name: user.name, customerType: user.customerType })
    .from(user)
    .where(eq(user.role, "client"))
    .orderBy(asc(user.name));

  const customers = clients
    .filter((c) => customerMatchesWorkType(c.customerType, type))
    .map((c) => ({ id: c.id, name: c.name, customerType: c.customerType ?? undefined }));

  return NextResponse.json({ customers });
}

