import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { withAuthApi } from "@/lib/with-auth";
import { db } from "@/db";
import { clientContact } from "@/db/schema";
import {
  mergeClientContactPatch,
  type ClientContactInput,
} from "@/lib/client-contact-fields";

type RouteContext = { params: Promise<{ id: string; contactId: string }> };

/** PATCH — Update a contact. */
export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { id, contactId } = await context.params;
  const [existing] = await db
    .select()
    .from(clientContact)
    .where(and(eq(clientContact.id, contactId), eq(clientContact.clientRecordId, id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as ClientContactInput;
  const parsed = mergeClientContactPatch(existing, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const contact = {
    ...parsed.values,
    updatedAt: new Date().toISOString(),
  };

  await db.update(clientContact).set(contact).where(eq(clientContact.id, contactId));
  return NextResponse.json({
    contact: { ...existing, ...contact },
  });
}

/** DELETE — Remove a contact. */
export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  const { id, contactId } = await context.params;
  const [existing] = await db
    .select({ id: clientContact.id })
    .from(clientContact)
    .where(and(eq(clientContact.id, contactId), eq(clientContact.clientRecordId, id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  await db.delete(clientContact).where(eq(clientContact.id, contactId));
  return NextResponse.json({ ok: true });
}
