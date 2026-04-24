import { NextResponse } from "next/server";
import { withAuthApi } from "@/lib/with-auth";
import {
  getLatestResendMagicLinkStatusByEmail,
  getResendEmailStatusById,
} from "@/lib/resend-email-status";
import {
  getMagicLinkDeliveryLog,
  updateMagicLinkDeliveryStatus,
  upsertMagicLinkDeliveryLog,
} from "@/lib/magic-link-delivery-log";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const authResult = await withAuthApi({ roles: ["owner"] });
  if (authResult instanceof NextResponse) return authResult;

  let body: { email?: string; messageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const messageId = String(body.messageId ?? "").trim();

  if (!email || !emailRe.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const cached = await getMagicLinkDeliveryLog(email);
  const messageIdToCheck = messageId || cached?.messageId || "";

  if (messageIdToCheck) {
    const byId = await getResendEmailStatusById(messageIdToCheck);
    if (byId.ok) {
      if (cached) {
        await updateMagicLinkDeliveryStatus({
          email,
          messageId: byId.emailId,
          status: byId.status,
          rawEvent: byId.rawEvent ?? null,
        });
      } else {
        await upsertMagicLinkDeliveryLog({
          email,
          messageId: byId.emailId,
          status: byId.status,
          rawEvent: byId.rawEvent ?? null,
          checkedNow: true,
        });
      }
      return NextResponse.json({
        success: true,
        source: "message-id",
        emailId: byId.emailId,
        status: byId.status,
        rawEvent: byId.rawEvent ?? null,
      });
    }
  }

  const latest = await getLatestResendMagicLinkStatusByEmail(email);
  if (!latest.ok) {
    if (cached) {
      return NextResponse.json({
        success: true,
        source: "cache",
        emailId: cached.messageId,
        status: cached.status,
        rawEvent: cached.rawEvent ?? null,
      });
    }
    return NextResponse.json(
      { success: false, status: "unknown", reason: latest.reason },
      { status: 200 }
    );
  }

  if (cached) {
    await updateMagicLinkDeliveryStatus({
      email,
      messageId: latest.emailId,
      status: latest.status,
      rawEvent: latest.rawEvent ?? null,
    });
  } else {
    await upsertMagicLinkDeliveryLog({
      email,
      messageId: latest.emailId,
      status: latest.status,
      rawEvent: latest.rawEvent ?? null,
      checkedNow: true,
    });
  }

  return NextResponse.json({
    success: true,
    source: "latest-for-email",
    emailId: latest.emailId,
    status: latest.status,
    rawEvent: latest.rawEvent ?? null,
  });
}
