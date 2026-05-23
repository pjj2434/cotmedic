import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { clientContact, clientRecord } from "@/db/schema";
import { isQuickBooksReady } from "@/lib/quickbooks-connection";
import {
  updateQuickBooksCustomer,
  type QuickBooksCustomerWriteInput,
} from "@/lib/quickbooks";
import { getClientDisplayTags, serializeClientTags } from "@/lib/client-tags";

type RouteContext = { params: Promise<{ id: string }> };

function enrichClient(client: typeof clientRecord.$inferSelect) {
  return {
    ...client,
    displayTags: getClientDisplayTags({
      paymentStatus: client.paymentStatus,
      isActive: client.isActive,
      tags: client.tags,
    }),
  };
}

/** GET — Client detail with contacts. */
export async function GET(_request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  const [client] = await db.select().from(clientRecord).where(eq(clientRecord.id, id)).limit(1);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const contacts = await db
    .select()
    .from(clientContact)
    .where(eq(clientContact.clientRecordId, id));

  return NextResponse.json({ client: enrichClient(client), contacts });
}

/** PATCH — Update client; billing syncs to QuickBooks when linked. */
export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  const [existing] = await db.select().from(clientRecord).where(eq(clientRecord.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    notes?: string;
    name?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    billStreet?: string;
    billCity?: string;
    billState?: string;
    billZip?: string;
    billCountry?: string;
    isActive?: boolean;
    tags?: string[];
  };

  const updates: Record<string, string | boolean | null> = {
    updatedAt: new Date().toISOString(),
  };
  if (typeof body.notes === "string") updates.notes = body.notes;
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (body.companyName !== undefined) updates.companyName = body.companyName.trim() || null;
  if (body.email !== undefined) updates.email = body.email.trim() || null;
  if (body.phone !== undefined) updates.phone = body.phone.trim() || null;
  if (body.billStreet !== undefined) updates.billStreet = body.billStreet.trim() || null;
  if (body.billCity !== undefined) updates.billCity = body.billCity.trim() || null;
  if (body.billState !== undefined) updates.billState = body.billState.trim() || null;
  if (body.billZip !== undefined) updates.billZip = body.billZip.trim() || null;
  if (body.billCountry !== undefined) updates.billCountry = body.billCountry.trim() || null;
  if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
  if (Array.isArray(body.tags)) {
    updates.tags = serializeClientTags(body.tags);
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const qbChanges: QuickBooksCustomerWriteInput = {};
  if (typeof body.name === "string" && body.name.trim()) {
    qbChanges.displayName = body.name.trim();
  }
  if (body.companyName !== undefined) {
    qbChanges.companyName = body.companyName.trim() || null;
  }
  if (body.email !== undefined) {
    qbChanges.email = body.email.trim() || null;
  }
  if (body.phone !== undefined) {
    qbChanges.phone = body.phone.trim() || null;
  }
  if (body.billStreet !== undefined) qbChanges.billStreet = body.billStreet.trim() || null;
  if (body.billCity !== undefined) qbChanges.billCity = body.billCity.trim() || null;
  if (body.billState !== undefined) qbChanges.billState = body.billState.trim() || null;
  if (body.billZip !== undefined) qbChanges.billZip = body.billZip.trim() || null;
  if (body.billCountry !== undefined) qbChanges.billCountry = body.billCountry.trim() || null;
  if (typeof body.notes === "string") qbChanges.notes = body.notes.trim() || null;

  const shouldPushToQuickBooks =
    !!existing.quickbooksCustomerId &&
    (await isQuickBooksReady()) &&
    Object.keys(qbChanges).length > 0;

  if (shouldPushToQuickBooks) {
    try {
      await updateQuickBooksCustomer(existing.quickbooksCustomerId!, qbChanges);
    } catch (e) {
      const message = e instanceof Error ? e.message : "QuickBooks update failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  await db.update(clientRecord).set(updates).where(eq(clientRecord.id, id));
  const [client] = await db.select().from(clientRecord).where(eq(clientRecord.id, id)).limit(1);
  return NextResponse.json({
    client: client ? enrichClient(client) : null,
    quickbooksUpdated: shouldPushToQuickBooks,
  });
}
