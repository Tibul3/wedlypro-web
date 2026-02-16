import type { Metadata } from "next";
import Link from "next/link";
import SupportContactForm from "../components/SupportContactForm";

export const metadata: Metadata = {
  title: "Support | Wedly Pro",
  description: "Get support for Wedly Pro",
};

export default function SupportPage() {
  return (
    <section className="py-8 md:py-10">
      <div className="rounded-3xl border border-black/10 bg-gradient-to-b from-white to-zinc-50/80 p-6 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Wedly Pro</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">Support</h1>
        <p className="mt-3 text-sm leading-7 text-zinc-700">
          If you need help using Wedly Pro or have questions about your account, we&apos;re here to
          help.
        </p>
      </div>

      <article className="mt-6 rounded-3xl border border-black/10 bg-white p-6 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)] md:p-8">
        <div className="space-y-6 text-sm leading-7 text-zinc-700">
          <section>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Contact support</h2>
            <p className="mt-3">Use the form below and our support team will respond by email.</p>
            <div className="mt-4">
              <SupportContactForm />
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Response time</h2>
            <p className="mt-3">We aim to respond within 1-2 business days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Before you email</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>Include the email address used on your Wedly Pro account</li>
              <li>Share a short description of the issue and what you expected to happen</li>
              <li>Include screenshots where possible to speed up support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Data and privacy</h2>
            <p className="mt-3">
              For information about how we handle data, please see our{" "}
              <Link className="font-medium text-zinc-900 underline" href="/privacy">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </section>
  );
}
