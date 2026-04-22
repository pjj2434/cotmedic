import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { user } from "@/db/schema";
import { buildMedikBrandedEmailHtml } from "@/lib/medik-email-layout";
import { ensureResendForTransactionalEmail } from "@/lib/resend-email-env";

const defaultFrom = "Cot Medik <onboarding@resend.dev>";

async function resolvePortalUserIdForEmail(toEmail: string): Promise<string | undefined> {
  const norm = toEmail.trim().toLowerCase();
  if (!norm) return undefined;
  const [row] = await db
    .select({ username: user.username, email: user.email })
    .from(user)
    .where(eq(user.email, norm))
    .limit(1);
  if (!row) return undefined;
  const u = row.username?.trim();
  if (u) return u;
  const em = row.email?.trim().toLowerCase() ?? "";
  if (em.endsWith("@cotmedic.local")) {
    return em.replace(/@cotmedic\.local$/i, "");
  }
  return undefined;
}

/**
 * Sends the Better Auth magic-link URL via Resend.
 * If RESEND_API_KEY is unset (e.g. local dev), logs the URL and returns without throwing.
 *
 * Optional logo URLs (absolute https) shown side by side inside a white rounded box:
 * RESEND_BRAND_LOGO_URL, RESEND_BRAND_LOGO_URL_2
 */
export async function sendPortalMagicLinkEmail(opts: { to: string; url: string }) {
  if (!ensureResendForTransactionalEmail("magic-link")) return;
  const key = process.env.RESEND_API_KEY!.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || defaultFrom;
  const logoUrl1 = process.env.RESEND_BRAND_LOGO_URL?.trim();
  const logoUrl2 = process.env.RESEND_BRAND_LOGO_URL_2?.trim();
  const year = new Date().getFullYear();

  const portalUserId = await resolvePortalUserIdForEmail(opts.to);

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: "Welcome to Medik Records — your sign-in link",
    html: buildMedikBrandedEmailHtml({
      year,
      logoUrl1: logoUrl1 || undefined,
      logoUrl2: logoUrl2 || undefined,
      heading: "Welcome to Medik Records",
      bodyParagraph:
        "Click the button below to log in, set your password, and view your records.",
      userId: portalUserId,
      buttonHref: opts.url,
      buttonLabel: "Click to Log In",
    }),
  });

  if (error) {
    throw new Error(typeof error === "string" ? error : error.message ?? "Resend error");
  }
}
