import { eq } from "drizzle-orm";
import { db } from "@/db";
import { magicLinkDelivery } from "@/db/schema";

type DeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "bounced"
  | "suppressed"
  | "complained"
  | "opened"
  | "clicked"
  | "unknown";

export async function upsertMagicLinkDeliveryLog(input: {
  email: string;
  userId?: string | null;
  messageId?: string | null;
  status: DeliveryStatus;
  rawEvent?: string | null;
  checkedNow?: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  const now = new Date().toISOString();
  await db
    .insert(magicLinkDelivery)
    .values({
      email,
      userId: input.userId ?? null,
      messageId: input.messageId ?? null,
      status: input.status,
      rawEvent: input.rawEvent ?? null,
      lastSentAt: now,
      lastCheckedAt: input.checkedNow ? now : null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: magicLinkDelivery.email,
      set: {
        userId: input.userId ?? null,
        messageId: input.messageId ?? null,
        status: input.status,
        rawEvent: input.rawEvent ?? null,
        lastSentAt: now,
        lastCheckedAt: input.checkedNow ? now : magicLinkDelivery.lastCheckedAt,
        updatedAt: now,
      },
    });
}

export async function updateMagicLinkDeliveryStatus(input: {
  email: string;
  messageId?: string | null;
  status: DeliveryStatus;
  rawEvent?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  const now = new Date().toISOString();
  await db
    .update(magicLinkDelivery)
    .set({
      messageId: input.messageId ?? null,
      status: input.status,
      rawEvent: input.rawEvent ?? null,
      lastCheckedAt: now,
      updatedAt: now,
    })
    .where(eq(magicLinkDelivery.email, email));
}

export async function getMagicLinkDeliveryLog(email: string) {
  const key = email.trim().toLowerCase();
  if (!key) return null;
  const [row] = await db
    .select()
    .from(magicLinkDelivery)
    .where(eq(magicLinkDelivery.email, key))
    .limit(1);
  return row ?? null;
}
