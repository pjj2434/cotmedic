import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { clientContact, clientRecord } from "@/db/schema";
import {
  parseClientContactInput,
  type ClientContactInput,
} from "@/lib/client-contact-fields";

type RouteContext = { params: Promise<{ id: string }> };

async function assertClientExists(clientRecordId: string) {
  const [row] = await db
    .select({ id: clientRecord.id })
    .from(clientRecord)
    .where(eq(clientRecord.id, clientRecordId))
    .limit(1);
  return !!row;
}

/** GET — Contacts for a client. */
export async function GET(_request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  if (!(await assertClientExists(id))) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const contacts = await db
    .select()
    .from(clientContact)
    .where(eq(clientContact.clientRecordId, id))
    .orderBy(asc(clientContact.name));

  return NextResponse.json({ contacts });
}

/** POST — Add a contact. */
export async function POST(request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await context.params;
  if (!(await assertClientExists(id))) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as ClientContactInput;
  const parsed = parseClientContactInput(body, true);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const now = new Date().toISOString();
  const contact = {
    id: crypto.randomUUID(),
    clientRecordId: id,
    quickbooksCustomerId: null,
    ...parsed.values,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(clientContact).values(contact);
  return NextResponse.json({ contact }, { status: 201 });
}
