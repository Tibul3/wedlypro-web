import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Wedly Pro",
  description: "How Wedly Pro collects, uses, and protects personal data",
};

const sectionLinkClass =
  "rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-black/15 hover:text-zinc-900";
const cardClass =
  "rounded-3xl border border-black/10 bg-white p-6 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)] md:p-8";
const h2Class = "text-xl font-semibold tracking-tight text-zinc-900";
const copyClass = "mt-3 text-sm leading-7 text-zinc-700";

export default function PrivacyPage() {
  return (
    <section className="py-8 md:py-10">
      <div className={`${cardClass} bg-gradient-to-b from-white to-zinc-50/80`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          <strong>Last updated:</strong> 16 February 2026
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href="#who-we-are" className={sectionLinkClass}>
            Who we are
          </a>
          <a href="#information" className={sectionLinkClass}>
            Information collected
          </a>
          <a href="#use" className={sectionLinkClass}>
            Use and lawful basis
          </a>
          <a href="#processor" className={sectionLinkClass}>
            Controller vs processor
          </a>
          <a href="#transfers" className={sectionLinkClass}>
            International transfers
          </a>
          <a href="#security" className={sectionLinkClass}>
            Security
          </a>
          <a href="#rights" className={sectionLinkClass}>
            Your rights
          </a>
        </div>
      </div>

      <article className={`mt-6 ${cardClass}`}>
        <div className="space-y-7">
          <section>
            <p className="text-sm leading-7 text-zinc-700">
              Wedly Pro provides client management, booking administration, and invoicing tools
              for wedding professionals. This Privacy Policy explains how we collect, use, store,
              and protect personal data when you use the Wedly Pro mobile applications, website,
              and related online services.
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-700">
              Wedly Pro does not use personal data for third-party advertising or cross-app
              tracking.
            </p>
          </section>

          <section id="who-we-are" className="scroll-mt-28">
            <h2 className={h2Class}>1. Who we are</h2>
            <p className={copyClass}>
              Wedly Pro is the controller for account, billing, support, and website analytics
              data under UK data protection law.
            </p>
            <p className={copyClass}>
              For supplier-entered client records (for example client names, event details, and
              notes), the supplier is the controller and Wedly Pro acts as processor on the
              supplier&apos;s instructions.
            </p>
            <p className={copyClass}>
              Contact:{" "}
              <Link className="font-medium text-zinc-900 underline" href="/support">
                Support page
              </Link>
            </p>
          </section>

          <section id="information" className="scroll-mt-28">
            <h2 className={h2Class}>2. Information we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>
                Account data: name, email address, business name (if provided), and login account
                information.
              </li>
              <li>
                Client and booking data entered by suppliers: client names, contact information,
                event dates, notes, invoices, and booking records.
              </li>
              <li>
                Supplier payment details used in invoices: account name, sort code, account
                number, optional IBAN/BIC, and payment reference details.
              </li>
              <li>
                Website and product usage data: IP address, browser/device information, page and
                feature usage, and diagnostics/performance data.
              </li>
              <li>
                Contact/support data: name, email, message content, and any additional details
                provided in support requests.
              </li>
            </ul>
          </section>

          <section id="use" className="scroll-mt-28">
            <h2 className={h2Class}>3. How we use information</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>Provide and maintain Wedly Pro services.</li>
              <li>Enable booking management, document generation, and invoicing.</li>
              <li>Display supplier payment instructions on invoices.</li>
              <li>Notify suppliers of important account or payment-detail changes.</li>
              <li>Provide support, troubleshoot issues, and improve product performance.</li>
              <li>Detect, prevent, and investigate fraud or unauthorised access.</li>
              <li>Send essential service and security communications.</li>
            </ul>
            <p className={copyClass}>We do not sell personal data.</p>
            <p className={copyClass}>We do not use personal data for third-party advertising.</p>
          </section>

          <section>
            <h2 className={h2Class}>4. Legal basis for processing</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>Contract: to provide the services you request.</li>
              <li>
                Legitimate interests: to secure, operate, and improve the platform and prevent
                misuse.
              </li>
              <li>Legal obligations: where required by applicable law.</li>
              <li>Consent: for optional communications where consent is requested.</li>
            </ul>
          </section>

          <section id="processor" className="scroll-mt-28">
            <h2 className={h2Class}>5. Data processors and infrastructure</h2>
            <p className={copyClass}>Wedly Pro uses service providers to operate the platform, including:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>Supabase (database and storage infrastructure)</li>
              <li>Vercel (website hosting and analytics infrastructure)</li>
              <li>Resend (transactional email delivery)</li>
            </ul>
            <p className={copyClass}>
              These providers process data under contractual terms and only for service delivery
              purposes.
            </p>
          </section>

          <section id="transfers" className="scroll-mt-28">
            <h2 className={h2Class}>6. International data transfers</h2>
            <p className={copyClass}>
              Some providers may process data outside the UK. Where transfers occur, we use
              appropriate safeguards such as the UK International Data Transfer Agreement (IDTA) or
              the UK Addendum to standard contractual clauses, as applicable.
            </p>
          </section>

          <section id="security" className="scroll-mt-28">
            <h2 className={h2Class}>7. Data storage and security</h2>
            <p className={copyClass}>
              We implement technical and organisational safeguards designed to protect personal
              data from unauthorised access, alteration, disclosure, and destruction.
            </p>
            <p className={copyClass}>
              Access to sensitive supplier payment details is restricted to authenticated supplier
              accounts. No system can be guaranteed completely secure, and users are responsible
              for protecting account credentials.
            </p>
            <p className={copyClass}>
              If we identify a personal data breach, we respond in line with UK GDPR requirements,
              including regulator and user notification where legally required.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>8. Cookies and analytics</h2>
            <p className={copyClass}>
              Our website uses essential technologies for service operation and analytics tools to
              measure usage and improve performance.
            </p>
            <p className={copyClass}>
              You can control non-essential browser storage and cookies through browser settings.
              Where legally required, we will present notice and consent controls.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>9. Data retention</h2>
            <p className={copyClass}>
              We retain account and service data while the account is active. If an account is
              deleted, associated data is removed according to platform retention rules unless we
              are required to keep specific records by law.
            </p>
            <p className={copyClass}>
              Support correspondence may be retained for up to 24 months to manage follow-up,
              security, and service quality.
            </p>
          </section>

          <section id="rights" className="scroll-mt-28">
            <h2 className={h2Class}>10. Your rights</h2>
            <p className={copyClass}>
              Under UK data protection law, you may request access, correction, deletion,
              restriction, portability, or objection to certain processing.
            </p>
            <p className={copyClass}>
              To exercise rights, contact{" "}
              <Link className="font-medium text-zinc-900 underline" href="/support">
                support
              </Link>
              . We aim to respond within one month and may request identity verification.
            </p>
            <p className={copyClass}>
              You may also lodge a complaint with the UK Information Commissioner&apos;s Office
              (ICO).
            </p>
          </section>

          <section>
            <h2 className={h2Class}>11. Children&apos;s data</h2>
            <p className={copyClass}>
              Wedly Pro is designed for business use by wedding professionals and is not directed
              to individuals under 18.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>12. Changes to this policy</h2>
            <p className={copyClass}>
              We may update this policy from time to time. Where changes are material, we will
              notify users through the app or website. The latest version is always available at{" "}
              <a className="font-medium text-zinc-900 underline" href="/privacy">
                wedlypro.com/privacy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className={h2Class}>Contact</h2>
            <p className={copyClass}>
              Email:{" "}
              <Link className="font-medium text-zinc-900 underline" href="/support">
                support via contact form
              </Link>
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}
