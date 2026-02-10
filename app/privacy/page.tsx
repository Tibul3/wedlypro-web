import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Wedly Pro",
  description: "How Wedly Pro collects, uses, and protects personal data",
};


export default function PrivacyPage() {
  return (
    <main>
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> 10 February 2026</p>

      <p>
        Wedly Pro provides client management tools for wedding professionals. This policy explains how we collect, use,
        and protect personal data.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Account information such as name and email address</li>
        <li>Client details you choose to store in the app</li>
        <li>Basic usage and diagnostic data</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To provide and maintain the service</li>
        <li>To improve features and performance</li>
        <li>To communicate service related updates</li>
      </ul>

      <h2>Data storage</h2>
      <p>
        Data is stored securely using trusted infrastructure providers. We do not sell personal data.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access, correction, deletion, or export of your personal data at any time.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:privacy@wedlypro.com">privacy@wedlypro.com</a>
      </p>
    </main>
  );
}

