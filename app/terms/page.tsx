import type { Metadata } from "next";

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
          <strong>Last updated:</strong> 12 February 2026
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href="#accounts" className={sectionLinkClass}>
            Accounts
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
              These terms govern your use of Wedly Pro. By using the service, you agree to them.
            </p>
          </section>

          <section id="accounts" className="scroll-mt-28">
            <h2 className={h2Class}>Accounts</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>You are responsible for keeping your account secure</li>
              <li>You must provide accurate and current information</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>Your content</h2>
            <p className={copyClass}>
              You retain ownership of content you upload or enter. We process it only to provide
              the service.
            </p>
          </section>

          <section id="invoicing" className="scroll-mt-28">
            <h2 className={h2Class}>Invoicing tools</h2>
            <p className={copyClass}>
              Wedly Pro provides software tools that allow suppliers to create and manage invoices.
              Any payment information displayed on an invoice is entered directly by the supplier.
            </p>
            <p className={copyClass}>
              Wedly Pro does not process payments, transfer funds, hold money, provide escrow
              services, or act as a financial institution.
            </p>
            <p className={copyClass}>
              Payments are made directly between suppliers and their clients outside of the Wedly
              Pro platform.
            </p>
            <p className={copyClass}>
              Suppliers are solely responsible for ensuring that any payment details they enter are
              accurate. Wedly Pro does not verify bank details and is not responsible for payments
              made to incorrect or outdated information.
            </p>
            <p className={copyClass}>
              Wedly Pro is a software platform only and does not provide financial, legal, or tax
              advice.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>Account security and fraud prevention</h2>
            <p className={copyClass}>
              Suppliers are responsible for safeguarding their account access. Wedly Pro is not
              liable for losses arising from unauthorised access resulting from compromised login
              credentials.
            </p>
            <p className={copyClass}>
              If you believe your account has been compromised, you must notify us immediately.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>Acceptable use</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>No unauthorised access or misuse of the platform</li>
              <li>No unlawful or infringing content</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>Service availability</h2>
            <p className={copyClass}>
              We aim for reliable access but do not guarantee uninterrupted availability.
            </p>
          </section>

          <section id="liability" className="scroll-mt-28">
            <h2 className={h2Class}>Limitation of liability</h2>
            <p className={copyClass}>
              To the maximum extent permitted by law, Wedly Pro shall not be liable for any
              indirect, incidental, consequential, or financial losses arising from the use of the
              platform, including losses related to invoicing or payment information features.
            </p>
          </section>

          <section id="contact" className="scroll-mt-28">
            <h2 className={h2Class}>Contact</h2>
            <p className={copyClass}>
              Email:{" "}
              <a className="font-medium text-zinc-900 underline" href="mailto:support@wedlypro.com">
                support@wedlypro.com
              </a>
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}
