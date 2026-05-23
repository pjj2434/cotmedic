import { NextResponse } from "next/server";
import { withAuthApi } from "@/lib/with-auth";
import { deleteQuickBooksConnection } from "@/lib/quickbooks-connection";
import { clearQuickBooksAccessTokenCache } from "@/lib/quickbooks";

/** POST — Disconnect QuickBooks (owner only). */
export async function POST() {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  await deleteQuickBooksConnection();
  clearQuickBooksAccessTokenCache();

  return NextResponse.json({ ok: true });
}
