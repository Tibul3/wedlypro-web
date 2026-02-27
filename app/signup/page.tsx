"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabaseClient";

function readNextPath(): string {
  if (typeof window === "undefined") return "/app/leads";
  const value = new URLSearchParams(window.location.search).get("next");
  return value && value.startsWith("/") ? value : "/app/leads";
}

export default function SignupPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!supabase) {
      setError("Web signup is not configured yet. Please contact support.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedConfirmEmail = confirmEmail.trim().toLowerCase();

    if (normalizedEmail !== normalizedConfirmEmail) {
      setError("Email addresses do not match.");
      return;
    }

    setLoading(true);
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          business_name: businessName.trim(),
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.replace(readNextPath());
      return;
    }

    setNotice("Account created. Please check your email to confirm your address, then log in.");
  };

  return (
    <section className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.35)]">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Create your Wedly Pro account</h1>
        <p className="mt-2 text-sm text-zinc-600">Sign up for website access using your business and account details.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-zinc-700">
            Business Name
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition focus:border-zinc-400"
              type="text"
              autoComplete="organization"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </label>

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
            Confirm Email
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition focus:border-zinc-400"
              type="email"
              autoComplete="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Password
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition focus:border-zinc-400"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-zinc-500">
              Use at least 8 characters with upper/lowercase letters, a number, and a symbol.
            </p>
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-5 text-sm text-zinc-600">
          Already have an account? <Link className="underline" href="/login">Log in</Link>
        </div>
      </div>
    </section>
  );
}
