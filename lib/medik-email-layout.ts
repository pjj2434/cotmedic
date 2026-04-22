/** Shared HTML layout for Medik Records transactional emails (magic link, password reset). */

export function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildMedikLogoWhiteBoxHtml(opts: { logoUrl1?: string; logoUrl2?: string }) {
  const u1 = opts.logoUrl1?.trim();
  const u2 = opts.logoUrl2?.trim();
  const img = (src: string, alt: string) =>
    `<img src="${escapeHtmlAttr(src)}" alt="${escapeHtmlAttr(alt)}" style="max-height:38px; max-width:220px; vertical-align:middle; display:block;" />`;

  let innerCells = "";
  if (u1 && u2) {
    innerCells = `<td style="padding:6px 14px 6px 6px; vertical-align:middle;">${img(u1, "Medik Records")}</td>
                <td style="padding:6px 6px 6px 14px; vertical-align:middle; border-left:1px solid #e5e7eb;">${img(u2, "")}</td>`;
  } else if (u1) {
    innerCells = `<td style="padding:6px 12px; vertical-align:middle;">${img(u1, "Medik Records")}</td>`;
  } else if (u2) {
    innerCells = `<td style="padding:6px 12px; vertical-align:middle;">${img(u2, "Medik Records")}</td>`;
  } else {
    innerCells = `<td style="padding:10px 18px; vertical-align:middle; text-align:center;">
                  <span style="color:#111827;font-size:18px;font-weight:bold;letter-spacing:0.02em;">Medik Records</span>
                </td>`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto; background:#ffffff; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <tr>
                ${innerCells}
              </tr>
            </table>`;
}

export function buildMedikBrandedEmailHtml(opts: {
  year: number;
  logoUrl1?: string;
  logoUrl2?: string;
  heading: string;
  bodyParagraph: string;
  /** Portal sign-in User ID (username), shown under the main body when set */
  userId?: string;
  buttonHref: string;
  buttonLabel: string;
}) {
  const href = escapeHtmlAttr(opts.buttonHref);
  const logoBlock = buildMedikLogoWhiteBoxHtml({
    logoUrl1: opts.logoUrl1,
    logoUrl2: opts.logoUrl2,
  });
  const headingEsc = escapeHtmlText(opts.heading);
  const uid = opts.userId?.trim();
  const userIdBlock = uid
    ? `<p style="font-size:16px; color:#111827; line-height:1.5; margin:18px 0 0;">
                  <span style="color:#4b5563;">User ID:</span>
                  <strong style="display:block; margin-top:6px; font-size:18px; letter-spacing:0.02em;">${escapeHtmlText(uid)}</strong>
                </p>`
    : "";

  return `<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; font-family: Arial, sans-serif; background-color:#f7f7f7;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:600px; background:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="background:#e11d48; padding:30px; text-align:center;">
                ${logoBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:40px; text-align:center; color:#111827;">
                <h2 style="margin:0 0 10px;">${headingEsc}</h2>
                <p style="font-size:16px; color:#4b5563; line-height:1.5; margin:0;">
                  ${escapeHtmlText(opts.bodyParagraph)}
                </p>
                ${userIdBlock}
                <a
                  href="${href}"
                  style="display:inline-block; margin-top:25px; padding:14px 28px;
                          background:#e11d48; color:#ffffff; text-decoration:none;
                          border-radius:8px; font-weight:bold;"
                >
                  ${escapeHtmlText(opts.buttonLabel)}
                </a>
                <p style="margin-top:30px; font-size:12px; color:#9ca3af;">
                  If you didn’t request this email, you can safely ignore it.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px; text-align:center; font-size:12px; color:#9ca3af;">
                © ${opts.year} Medik Records. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
