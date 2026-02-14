import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download | Wedly Pro",
  description: "Download Wedly Pro on the App Store",
};

export default function DownloadPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="rounded-2xl border border-black/10 bg-white p-8 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Wedly Pro for iPhone</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          The App Store listing is being prepared. Please check back soon.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="#"
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white no-underline"
          >
            App Store (Coming soon)
          </a>
          <Link
            href="/"
            className="rounded-xl border border-black/10 px-5 py-3 text-sm font-medium text-zinc-900 no-underline"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </section>
  );
}
