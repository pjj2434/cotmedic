export type MagicLinkDeliveryStatus =
  | "delivered"
  | "bounced"
  | "suppressed"
  | "complained"
  | "opened"
  | "clicked"
  | "sent"
  | "unknown";

type ResendEmailLookup =
  | { ok: true; status: MagicLinkDeliveryStatus; emailId: string; rawEvent?: string }
  | { ok: false; reason: string };

function mapResendEventToStatus(event: string | undefined): MagicLinkDeliveryStatus {
  const normalized = (event ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized.includes("suppress")) return "suppressed";
  if (normalized.includes("bounce")) return "bounced";
  if (normalized.includes("complain")) return "complained";
  if (normalized.includes("deliver")) return "delivered";
  if (normalized.includes("click")) return "clicked";
  if (normalized.includes("open")) return "opened";
  if (normalized.includes("send")) return "sent";
  return "unknown";
}

function getResendHeaders() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function getResendEmailStatusById(emailId: string): Promise<ResendEmailLookup> {
  const headers = getResendHeaders();
  if (!headers) {
    return { ok: false, reason: "RESEND_API_KEY is not configured" };
  }
  const id = emailId.trim();
  if (!id) return { ok: false, reason: "Missing email id" };

  try {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, reason: `Resend email lookup failed (${res.status})` };
    }

    const payload = (await res.json()) as {
      last_event?: string;
      data?: { last_event?: string };
    };
    const rawEvent = payload.last_event ?? payload.data?.last_event ?? "";

    return {
      ok: true,
      status: mapResendEventToStatus(rawEvent),
      emailId: id,
      rawEvent: rawEvent || undefined,
    };
  } catch {
    return { ok: false, reason: "Could not reach Resend API" };
  }
}

export async function getLatestResendMagicLinkStatusByEmail(
  email: string
): Promise<ResendEmailLookup> {
  const headers = getResendHeaders();
  if (!headers) {
    return { ok: false, reason: "RESEND_API_KEY is not configured" };
  }

  const to = email.trim().toLowerCase();
  if (!to) return { ok: false, reason: "Missing email address" };

  try {
    const url = `https://api.resend.com/emails?to=${encodeURIComponent(to)}&limit=20`;
    const res = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, reason: `Resend email list failed (${res.status})` };
    }

    const payload = (await res.json()) as {
      data?: Array<{
        id?: string;
        subject?: string;
        last_event?: string;
      }>;
    };

    const latestMagicLink = (payload.data ?? []).find((row) =>
      (row.subject ?? "").toLowerCase().includes("sign-in link")
    );

    if (!latestMagicLink?.id) {
      return { ok: false, reason: "No recent magic-link email found for this address" };
    }

    if (latestMagicLink.last_event) {
      return {
        ok: true,
        status: mapResendEventToStatus(latestMagicLink.last_event),
        emailId: latestMagicLink.id,
        rawEvent: latestMagicLink.last_event,
      };
    }

    return getResendEmailStatusById(latestMagicLink.id);
  } catch {
    return { ok: false, reason: "Could not reach Resend API" };
  }
}
