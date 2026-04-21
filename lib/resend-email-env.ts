/**
 * Resend is optional in development; required in production so magic links and
 * password resets cannot silently no-op. Never log magic/reset URLs.
 *
 * @returns true if Resend is configured and the caller should send mail
 */
export function ensureResendForTransactionalEmail(
  context: "magic-link" | "password-reset"
): boolean {
  if (process.env.RESEND_API_KEY?.trim()) return true;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`RESEND_API_KEY is required in production (${context}).`);
  }
  console.warn(`[${context}] RESEND_API_KEY is not set; email was not sent.`);
  return false;
}
