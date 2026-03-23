import { withAuthApi } from "@/lib/with-auth";
import { getAnalytics } from "@/lib/analytics";
import { NextResponse } from "next/server";

/** GET - Analytics for owner dashboard. Owner only. */
export async function GET() {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;
  const data = await getAnalytics();
  return NextResponse.json(data);
}
