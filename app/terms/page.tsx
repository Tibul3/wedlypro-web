import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions | Wedly Pro",
  description: "Terms governing the use of the Wedly Pro platform",
};

const sectionLinkClass =
  "rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-black/15 hover:text-zinc-900";
const cardClass =
  "rounded-3xl border border-black/10 bg-white p-6 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)] md:p-8";
const h2Class = "text-xl font-semibold tracking-tight text-zinc-900";
const copyClass = "mt-3 text-sm leading-7 text-zinc-700";

export default function TermsPage() {
  return (
    <section className="py-8 md:py-10">
      <div className={`${cardClass} bg-gradient-to-b from-white to-zinc-50/80`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Terms and Conditions
        </h1>
        <p className="mt-3 text-sm text-zinc-600">
          <strong>Last updated:</strong> 16 February 2026
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href="#about" className={sectionLinkClass}>
            About
          </a>
          <a href="#accounts" className={sectionLinkClass}>
            Accounts
          </a>
          <a href="#subscriptions" className={sectionLinkClass}>
            Subscriptions
          </a>
          <a href="#invoicing" className={sectionLinkClass}>
            Invoicing tools
          </a>
          <a href="#liability" className={sectionLinkClass}>
            Liability
          </a>
          <a href="#contact" className={sectionLinkClass}>
            Contact
          </a>
        </div>
      </div>

      <article className={`mt-6 ${cardClass}`}>
        <div className="space-y-7">
          <section>
            <p className="text-sm leading-7 text-zinc-700">
              These Terms and Conditions govern your access to and use of Wedly Pro, including the
              Wedly Pro mobile applications, website at wedlypro.com, and related online services.
              By creating an account or using Wedly Pro, you agree to these Terms. If you do not
              agree, you must not use the service.
            </p>
          </section>

          <section id="about" className="scroll-mt-28">
            <h2 className={h2Class}>1. About Wedly Pro</h2>
            <p className={copyClass}>
              Wedly Pro is a software platform designed to help wedding professionals manage
              clients, bookings, and invoices.
            </p>
            <p className={copyClass}>
              Wedly Pro provides software tools only. It is not a financial institution, payment
              processor, escrow provider, legal adviser, or tax adviser.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>2. Eligibility</h2>
            <p className={copyClass}>
              You must be at least 18 years old and use Wedly Pro for business purposes. You are
              responsible for ensuring your use complies with applicable laws and regulations.
            </p>
          </section>

          <section id="accounts" className="scroll-mt-28">
            <h2 className={h2Class}>3. Accounts</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>You must provide accurate and current account information.</li>
              <li>You must keep your account details up to date.</li>
              <li>You are responsible for maintaining the confidentiality of login credentials.</li>
              <li>You must not share account access with unauthorised third parties.</li>
              <li>You are responsible for all activity under your account.</li>
            </ul>
            <p className={copyClass}>
              If you suspect unauthorised access, contact{" "}
              <Link className="font-medium text-zinc-900 underline" href="/support">
                support
              </Link>{" "}
              immediately.
            </p>
          </section>

          <section id="subscriptions" className="scroll-mt-28">
            <h2 className={h2Class}>4. Subscriptions and payment</h2>
            <p className={copyClass}>
              Access to certain features requires a paid subscription. Subscription prices, billing
              cycles, and trial information are displayed at purchase.
            </p>
            <p className={copyClass}>
              For purchases made through the Apple App Store (and, in future, Google Play),
              payments are processed by the relevant app store, auto-renewal is managed by that
              store, and cancellation/refunds are governed by the store&apos;s policies.
            </p>
            <p className={copyClass}>
              Wedly Pro does not directly process subscription payments.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>5. Your content</h2>
            <p className={copyClass}>You retain ownership of content entered into the platform, including:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>Client details</li>
              <li>Booking information</li>
              <li>Notes</li>
              <li>Invoices and payment instructions</li>
            </ul>
            <p className={copyClass}>
              You grant Wedly Pro a limited licence to process and store this content only to
              provide the service.
            </p>
            <p className={copyClass}>
              You are solely responsible for data accuracy and for ensuring you have the right to
              collect and process your clients&apos; personal data.
            </p>
          </section>

          <section id="invoicing" className="scroll-mt-28">
            <h2 className={h2Class}>6. Invoicing and payment information</h2>
            <p className={copyClass}>
              Wedly Pro provides software tools to create and manage invoices. Payment details
              shown on invoices are entered directly by the supplier.
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>Wedly Pro does not process payments.</li>
              <li>Wedly Pro does not transfer funds or hold money.</li>
              <li>Wedly Pro does not verify bank details.</li>
              <li>Wedly Pro does not provide escrow services.</li>
            </ul>
            <p className={copyClass}>
              Payments occur directly between supplier and client outside the platform. Suppliers
              are solely responsible for payment-detail accuracy and updates. Wedly Pro is not
              liable for payments made to incorrect, outdated, or fraudulent bank details.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>7. Data protection</h2>
            <p className={copyClass}>
              Use of Wedly Pro is subject to our Privacy Policy. Suppliers act as data controllers
              for their client data and are responsible for complying with applicable data
              protection laws.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>8. Acceptable use</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>No unauthorised access to the platform or infrastructure.</li>
              <li>No interference with or disruption of services.</li>
              <li>No unlawful, infringing, defamatory, or harmful content.</li>
              <li>No fraudulent or illegal use.</li>
            </ul>
            <p className={copyClass}>We may suspend or terminate accounts that breach these Terms.</p>
          </section>

          <section>
            <h2 className={h2Class}>9. Service availability</h2>
            <p className={copyClass}>
              We aim to provide reliable and secure access but do not guarantee uninterrupted or
              error-free availability. Access may be suspended for maintenance, updates, or
              security.
            </p>
            <p className={copyClass}>
              The service is provided on an &quot;as available&quot; and &quot;as is&quot; basis, to
              the maximum extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>10. Intellectual property</h2>
            <p className={copyClass}>
              All intellectual property rights in the Wedly Pro platform (excluding user content)
              remain the property of Wedly Pro.
            </p>
            <p className={copyClass}>
              You may not copy, modify, distribute, reverse engineer, or create derivative works
              from the platform without written permission.
            </p>
          </section>

          <section id="liability" className="scroll-mt-28">
            <h2 className={h2Class}>11. Limitation of liability</h2>
            <p className={copyClass}>
              To the maximum extent permitted by law, Wedly Pro is not liable for indirect,
              incidental, consequential, or financial losses arising from use of the platform,
              including loss of profits, business interruption, loss of data, or losses linked to
              invoicing features or payments made to incorrect bank details.
            </p>
            <p className={copyClass}>
              Nothing in these Terms excludes liability for death or personal injury caused by
              negligence, fraud, or any liability that cannot be excluded under applicable law.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>12. Termination</h2>
            <p className={copyClass}>You may stop using the service at any time.</p>
            <p className={copyClass}>We may suspend or terminate access if:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>You breach these Terms.</li>
              <li>We are required to do so by law.</li>
              <li>Providing the service is no longer commercially viable.</li>
            </ul>
            <p className={copyClass}>On termination, your right to use the platform ends immediately.</p>
            <p className={copyClass}>
              Clauses concerning intellectual property, liability, governing law, and any accrued
              payment obligations survive termination.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>13. Force majeure</h2>
            <p className={copyClass}>
              Wedly Pro is not liable for delay or failure to perform where caused by events beyond
              reasonable control, including network outages, cloud provider incidents, labor
              disputes, natural disasters, or regulatory actions.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>14. Changes to service or terms</h2>
            <p className={copyClass}>
              We may update the service or these Terms from time to time. Where changes are
              material, we provide reasonable notice through the app or website. Continued use
              after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>15. Governing law</h2>
            <p className={copyClass}>
              These Terms are governed by the laws of England and Wales. For business users, courts
              of England and Wales have exclusive jurisdiction over disputes arising from these
              Terms.
            </p>
          </section>

          <section id="contact" className="scroll-mt-28">
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
