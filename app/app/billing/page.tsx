"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type SupplierBillingRow = {
  id: string;
  entitlement_source: string | null;
  tier: string | null;
  plan: string | null;
  subscription_status: string | null;
  entitlement_expires_at: string | null;
  trial_ends_at: string | null;
};

type BillingActionPayload = {
  ok?: boolean;
  action?: "checkout" | "portal";
  url?: string;
  error?: string;
  code?: string;
};

type BillingEvent = {
  event_id: string;
  event_type: string;
  delivery_status: string;
  error_message: string | null;
  created_at: string;
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

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function effectiveStatusLabel(supplier: SupplierBillingRow): string {
  const source = supplier.entitlement_source ?? "manual";
  const status = (supplier.subscription_status ?? "inactive").toLowerCase();

  if (source !== "ios_iap" && source !== "web_stripe") {
    return "Not subscribed";
  }

  if (status === "trialing") return "Trial active";
  if (status === "active") return "Active";
  if (status === "grace_period") return "Grace period";
  if (status === "past_due") return "Past due";
  if (status === "canceled") return "Canceled";
  if (status === "expired") return "Expired";
  return "Inactive";
}

function renewalSummary(supplier: SupplierBillingRow): string {
  const source = supplier.entitlement_source ?? "manual";
  const status = (supplier.subscription_status ?? "inactive").toLowerCase();

  if (source === "manual") {
    return "No web subscription is active on this account.";
  }

  if (status === "trialing") {
    return supplier.trial_ends_at
      ? `Trial ends on ${formatDate(supplier.trial_ends_at)}. Paid billing starts after trial unless cancelled in Stripe.`
      : "Trial is active.";
  }

  if (supplier.entitlement_expires_at) {
    if (status === "canceled") {
      return `Cancellation recorded. Access remains until ${formatDate(supplier.entitlement_expires_at)}.`;
    }
    return `Current access period ends on ${formatDate(supplier.entitlement_expires_at)} (renews unless cancelled).`;
  }

  return "Subscription is active.";
}

export default function BillingPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [supplier, setSupplier] = useState<SupplierBillingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<"essentials" | "professional" | "portal" | null>(null);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

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
        .select("id,entitlement_source,tier,plan,subscription_status,entitlement_expires_at,trial_ends_at")
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

      setEventsLoading(true);
      const eventsResponse = await fetch("/api/billing/events?limit=8", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const eventsPayload = (await eventsResponse.json()) as {
        events?: BillingEvent[];
      };

      if (mounted && eventsResponse.ok) {
        setEvents(eventsPayload.events ?? []);
      }
      if (mounted) setEventsLoading(false);
    }

    void loadSupplier();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const runManualSync = async () => {
    if (!supabase) return;

    setActionMessage(null);
    setRunningAction("portal");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setRunningAction(null);
      setActionMessage("Session expired. Please sign in again.");
      return;
    }

    const response = await fetch("/api/billing/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      code?: string;
      error?: string;
      status?: string;
      plan?: string;
    };

    if (!response.ok) {
      setRunningAction(null);
      setActionMessage(payload.error ?? "Manual sync failed.");
      return;
    }

    setRunningAction(null);
    setActionMessage(`Billing sync complete (${payload.plan ?? "unknown"}, ${payload.status ?? "unknown"}). Refreshing...`);
    window.location.reload();
  };

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
  const isProfessional = supplier.tier === "professional" || supplier.plan === "pro";

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
            <dd className="mt-1 text-zinc-900">{effectiveStatusLabel(supplier)}</dd>
          </div>
          <div className="rounded-lg border border-black/10 bg-white px-3 py-2 sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Renewal / cancellation</dt>
            <dd className="mt-1 text-zinc-900">{renewalSummary(supplier)}</dd>
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
            {!isWebStripe ? (
              <button
                type="button"
                onClick={() => runBillingAction("checkout", "essentials")}
                disabled={runningAction !== null}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {runningAction === "essentials" ? "Please wait..." : "Start Essentials (Web)"}
              </button>
            ) : null}

            {!isProfessional ? (
              <button
                type="button"
                onClick={() => runBillingAction("checkout", "professional")}
                disabled={runningAction !== null}
                className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {runningAction === "professional" ? "Please wait..." : "Upgrade to Professional"}
              </button>
            ) : null}

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

            <button
              type="button"
              onClick={runManualSync}
              disabled={runningAction !== null}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningAction === "portal" ? "Please wait..." : "Sync billing status"}
            </button>
          </div>
        )}

        {actionMessage ? (
          <p className="mt-3 rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{actionMessage}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Billing diagnostics</h3>
        <p className="mt-1 text-xs text-zinc-500">Recent Stripe webhook events linked to this account.</p>

        {eventsLoading ? (
          <p className="mt-3 text-sm text-zinc-600">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No webhook events recorded for this user yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {events.map((event) => (
              <div key={event.event_id} className="rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-xs">
                <p className="font-medium text-zinc-800">{event.event_type}</p>
                <p className="mt-1 text-zinc-600">Status: {event.delivery_status}</p>
                <p className="text-zinc-600">At: {formatDate(event.created_at)}</p>
                {event.error_message ? <p className="mt-1 text-red-700">{event.error_message}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
