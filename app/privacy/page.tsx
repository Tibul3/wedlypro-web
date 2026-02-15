import type { Metadata } from "next";

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
          <strong>Last updated:</strong> 12 February 2026
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href="#information" className={sectionLinkClass}>
            Information we collect
          </a>
          <a href="#use" className={sectionLinkClass}>
            How we use information
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
              Wedly Pro provides client management and invoicing tools for wedding professionals.
              This policy explains how we collect, use, and protect personal data.
            </p>
            <p className="mt-3 text-sm leading-7 text-zinc-700">
              Wedly Pro does not use user data for advertising or tracking across apps or websites
              owned by other companies.
            </p>
          </section>

          <section id="information" className="scroll-mt-28">
            <h2 className={h2Class}>Information we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>Account information such as name and email address</li>
              <li>Client details you choose to store in the app</li>
              <li>
                Payment details entered by suppliers for invoicing purposes, including account
                name, sort code, account number, and optional IBAN or BIC
              </li>
              <li>Basic usage and diagnostic data</li>
            </ul>
          </section>

          <section id="use" className="scroll-mt-28">
            <h2 className={h2Class}>How we use information</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-zinc-700">
              <li>To provide and maintain the service</li>
              <li>To generate invoices and display supplier payment instructions</li>
              <li>To notify suppliers of changes to stored payment details</li>
              <li>To detect, prevent, and investigate unauthorised access or fraud</li>
              <li>To improve features and performance</li>
              <li>To communicate service related updates</li>
            </ul>
          </section>

          <section>
            <h2 className={h2Class}>Payment and financial information</h2>
            <p className={copyClass}>
              If you use our invoicing features, you may provide payment details such as account
              name, sort code, account number, IBAN, BIC, and payment reference information.
            </p>
            <p className={copyClass}>
              This information is stored solely to enable invoice generation and payment
              instructions between suppliers and their clients. Wedly Pro does not process
              payments or handle financial transactions. Payments occur directly between suppliers
              and their clients outside of the platform.
            </p>
          </section>

          <section id="security" className="scroll-mt-28">
            <h2 className={h2Class}>Data storage and security</h2>
            <p className={copyClass}>
              Data is stored securely using trusted infrastructure providers. Access to supplier
              payment details is restricted to the authenticated supplier account only.
            </p>
            <p className={copyClass}>
              We implement technical and organisational safeguards designed to protect against
              unauthorised access, alteration, disclosure, or destruction of stored data. However,
              no system can be guaranteed completely secure, and users are responsible for
              maintaining the security of their login credentials.
            </p>
            <p className={copyClass}>We do not sell personal data.</p>
          </section>

          <section>
            <h2 className={h2Class}>Data retention</h2>
            <p className={copyClass}>
              Personal data, including supplier payment details, is retained for as long as the
              account remains active. Upon account deletion, associated data is removed in
              accordance with our retention practices.
            </p>
          </section>

          <section id="rights" className="scroll-mt-28">
            <h2 className={h2Class}>Your rights</h2>
            <p className={copyClass}>
              You may request access, correction, deletion, or export of your personal data at any
              time by contacting us.
            </p>
          </section>

          <section>
            <h2 className={h2Class}>Contact</h2>
            <p className={copyClass}>
              Email:{" "}
              <a className="font-medium text-zinc-900 underline" href="mailto:privacy@wedlypro.com">
                privacy@wedlypro.com
              </a>
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}
