import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Wedly Pro",
  description: "How Wedly Pro collects, uses, and protects personal data",
};

export default function PrivacyPage() {
  return (
    <main>
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> 12 February 2026</p>

      <p>
        Wedly Pro provides client management and invoicing tools for wedding professionals. This policy explains how we collect, use,
        and protect personal data.
      </p>

      <p>
        Wedly Pro does not use user data for advertising or tracking across apps or websites owned by other companies.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Account information such as name and email address</li>
        <li>Client details you choose to store in the app</li>
        <li>Payment details entered by suppliers for invoicing purposes, including account name, sort code, account number, and optional IBAN or BIC</li>
        <li>Basic usage and diagnostic data</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To provide and maintain the service</li>
        <li>To generate invoices and display supplier payment instructions</li>
        <li>To notify suppliers of changes to stored payment details</li>
        <li>To detect, prevent, and investigate unauthorised access or fraud</li>
        <li>To improve features and performance</li>
        <li>To communicate service related updates</li>
      </ul>

      <h2>Payment and financial information</h2>
      <p>
        If you use our invoicing features, you may provide payment details such as account name, sort code, account number,
        IBAN, BIC, and payment reference information.
      </p>
      <p>
        This information is stored solely to enable invoice generation and payment instructions between suppliers and their clients.
        Wedly Pro does not process payments or handle financial transactions. Payments occur directly between suppliers and their clients outside of the platform.
      </p>

      <h2>Data storage and security</h2>
      <p>
        Data is stored securely using trusted infrastructure providers. Access to supplier payment details is restricted to the
        authenticated supplier account only.
      </p>
      <p>
        We implement technical and organisational safeguards designed to protect against unauthorised access, alteration,
        disclosure, or destruction of stored data. However, no system can be guaranteed completely secure, and users are responsible
        for maintaining the security of their login credentials.
      </p>
      <p>
        We do not sell personal data.
      </p>

      <h2>Data retention</h2>
      <p>
        Personal data, including supplier payment details, is retained for as long as the account remains active.
        Upon account deletion, associated data is removed in accordance with our retention practices.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access, correction, deletion, or export of your personal data at any time by contacting us.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:privacy@wedlypro.com">privacy@wedlypro.com</a>
      </p>
    </main>
  );
}
