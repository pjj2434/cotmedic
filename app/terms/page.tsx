import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

const LAST_UPDATED = "May 19, 2026";
const CONTACT_EMAIL = "marcelo@cotmedik.com";

export const metadata: Metadata = {
  title: "Terms of Use | Cot/Lift Medik Portal",
  description: "End-user license agreement and terms of use for the Cot/Lift Medik internal portal.",
};

export default function TermsOfUsePage() {
  return (
    <LegalPage title="Terms of Use (End-User License Agreement)" lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Use (&ldquo;Terms&rdquo;) govern access to the Cot/Lift Medik Medik Records
        portal (the &ldquo;Portal&rdquo;). By signing in or using the Portal, you agree to these
        Terms. If you do not agree, do not use the Portal.
      </p>

      <h2>Nature of the service</h2>
      <p>
        The Portal is an <strong>internal business application</strong> for Cot/Lift Medik and its
        authorized users (owners, technicians, and approved customer locations). It is not offered
        to the general public. Access is granted at our discretion and may be revoked at any time.
      </p>

      <h2>License</h2>
      <p>
        We grant you a limited, non-exclusive, non-transferable, revocable license to use the Portal
        solely for legitimate Cot/Lift Medik business purposes, in accordance with your assigned role
        and these Terms. You may not copy, modify, reverse engineer, resell, or sublicense the
        Portal except as expressly permitted by us in writing.
      </p>

      <h2>Accounts and security</h2>
      <ul>
        <li>You are responsible for keeping your credentials confidential.</li>
        <li>You must provide accurate information and notify us of unauthorized access.</li>
        <li>We may suspend or terminate accounts that violate these Terms or pose a security risk.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Access data or areas of the Portal outside your authorized role;</li>
        <li>Upload malicious code or interfere with the Portal&apos;s operation;</li>
        <li>Use the Portal for unlawful purposes or to infringe others&apos; rights;</li>
        <li>Scrape, automate, or overload the service without our permission.</li>
      </ul>

      <h2>Your content and QuickBooks</h2>
      <p>
        You retain responsibility for work orders, files, and client data you submit. Owners who
        connect QuickBooks Online authorize the Portal to access and update QuickBooks data as
        configured in the app. You represent that you have authority to connect any QuickBooks
        company you link.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        THE PORTAL IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE,&rdquo; WITHOUT WARRANTIES
        OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED OR ERROR-FREE OPERATION.
        QUICKBOOKS AND OTHER THIRD-PARTY SERVICES ARE NOT UNDER OUR CONTROL.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, COT/LIFT MEDIK AND ITS OPERATORS WILL NOT BE LIABLE
        FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
        PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE PORTAL. OUR TOTAL LIABILITY FOR ANY
        CLAIM RELATING TO THE PORTAL WILL NOT EXCEED ONE HUNDRED U.S. DOLLARS (US$100) OR THE
        AMOUNT YOU PAID US FOR THE PORTAL IN THE TWELVE MONTHS BEFORE THE CLAIM, WHICHEVER IS
        GREATER.
      </p>

      <h2>Indemnity</h2>
      <p>
        You agree to indemnify and hold harmless Cot/Lift Medik from claims arising out of your misuse
        of the Portal or violation of these Terms, except to the extent caused by our gross negligence
        or willful misconduct.
      </p>

      <h2>Changes and termination</h2>
      <p>
        We may modify the Portal or these Terms at any time. Material changes will be reflected by
        updating the &ldquo;Last updated&rdquo; date. We may suspend or discontinue the Portal or
        your access without liability. Sections that by their nature should survive termination will
        survive.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of New York, United States, without regard
        to conflict-of-law rules. Disputes will be brought in the state or federal courts located in
        New York, and you consent to their jurisdiction.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <p className="text-sm text-zinc-600">
        This document is a practical agreement for an internal tool and is not a substitute for
        advice from a licensed attorney. Cot/Lift Medik may publish a revised version at this URL at
        any time.
      </p>
    </LegalPage>
  );
}
