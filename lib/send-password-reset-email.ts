import { Resend } from "resend";
import { buildMedikBrandedEmailHtml } from "@/lib/medik-email-layout";
import { ensureResendForTransactionalEmail } from "@/lib/resend-email-env";

const defaultFrom = "Cot Medik <onboarding@resend.dev>";

/**
 * Password reset link (Better Auth). Same Resend / branding as magic link.
 * If RESEND_API_KEY is unset, logs the URL and returns without throwing.
 */
export async function sendPasswordResetEmail(opts: { to: string; url: string }) {
  if (!ensureResendForTransactionalEmail("password-reset")) return;
  const key = process.env.RESEND_API_KEY!.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || defaultFrom;
  const logoUrl1 = process.env.RESEND_BRAND_LOGO_URL?.trim();
  const logoUrl2 = process.env.RESEND_BRAND_LOGO_URL_2?.trim();
  const year = new Date().getFullYear();

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: "Medik Records — reset your password",
    html: buildMedikBrandedEmailHtml({
      year,
      logoUrl1: logoUrl1 || undefined,
      logoUrl2: logoUrl2 || undefined,
      heading: "Reset your password",
      bodyParagraph:
        "We received a request to reset the password for your Medik Records portal account. Click the button below to choose a new password. This link expires in about an hour.",
      buttonHref: opts.url,
      buttonLabel: "Choose a new password",
    }),
  });

  if (error) {
    throw new Error(typeof error === "string" ? error : error.message ?? "Resend error");
  }
}
