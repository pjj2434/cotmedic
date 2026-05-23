import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientContact } from "@/db/schema";
import type { QuickBooksContactRow } from "@/lib/quickbooks";

/** Upsert QuickBooks sub-customers as contacts; remove stale QB-linked contacts. */
export async function syncContactsForClientFromQuickBooks(
  clientRecordId: string,
  contacts: QuickBooksContactRow[]
): Promise<{ upserted: number; removed: number }> {
  const existing = await db
    .select({
      id: clientContact.id,
      quickbooksCustomerId: clientContact.quickbooksCustomerId,
    })
    .from(clientContact)
    .where(eq(clientContact.clientRecordId, clientRecordId));

  const byQbId = new Map(
    existing
      .filter((r) => r.quickbooksCustomerId)
      .map((r) => [r.quickbooksCustomerId as string, r.id])
  );

  const seenQbIds = new Set<string>();
  const now = new Date().toISOString();
  let upserted = 0;

  for (const row of contacts) {
    seenQbIds.add(row.quickbooksCustomerId);
    const values = {
      name: row.name,
      email: row.email,
      phone: row.phone,
      location: row.location,
      street: row.street,
      city: row.city,
      state: row.state,
      zip: row.zip,
      country: row.country,
      notes: row.notes,
      updatedAt: now,
    };

    const existingId = byQbId.get(row.quickbooksCustomerId);
    if (existingId) {
      await db.update(clientContact).set(values).where(eq(clientContact.id, existingId));
    } else {
      await db.insert(clientContact).values({
        id: crypto.randomUUID(),
        clientRecordId,
        quickbooksCustomerId: row.quickbooksCustomerId,
        ...values,
        createdAt: now,
      });
    }
    upserted += 1;
  }

  let removed = 0;
  for (const row of existing) {
    if (row.quickbooksCustomerId && !seenQbIds.has(row.quickbooksCustomerId)) {
      await db.delete(clientContact).where(eq(clientContact.id, row.id));
      removed += 1;
    }
  }

  return { upserted, removed };
}
