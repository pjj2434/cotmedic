import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

const LAST_UPDATED = "May 19, 2026";
const CONTACT_EMAIL = "marcelo@cotmedik.com";

export const metadata: Metadata = {
  title: "Privacy Policy | Cot/Lift Medik Portal",
  description: "Privacy policy for the Cot/Lift Medik internal customer portal.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy describes how Cot/Lift Medik (&ldquo;we,&rdquo; &ldquo;us&rdquo;) handles
        information when you use our internal Medik Records portal (the &ldquo;Portal&rdquo;). The
        Portal is a private business tool for authorized employees, technicians, and customer
        locations—not a public consumer service.
      </p>

      <h2>Who this applies to</h2>
      <p>
        The Portal is provided only to users invited or provisioned by Cot/Lift Medik (owners,
        technicians, and approved location accounts). If you do not have an authorized account, do
        not use the Portal.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, user ID, email (where provided), role, and
          authentication records (sessions, password hashes).
        </li>
        <li>
          <strong>Operational data:</strong> work orders, repair form details (e.g. unit IDs,
          serial numbers, notes), uploaded files, and related metadata.
        </li>
        <li>
          <strong>Client database data:</strong> customer and contact information you enter or sync
          from QuickBooks, including billing details, balances, and notes.
        </li>
        <li>
          <strong>Technical data:</strong> IP address, browser type, and similar logs collected by
          our hosting provider for security and reliability.
        </li>
      </ul>

      <h2>How we use information</h2>
      <p>We use information solely to operate the Portal, including to:</p>
      <ul>
        <li>Authenticate users and enforce access by role;</li>
        <li>Store and display work orders, client records, and files;</li>
        <li>Sync with QuickBooks Online when an owner connects a company;</li>
        <li>Send transactional email (e.g. password reset or magic-link invites);</li>
        <li>Maintain security, troubleshoot errors, and improve reliability.</li>
      </ul>
      <p>We do not sell personal information.</p>

      <h2>Third-party services</h2>
      <p>We use trusted providers to run the Portal, including:</p>
      <ul>
        <li>
          <strong>Intuit QuickBooks Online</strong> — when connected by an owner, to read and update
          customer data per your QuickBooks permissions;
        </li>
        <li>Hosting and database providers (e.g. Vercel, Turso);</li>
        <li>File storage (UploadThing);</li>
        <li>Email delivery (Resend).</li>
      </ul>
      <p>
        Those providers process data under their own terms and privacy policies. QuickBooks data is
        accessed only after an authorized owner completes Intuit&apos;s OAuth connection.
      </p>

      <h2>Retention and security</h2>
      <p>
        We retain data while accounts and business records are needed for operations. We use
        industry-standard measures (HTTPS, access controls, private file storage where configured) but
        no system is completely secure.
      </p>

      <h2>Your choices</h2>
      <p>
        Authorized users may update certain profile or operational data within the Portal. Account
        removal or data requests should be directed to us at the contact below. Location users should
        contact Cot/Lift Medik administrators for access changes.
      </p>

      <h2>Children</h2>
      <p>The Portal is not directed to children under 13 and is not intended for their use.</p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top
        will change when we do. Continued use of the Portal after changes constitutes acceptance of
        the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
