import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Wedly Pro",
  description: "Wedding Supplier CRM for modern wedding professionals",
};

const features = [
  {
    title: "Leads and clients in one place",
    description: "Track every enquiry, follow-up, and booking without losing context.",
  },
  {
    title: "Timeline notes",
    description: "Keep calls, messages, and internal notes organised by client timeline.",
  },
  {
    title: "Document workflows",
    description: "Create and share quotes, invoices, and contracts with clear status updates.",
  },
  {
    title: "Key dates and reminders",
    description: "Stay ahead of discovery calls, milestones, and wedding-day deadlines.",
  },
  {
    title: "Built for mobile",
    description: "Fast, focused screens designed for busy solo suppliers on iPhone.",
  },
  {
    title: "Professional client experience",
    description: "Send clean, consistent documents and keep communication simple for clients.",
  },
];

const steps = [
  {
    title: "Capture enquiries",
    description: "Add leads manually or receive them through your public enquiry form.",
  },
  {
    title: "Convert and plan",
    description: "Turn leads into clients, manage details, and map out key dates.",
  },
  {
    title: "Deliver with confidence",
    description: "Send documents, follow progress, and keep everything on track to the wedding day.",
  },
];

const faqs = [
  {
    question: "Who is Wedly Pro designed for?",
    answer:
      "Wedly Pro is built for solo and small wedding suppliers such as photographers, cake makers, florists, stylists, and planners.",
  },
  {
    question: "Do clients need to create an account?",
    answer:
      "No. Clients can review and sign documents through secure links without creating their own login.",
  },
  {
    question: "Can I manage leads before they are booked?",
    answer:
      "Yes. Leads are tracked separately from confirmed clients so your sales pipeline stays clear.",
  },
  {
    question: "Does Wedly Pro support reminders?",
    answer:
      "Yes. You can track key dates and reminders to stay ahead of calls, payments, and event milestones.",
  },
  {
    question: "Where can I read your legal information?",
    answer: "You can access our Privacy Policy and Terms & Conditions from the links below.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10 py-8 md:space-y-12 md:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-stone-100/70 to-transparent" />
        <div className="relative grid gap-10 px-6 py-14 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:py-16">
          <div className="max-w-xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Wedding Supplier CRM
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 md:text-5xl">
              Calm, clear client management from first enquiry to wedding day.
            </h1>
            <p className="mt-5 text-base leading-7 text-zinc-600">
              Wedly Pro helps wedding suppliers run enquiries, client records, key dates, and
              documents in one polished mobile workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/download"
                className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white no-underline shadow-[0_18px_36px_-24px_rgba(16,24,40,0.55)] transition hover:bg-zinc-800"
              >
                Download on the App Store
              </Link>
              <a
                href="mailto:hello@wedlypro.com"
                className="rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-medium text-zinc-900 no-underline transition hover:bg-zinc-50"
              >
                Contact
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-zinc-100 via-white to-stone-100 p-5 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
            <div className="mx-auto max-w-[285px] rounded-[2.1rem] border border-black/10 bg-zinc-900 p-3 shadow-[0_24px_42px_-28px_rgba(16,24,40,0.8)]">
              <div className="h-[500px] rounded-[1.7rem] bg-white p-4">
                <div className="mx-auto h-6 w-28 rounded-full bg-zinc-200" />
                <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="h-2 w-20 rounded-full bg-zinc-300" />
                  <div className="mt-3 h-8 rounded-lg bg-white" />
                  <div className="mt-2 h-8 rounded-lg bg-white" />
                </div>
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="h-2 w-24 rounded-full bg-zinc-300" />
                  <div className="mt-3 h-14 rounded-lg bg-white" />
                </div>
                <div className="mt-4 h-10 rounded-xl bg-zinc-900/90" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white px-6 py-10 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)] md:px-8 md:py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
          Features
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-black/10 bg-white p-5 transition hover:-translate-y-[1px] hover:shadow-[0_18px_36px_-26px_rgba(16,24,40,0.45)]"
            >
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                <span className={`block h-3.5 w-3.5 rounded-sm ${index % 2 === 0 ? "bg-zinc-900" : "border border-zinc-900"}`} />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white px-6 py-10 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)] md:px-8 md:py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
          How it works
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-black/10 bg-zinc-50 p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white px-6 py-10 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)] md:px-8 md:py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
          App previews
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((preview) => (
            <div
              key={preview}
              className="rounded-2xl border border-black/10 bg-zinc-50 p-4 shadow-[0_18px_34px_-26px_rgba(16,24,40,0.45)]"
            >
              <div className="mx-auto w-full max-w-[230px] rounded-[1.6rem] border border-black/10 bg-white p-3">
                <div className="h-[370px] rounded-[1.2rem] bg-gradient-to-b from-zinc-100 to-white p-4">
                  <div className="h-5 w-24 rounded-full bg-zinc-200" />
                  <div className="mt-5 space-y-3">
                    <div className="h-10 rounded-lg bg-white" />
                    <div className="h-20 rounded-lg bg-white" />
                    <div className="h-10 rounded-lg bg-white" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white px-6 py-10 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)] md:px-8 md:py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">FAQ</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((item) => (
            <details
              key={item.question}
              className="group rounded-2xl border border-black/10 bg-white px-5 py-4 transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-900 marker:content-none">
                <span className="inline-flex items-center justify-between gap-4">
                  {item.question}
                  <span className="text-zinc-500 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white px-6 py-8 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            Questions? Email{" "}
            <a className="font-medium text-zinc-900 underline" href="mailto:hello@wedlypro.com">
              hello@wedlypro.com
            </a>
            .
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
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
