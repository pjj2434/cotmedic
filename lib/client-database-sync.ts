import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientRecord } from "@/db/schema";
import { syncContactsForClientFromQuickBooks } from "@/lib/client-contact-sync";
import {
  derivePaymentStatus,
  fetchQuickBooksClientSnapshot,
} from "@/lib/quickbooks";

export type ClientDatabaseSyncResult = {
  synced: number;
  created: number;
  updated: number;
  syncedAt: string;
};

export async function syncClientDatabaseFromQuickBooks(): Promise<ClientDatabaseSyncResult> {
  const snapshot = await fetchQuickBooksClientSnapshot();
  const now = new Date().toISOString();

  const existing = await db
    .select({
      id: clientRecord.id,
      quickbooksCustomerId: clientRecord.quickbooksCustomerId,
    })
    .from(clientRecord);

  const byQbId = new Map(
    existing
      .filter((r) => r.quickbooksCustomerId)
      .map((r) => [r.quickbooksCustomerId as string, r.id])
  );

  let created = 0;
  let updated = 0;

  for (const row of snapshot.customers) {
    const paymentStatus = derivePaymentStatus(
      row.balanceCents,
      row.quickbooksCustomerId,
      snapshot.overdueCustomerIds
    );
    const existingId = byQbId.get(row.quickbooksCustomerId);

    const billingFields = {
      companyName: row.companyName,
      email: row.email,
      phone: row.phone,
      billStreet: row.billStreet,
      billCity: row.billCity,
      billState: row.billState,
      billZip: row.billZip,
      billCountry: row.billCountry,
      notes: row.notes,
    };

    const qbContacts =
      snapshot.contactsByParentQbId.get(row.quickbooksCustomerId) ?? [];

    if (existingId) {
      await db
        .update(clientRecord)
        .set({
          name: row.name,
          balanceCents: row.balanceCents,
          paymentStatus,
          ...billingFields,
          lastQuickbooksSyncAt: now,
          updatedAt: now,
        })
        .where(eq(clientRecord.id, existingId));
      await syncContactsForClientFromQuickBooks(existingId, qbContacts);
      updated += 1;
    } else {
      const id = crypto.randomUUID();
      await db.insert(clientRecord).values({
        id,
        name: row.name,
        quickbooksCustomerId: row.quickbooksCustomerId,
        balanceCents: row.balanceCents,
        paymentStatus,
        ...billingFields,
        lastQuickbooksSyncAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await syncContactsForClientFromQuickBooks(id, qbContacts);
      byQbId.set(row.quickbooksCustomerId, id);
      created += 1;
    }
  }

  return {
    synced: snapshot.customers.length,
    created,
    updated,
    syncedAt: now,
  };
}
