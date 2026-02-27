import Link from "next/link";

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <section className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full rounded-2xl border border-black/10 bg-white p-8 text-center shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Wedly Pro Web App</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">Coming soon</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          Web access is currently in private build and testing. We&apos;ll open this soon.
        </p>

        {next ? (
          <p className="mt-3 text-xs text-zinc-500">Blocked route: <span className="font-mono">{next}</span></p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back to homepage
          </Link>
          <Link href="/support" className="btn-secondary">
            Contact support
          </Link>
        </div>
      </div>
    </section>
  );
}
