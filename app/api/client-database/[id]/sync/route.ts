import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { clientRecord } from "@/db/schema";
import { isQuickBooksReady } from "@/lib/quickbooks-connection";
import { syncContactsForClientFromQuickBooks } from "@/lib/client-contact-sync";
import {
  fetchQuickBooksCustomerUpdate,
  fetchQuickBooksSubCustomersForParent,
} from "@/lib/quickbooks";

type RouteContext = { params: Promise<{ id: string }> };

/** POST — Refresh this client's balance and status from QuickBooks (owner only). */
export async function POST(_request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  if (!(await isQuickBooksReady())) {
    return NextResponse.json(
      { error: "Connect QuickBooks before refreshing client data." },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const [existing] = await db.select().from(clientRecord).where(eq(clientRecord.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (!existing.quickbooksCustomerId) {
    return NextResponse.json(
      { error: "This client is not linked to QuickBooks. Run a full sync or add via QuickBooks." },
      { status: 400 }
    );
  }

  try {
    const update = await fetchQuickBooksCustomerUpdate(existing.quickbooksCustomerId);
    const qbContacts = await fetchQuickBooksSubCustomersForParent(
      existing.quickbooksCustomerId
    );
    const now = new Date().toISOString();
    await db
      .update(clientRecord)
      .set({
        name: update.name,
        balanceCents: update.balanceCents,
        paymentStatus: update.paymentStatus,
        companyName: update.companyName,
        email: update.email,
        phone: update.phone,
        billStreet: update.billStreet,
        billCity: update.billCity,
        billState: update.billState,
        billZip: update.billZip,
        billCountry: update.billCountry,
        notes: update.notes,
        lastQuickbooksSyncAt: now,
        updatedAt: now,
      })
      .where(eq(clientRecord.id, id));

    const contactSync = await syncContactsForClientFromQuickBooks(id, qbContacts);

    const [client] = await db.select().from(clientRecord).where(eq(clientRecord.id, id)).limit(1);
    return NextResponse.json({ client, contactSync });
  } catch (e) {
    const message = e instanceof Error ? e.message : "QuickBooks refresh failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
