"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ensureSupplierProfile, getSupabaseBrowserClient } from "../lib/supabaseClient";

function readNextPath(): string {
  if (typeof window === "undefined") return "/app/leads";
  const value = new URLSearchParams(window.location.search).get("next");
  return value && value.startsWith("/") ? value : "/app/leads";
}

export default function LoginPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const nextPath = readNextPath();

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const ensured = await ensureSupplierProfile(supabase, data.session.user);
      if (!ensured.ok) {
        setError(`Account setup failed: ${ensured.error}`);
        return;
      }
      router.replace(nextPath);
    });
  }, [router, supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Web auth is not configured yet. Please contact support.");
      return;
    }

    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    const user = data.user ?? data.session?.user;
    if (!user) {
      setLoading(false);
      setError("Sign-in succeeded but user profile could not be loaded.");
      return;
    }

    const ensured = await ensureSupplierProfile(supabase, user);
    setLoading(false);

    if (!ensured.ok) {
      setError(`Account setup failed: ${ensured.error}`);
      return;
    }

    router.replace(readNextPath());
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Sign in to Wedly Pro</h1>
        <p className="mt-2 text-sm text-zinc-600">Use your existing Wedly Pro account credentials.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-zinc-700">
            Email
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition focus:border-zinc-400"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Password
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition focus:border-zinc-400"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-5 text-sm text-zinc-600">
          Need help? <Link className="underline" href="/support">Contact support</Link>
        </div>
      </div>
    </section>
  );
}
