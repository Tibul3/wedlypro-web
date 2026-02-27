"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ensureSupplierProfile, getSupabaseBrowserClient } from "../lib/supabaseClient";

type NavItem = {
  href: string;
  label: string;
};

type SupplierRow = {
  id: string;
  user_id: string;
  tier: string | null;
  plan: string | null;
  entitlement_source: string | null;
  subscription_status: string | null;
  billing_enforcement: string | null;
  entitlement_expires_at: string | null;
  trial_ends_at: string | null;
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

function toTitleCase(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceLabel(source: string | null): string {
  if (!source) return "No source";
  if (source === "ios_iap") return "Apple";
  if (source === "web_stripe") return "Web Stripe";
  return toTitleCase(source);
}

function tierLabel(tier: string | null, plan: string | null): string {
  if (tier === "professional") return "Professional";
  if (tier === "essentials") return "Essentials";
  if (plan === "pro") return "Professional";
  return "Free";
}

function hasBillingAccess(supplier: SupplierRow): boolean {
  const enforcement = supplier.billing_enforcement ?? "enforced";
  if (enforcement === "grandfathered") return true;

  const source = supplier.entitlement_source ?? "manual";
  if (source !== "ios_iap" && source !== "web_stripe") return false;

  const status = supplier.subscription_status ?? "inactive";
  const now = Date.now();
  const trialEndsAt = supplier.trial_ends_at ? new Date(supplier.trial_ends_at).getTime() : null;
  const entitlementExpiresAt = supplier.entitlement_expires_at
    ? new Date(supplier.entitlement_expires_at).getTime()
    : null;

  if (status === "trialing") {
    return trialEndsAt === null || trialEndsAt > now;
  }

  if (status === "active" || status === "grace_period") {
    return entitlementExpiresAt === null || entitlementExpiresAt > now;
  }

  return false;
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSupplierForSession() {
      if (!supabase) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/app/leads")}`);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!mounted) return;

      if (!session) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/app/leads")}`);
        return;
      }

      setEmail(session.user.email ?? null);

      const ensured = await ensureSupplierProfile(supabase, session.user);
      if (!ensured.ok) {
        setSupplierError(`Could not provision supplier profile (${ensured.error}).`);
        setCheckingAuth(false);
        return;
      }

      const { data: supplierData, error } = await supabase
        .from("suppliers")
        .select("id,user_id,tier,plan,entitlement_source,subscription_status,billing_enforcement,entitlement_expires_at,trial_ends_at")
        .eq("user_id", session.user.id)
        .maybeSingle<SupplierRow>();

      if (!mounted) return;

      if (error) {
        setSupplierError(`Could not load supplier profile (${error.message}).`);
        setCheckingAuth(false);
        return;
      }

      if (!supplierData) {
        setSupplierError("No supplier profile found for this account.");
        setCheckingAuth(false);
        return;
      }

      const blocked = !hasBillingAccess(supplierData);

      setSupplier(supplierData);
      setSupplierError(null);
      setCheckingAuth(false);

      if (blocked && pathname && !pathname.startsWith("/app/billing")) {
        router.replace("/app/billing");
      }
    }

    void loadSupplierForSession();

    const { data: authSub } = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (!session) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/app/leads")}`);
        return;
      }

      setEmail(session.user.email ?? null);
      setCheckingAuth(true);
      void loadSupplierForSession();
    }) ?? { data: { subscription: { unsubscribe: () => undefined } } };

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

  if (supplierError || !supplier) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center py-8">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.25)]">
          <h2 className="text-lg font-semibold text-zinc-900">Account setup required</h2>
          <p className="mt-2 text-sm text-zinc-600">{supplierError ?? "Supplier profile missing."}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Sign out
            </button>
            <Link href="/support" className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
              Contact support
            </Link>
          </div>
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
            <span className="inline-flex rounded-full border border-black/10 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
              {tierLabel(supplier.tier, supplier.plan)} - {sourceLabel(supplier.entitlement_source)}
            </span>
          </div>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
