import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Wedly Pro",
  description: "Wedding Supplier CRM for modern wedding professionals",
};

const features = [
  "Lead and client tracking in one workspace",
  "Timeline notes for every enquiry and booking",
  "Clean quotes, invoices, and contract workflows",
  "Key dates, reminders, and wedding-day visibility",
  "Professional document sharing and signing links",
  "Built for busy solo suppliers on mobile first",
];

const faq = [
  {
    q: "Who is Wedly Pro for?",
    a: "Wedly Pro is designed for wedding suppliers such as photographers, cake makers, florists, and stylists.",
  },
  {
    q: "Do my clients need an account?",
    a: "No. Clients receive links for documents and signing without needing to log in.",
  },
  {
    q: "Can I track leads before they become bookings?",
    a: "Yes. Leads and clients are separate so you can manage early enquiries clearly.",
  },
  {
    q: "Does Wedly Pro support reminders?",
    a: "Yes. You can manage key dates and reminders so important milestones are not missed.",
  },
  {
    q: "Where can I read your legal information?",
    a: "You can view our Privacy Policy and Terms at the links in the footer.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-black/5 bg-white">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-stone-100/60 to-transparent" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600">
              Wedding Supplier CRM
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 md:text-5xl">
              Everything your wedding business needs, in one calm place.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-600">
              Wedly Pro helps you run enquiries, bookings, documents, reminders, and client
              communication from first message to wedding day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/download"
                className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white no-underline shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)] transition hover:opacity-95"
              >
                App Store (Coming soon)
              </Link>
              <a
                href="mailto:hello@wedlypro.com"
                className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-medium text-zinc-900 no-underline transition hover:bg-black/[0.03]"
              >
                Contact us
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-black/10 bg-gradient-to-b from-white to-zinc-50 p-5 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
            <div className="mx-auto max-w-[260px] rounded-[2rem] border border-black/10 bg-zinc-900 p-3">
              <div className="h-[460px] rounded-[1.6rem] bg-white p-4">
                <div className="h-8 w-24 rounded-full bg-stone-100" />
                <div className="mt-6 space-y-3">
                  <div className="h-14 rounded-xl bg-zinc-50" />
                  <div className="h-14 rounded-xl bg-zinc-50" />
                  <div className="h-14 rounded-xl bg-zinc-50" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-zinc-600">
              Replace with real app screenshots in this phone mock.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14 md:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">Features</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => (
            <article key={item} className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
              <p className="text-sm leading-6 text-zinc-900">{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-black/5 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 md:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-black/10 bg-zinc-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">Step 1</p>
              <h3 className="mt-2 text-lg font-medium text-zinc-900">Capture enquiries</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Add leads manually or collect them through your public enquiry form.
              </p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-zinc-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">Step 2</p>
              <h3 className="mt-2 text-lg font-medium text-zinc-900">Convert and plan</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Convert leads to clients and manage notes, timelines, and key dates.
              </p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-zinc-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">Step 3</p>
              <h3 className="mt-2 text-lg font-medium text-zinc-900">Send documents</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Generate quotes, invoices, and contracts with clear status tracking.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14 md:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">App preview</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((phone) => (
            <div key={phone} className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
              <div className="mx-auto max-w-[220px] rounded-[1.4rem] border border-black/10 bg-zinc-50 p-3">
                <div className="h-[360px] rounded-[1.1rem] bg-white" />
              </div>
              <p className="mt-3 text-center text-xs text-zinc-600">Screenshot placeholder {phone}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-black/5 bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 md:py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-black/10 rounded-2xl border border-black/10">
            {faq.map((item) => (
              <div key={item.q} className="bg-white px-5 py-4">
                <h3 className="text-sm font-semibold text-zinc-900">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <p className="text-sm text-zinc-600">
            Need help now? Contact{" "}
            <a className="font-medium text-zinc-900 underline" href="mailto:hello@wedlypro.com">
              hello@wedlypro.com
            </a>
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <Link className="text-zinc-900 underline" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="text-zinc-900 underline" href="/terms">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
