import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | Wedly Pro",
  description: "Terms governing the use of the Wedly Pro platform",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Terms and Conditions</h1>
      <p><strong>Last updated:</strong> 10 February 2026</p>

      <p>
        These terms govern your use of Wedly Pro. By using the service, you agree to them.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>You are responsible for keeping your account secure</li>
        <li>You must provide accurate and current information</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain ownership of content you upload or enter. We process it only to provide the service.
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

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:support@wedlypro.com">support@wedlypro.com</a>
      </p>
    </main>
  );
}

