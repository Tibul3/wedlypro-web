import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | Wedly Pro",
  description: "Terms governing the use of the Wedly Pro platform",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Terms and Conditions</h1>
      <p><strong>Last updated:</strong> 12 February 2026</p>

      <p>
        These terms govern your use of Wedly Pro. By using the service, you agree to them.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You are responsible for keeping your account secure</li>
        <li>You must provide accurate and current information</li>
        <li>You are responsible for maintaining the confidentiality of your login credentials</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain ownership of content you upload or enter. We process it only to provide the service.
      </p>

     <h2>Invoicing tools</h2>
<p>
  Wedly Pro provides software tools that allow suppliers to create and manage invoices.
  Any payment information displayed on an invoice is entered directly by the supplier.
</p>
<p>
  Wedly Pro does not process payments, transfer funds, hold money, provide escrow services,
  or act as a financial institution.
</p>
<p>
  Payments are made directly between suppliers and their clients outside of the Wedly Pro platform.
</p>
<p>
  Suppliers are solely responsible for ensuring that any payment details they enter are accurate.
  Wedly Pro does not verify bank details and is not responsible for payments made to incorrect or outdated information.
</p>

<p>
  Wedly Pro is a software platform only and does not provide financial, legal, or tax advice.
</p>

      <h2>Account security and fraud prevention</h2>
      <p>
        Suppliers are responsible for safeguarding their account access. Wedly Pro is not liable for losses arising from
        unauthorised access resulting from compromised login credentials.
      </p>
      <p>
        If you believe your account has been compromised, you must notify us immediately.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No unauthorised access or misuse of the platform</li>
        <li>No unlawful or infringing content</li>
      </ul>

      <h2>Service availability</h2>
      <p>
        We aim for reliable access but do not guarantee uninterrupted availability.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Wedly Pro shall not be liable for any indirect, incidental,
        consequential, or financial losses arising from the use of the platform, including losses related to invoicing
        or payment information features.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:support@wedlypro.com">support@wedlypro.com</a>
      </p>
    </main>
  );
}
