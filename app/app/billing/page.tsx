"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type SupplierBillingRow = {
  id: string;
  entitlement_source: string | null;
  tier: string | null;
  plan: string | null;
  subscription_status: string | null;
};

type BillingActionPayload = {
  ok?: boolean;
  action?: "checkout" | "portal";
  url?: string;
  error?: string;
  code?: string;
};

function sourceLabel(source: string | null): string {
  if (source === "ios_iap") return "Apple In-App Purchase";
  if (source === "web_stripe") return "Web Stripe";
  if (source === "manual") return "Manual";
  return "None";
}

function tierLabel(tier: string | null, plan: string | null): string {
  if (tier === "professional" || plan === "pro") return "Professional";
  if (tier === "essentials") return "Essentials";
  return "Free";
}

export default function BillingPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [supplier, setSupplier] = useState<SupplierBillingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<"essentials" | "professional" | "portal" | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSupplier() {
      if (!supabase) {
        if (mounted) {
          setError("Web app is not configured yet.");
          setLoading(false);
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        setError("Please sign in again.");
        setLoading(false);
        return;
      }

      const { data, error: supplierError } = await supabase
        .from("suppliers")
        .select("id,entitlement_source,tier,plan,subscription_status")
        .eq("user_id", session.user.id)
        .maybeSingle<SupplierBillingRow>();

      if (!mounted) return;

      if (supplierError) {
        setError(supplierError.message);
        setLoading(false);
        return;
      }

      setSupplier(data ?? null);
      if (!data) setError("Supplier profile not found.");
      setLoading(false);
    }

    void loadSupplier();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const runBillingAction = async (action: "checkout" | "portal", plan?: "essentials" | "professional") => {
    if (!supabase) return;

    setActionMessage(null);
    setRunningAction(action === "portal" ? "portal" : plan ?? "essentials");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setRunningAction(null);
      setActionMessage("Session expired. Please sign in again.");
      return;
    }

    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, plan }),
    });

    const payload = (await response.json()) as BillingActionPayload;

    if (!response.ok) {
      if (response.status === 409 && payload.code === "IOS_MANAGED") {
        setActionMessage("This account is managed through Apple. Use your iPhone App Store subscription settings.");
      } else {
        setActionMessage(payload.error ?? "Billing action failed.");
      }
      setRunningAction(null);
      return;
    }

    if (payload.url) {
      window.location.href = payload.url;
      return;
    }

    setRunningAction(null);
    setActionMessage("Billing action completed.");
  };

  if (loading) return <p className="text-sm text-zinc-600">Loading billing details...</p>;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load billing: {error}
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-4 text-sm text-zinc-600">
        Billing profile unavailable.
      </div>
    );
  }

  const source = supplier.entitlement_source;
  const isAppleManaged = source === "ios_iap";
  const isWebStripe = source === "web_stripe";

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">Billing source is enforced server-side to prevent double charging.</p>

      <section className="rounded-xl border border-black/10 bg-zinc-50 p-4">
        <h2 className="text-base font-semibold text-zinc-900">Current billing state</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-black/10 bg-white px-3 py-2">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Plan</dt>
            <dd className="mt-1 text-zinc-900">{tierLabel(supplier.tier, supplier.plan)}</dd>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-3 py-2">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Source</dt>
            <dd className="mt-1 text-zinc-900">{sourceLabel(source)}</dd>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-3 py-2 sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Subscription status</dt>
            <dd className="mt-1 text-zinc-900">{supplier.subscription_status ?? "unknown"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Manage billing</h3>

        {isAppleManaged ? (
          <p className="mt-2 text-sm text-zinc-600">
            This account is billed through Apple. Web checkout is disabled for Apple-managed subscriptions.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runBillingAction("checkout", "essentials")}
              disabled={runningAction !== null}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningAction === "essentials" ? "Please wait..." : "Start Essentials (Web)"}
            </button>
            <button
              type="button"
              onClick={() => runBillingAction("checkout", "professional")}
              disabled={runningAction !== null}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningAction === "professional" ? "Please wait..." : "Start Professional (Web)"}
            </button>
            {isWebStripe ? (
              <button
                type="button"
                onClick={() => runBillingAction("portal")}
                disabled={runningAction !== null}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {runningAction === "portal" ? "Please wait..." : "Manage Stripe billing"}
              </button>
            ) : null}
          </div>
        )}

        {actionMessage ? (
          <p className="mt-3 rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{actionMessage}</p>
        ) : null}
      </section>
    </div>
  );
}
