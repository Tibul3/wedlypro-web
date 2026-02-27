"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../lib/supabaseClient";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/app/leads", label: "Leads" },
  { href: "/app/clients", label: "Clients" },
  { href: "/app/calendar", label: "Calendar" },
  { href: "/app/documents", label: "Documents" },
  { href: "/app/payments", label: "Payments" },
  { href: "/app/settings", label: "Settings" },
  { href: "/app/billing", label: "Billing" },
];

function titleForPath(pathname: string): string {
  const hit = navItems.find((item) => pathname.startsWith(item.href));
  return hit ? hit.label : "Wedly Pro";
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/app/leads")}`);
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/app/leads")}`);
        return;
      }
      setEmail(data.session.user.email ?? null);
      setCheckingAuth(false);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/app/leads")}`);
        return;
      }
      setEmail(session.user.email ?? null);
      setCheckingAuth(false);
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  const onSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-zinc-600">
          Checking account...
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[70vh] grid-cols-1 gap-4 py-6 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex min-h-[70vh] flex-col rounded-2xl border border-black/10 bg-white p-4 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.25)]">
        <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Wedly Pro</p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-black/10 pt-3">
          {email ? <p className="mb-2 truncate px-2 text-xs text-zinc-500">{email}</p> : null}
          <button
            type="button"
            onClick={onSignOut}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>
      </aside>

      <section className="min-w-0 rounded-2xl border border-black/10 bg-white shadow-[0_20px_40px_-24px_rgba(16,24,40,0.25)]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">{titleForPath(pathname || "/app/leads")}</h1>
            <p className="text-xs text-zinc-500">Desktop web app (beta)</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="Search"
              disabled
              className="w-40 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 md:w-56"
            />
            <span className="inline-flex rounded-full border border-black/10 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">Plan status</span>
          </div>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
