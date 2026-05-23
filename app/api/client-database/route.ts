import { NextResponse } from "next/server";
import { and, asc, eq, inArray, like, or } from "drizzle-orm";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { clientContact, clientRecord } from "@/db/schema";
import { createQuickBooksCustomer } from "@/lib/quickbooks";
import {
  getQuickBooksConnectionStatus,
  isQuickBooksReady,
} from "@/lib/quickbooks-connection";
import { getClientDisplayTags } from "@/lib/client-tags";
import { extractPhoneDigits, phoneDigitsLike } from "@/lib/phone-search";

/** GET — List CRM clients (owner only). */
export async function GET(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";

  let query = db
    .select({
      id: clientRecord.id,
      name: clientRecord.name,
      balanceCents: clientRecord.balanceCents,
      paymentStatus: clientRecord.paymentStatus,
      lastQuickbooksSyncAt: clientRecord.lastQuickbooksSyncAt,
      quickbooksCustomerId: clientRecord.quickbooksCustomerId,
      updatedAt: clientRecord.updatedAt,
      billStreet: clientRecord.billStreet,
      billCity: clientRecord.billCity,
      billState: clientRecord.billState,
      billZip: clientRecord.billZip,
      billCountry: clientRecord.billCountry,
      isActive: clientRecord.isActive,
      tags: clientRecord.tags,
    })
    .from(clientRecord)
    .$dynamic();

  const conditions = [];
  if (q) {
    const pattern = `%${q}%`;
    const phoneDigits = extractPhoneDigits(q);

    const clientMatches = [
      like(clientRecord.name, pattern),
      like(clientRecord.companyName, pattern),
      like(clientRecord.email, pattern),
      like(clientRecord.phone, pattern),
      like(clientRecord.billStreet, pattern),
      like(clientRecord.billCity, pattern),
      like(clientRecord.billState, pattern),
      like(clientRecord.billZip, pattern),
      like(clientRecord.billCountry, pattern),
      phoneDigitsLike(clientRecord.phone, phoneDigits),
    ].filter((c): c is NonNullable<typeof c> => c != null);

    const clientTextMatch = or(...clientMatches);

    const contactMatches = [
      like(clientContact.name, pattern),
      like(clientContact.email, pattern),
      like(clientContact.phone, pattern),
      like(clientContact.location, pattern),
      like(clientContact.street, pattern),
      like(clientContact.city, pattern),
      like(clientContact.state, pattern),
      like(clientContact.zip, pattern),
      like(clientContact.notes, pattern),
      phoneDigitsLike(clientContact.phone, phoneDigits),
    ].filter((c): c is NonNullable<typeof c> => c != null);

    const contactRows = await db
      .selectDistinct({ clientRecordId: clientContact.clientRecordId })
      .from(clientContact)
      .where(or(...contactMatches));

    const contactClientIds = contactRows.map((r) => r.clientRecordId);
    if (contactClientIds.length > 0) {
      conditions.push(or(clientTextMatch, inArray(clientRecord.id, contactClientIds)));
    } else {
      conditions.push(clientTextMatch);
    }
  }
  if (status === "overdue") {
    conditions.push(eq(clientRecord.paymentStatus, "overdue"));
  } else if (status === "inactive") {
    conditions.push(eq(clientRecord.isActive, false));
  } else if (status === "active") {
    conditions.push(eq(clientRecord.isActive, true));
  }

  if (conditions.length === 1) query = query.where(conditions[0]);
  else if (conditions.length > 1) query = query.where(and(...conditions));

  const rows = await query.orderBy(asc(clientRecord.name));

  const qbStatus = await getQuickBooksConnectionStatus();
  return NextResponse.json({
    clients: rows.map((row) => ({
      ...row,
      displayTags: getClientDisplayTags({
        paymentStatus: row.paymentStatus,
        isActive: row.isActive,
        tags: row.tags,
      }),
    })),
    quickbooksConfigured: await isQuickBooksReady(),
    quickbooks: qbStatus,
  });
}

type CreateClientBody = {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  billStreet?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
  billCountry?: string;
};

/** POST — Create client in QuickBooks and local database (owner only). */
export async function POST(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  if (!(await isQuickBooksReady())) {
    return NextResponse.json(
      { error: "Connect QuickBooks before adding clients." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as CreateClientBody;
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  const companyName = body.companyName?.trim() || null;
  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;
  const billStreet = body.billStreet?.trim() || null;
  const billCity = body.billCity?.trim() || null;
  const billState = body.billState?.trim() || null;
  const billZip = body.billZip?.trim() || null;
  const billCountry = body.billCountry?.trim() || "USA";

  try {
    const qb = await createQuickBooksCustomer({
      displayName: name,
      companyName: companyName ?? undefined,
      email: email ?? undefined,
      phone: phone ?? undefined,
      billStreet: billStreet ?? undefined,
      billCity: billCity ?? undefined,
      billState: billState ?? undefined,
      billZip: billZip ?? undefined,
      billCountry,
    });

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const paymentStatus = qb.balanceCents > 0 ? "open" : "current";

    await db.insert(clientRecord).values({
      id,
      name,
      quickbooksCustomerId: qb.quickbooksCustomerId,
      companyName,
      email,
      phone,
      billStreet,
      billCity,
      billState,
      billZip,
      billCountry,
      balanceCents: qb.balanceCents,
      paymentStatus,
      lastQuickbooksSyncAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const [client] = await db.select().from(clientRecord).where(eq(clientRecord.id, id)).limit(1);
    return NextResponse.json({ client }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create client in QuickBooks";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
