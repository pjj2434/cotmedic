import { NextResponse } from "next/server";
import { withAuthApi } from "@/lib/with-auth";
import { syncClientDatabaseFromQuickBooks } from "@/lib/client-database-sync";
import { isQuickBooksReady } from "@/lib/quickbooks-connection";
import { isQuickBooksAppConfigured } from "@/lib/quickbooks-app";

/** POST — Pull customers and payment status from QuickBooks (owner only). */
export async function POST() {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  if (!isQuickBooksAppConfigured()) {
    return NextResponse.json(
      {
        error:
          "QuickBooks app is not configured on the server. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

  if (!(await isQuickBooksReady())) {
    return NextResponse.json(
      { error: "Connect QuickBooks from the client database page before syncing." },
      { status: 503 }
    );
  }

  try {
    const result = await syncClientDatabaseFromQuickBooks();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "QuickBooks sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
