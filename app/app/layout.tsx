"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ensureSupplierProfile, getSupabaseBrowserClient } from "../lib/supabaseClient";
import ProductUpdatesPrompt from "./components/ProductUpdatesPrompt";

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
  web_notifications_read_at: string | null;
};

type SignedContractRow = {
  id: string;
  client_id: string;
  signed_at: string;
};

type ClientNameRow = {
  id: string;
  name_1: string | null;
  name_2: string | null;
};

type ContractNotification = {
  documentId: string;
  clientName: string;
  signedAt: string;
  read: boolean;
};

type SearchPersonRow = {
  id: string;
  name_1: string | null;
  name_2: string | null;
  email: string | null;
  status: string | null;
};

type SearchDateRow = {
  id: string;
  title: string | null;
  datetime: string | null;
};

type GlobalSearchResult = {
  id: string;
  kind: "client" | "lead" | "key_date";
  label: string;
  detail: string;
  href: string;
  badge?: string;
};

const hiddenClientStatuses = new Set(["archived", "converted", "deleted"]);
const hiddenLeadStatuses = new Set(["archived", "converted", "lost", "deleted"]);

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

function clientDisplayName(client: ClientNameRow | null): string {
  if (!client) return "Client";
  const name1 = client.name_1?.trim() || "";
  const name2 = client.name_2?.trim() || "";
  if (name1 && name2) return `${name1} & ${name2}`;
  return name1 || name2 || "Client";
}

function personDisplayName(name1: string | null, name2: string | null, fallback: string): string {
  const first = name1?.trim() || "";
  const second = name2?.trim() || "";
  if (first && second) return `${first} & ${second}`;
  return first || second || fallback;
}

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ContractNotification[]>([]);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIncludeArchived, setSearchIncludeArchived] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement | null>(null);

  const unreadNotifications = notifications.filter((item) => !item.read).length;

  const loadContractNotifications = async (supplierRow: SupplierRow) => {
    if (!supabase) return;

    setNotificationsLoading(true);
    setNotificationsError(null);

    const { data: docsData, error: docsError } = await supabase
      .from("documents")
      .select("id,client_id,signed_at")
      .eq("supplier_id", supplierRow.id)
      .eq("type", "contract")
      .eq("status", "signed")
      .not("signed_at", "is", null)
      .order("signed_at", { ascending: false })
      .limit(20);

    if (docsError) {
      setNotificationsLoading(false);
      setNotificationsError(docsError.message);
      return;
    }

    const signedRows = (docsData ?? []) as SignedContractRow[];
    if (signedRows.length === 0) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    const clientIds = Array.from(new Set(signedRows.map((row) => row.client_id).filter(Boolean)));
    const clientsMap = new Map<string, ClientNameRow>();

    if (clientIds.length > 0) {
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id,name_1,name_2")
        .in("id", clientIds);

      if (clientsError) {
        setNotificationsLoading(false);
        setNotificationsError(clientsError.message);
        return;
      }

      for (const client of (clientsData ?? []) as ClientNameRow[]) {
        clientsMap.set(client.id, client);
      }
    }

    const readAtMs = supplierRow.web_notifications_read_at
      ? new Date(supplierRow.web_notifications_read_at).getTime()
      : 0;

    const nextNotifications = signedRows.map((row) => {
      const signedAtMs = new Date(row.signed_at).getTime();
      return {
        documentId: row.id,
        clientName: clientDisplayName(clientsMap.get(row.client_id) ?? null),
        signedAt: row.signed_at,
        read: Number.isFinite(readAtMs) && readAtMs > 0 ? signedAtMs <= readAtMs : false,
      };
    });

    setNotifications(nextNotifications);
    setNotificationsLoading(false);
  };

  const markNotificationsRead = async () => {
    if (!supabase || !supplier) return;

    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("suppliers")
      .update({ web_notifications_read_at: nowIso })
      .eq("id", supplier.id);

    if (error) {
      if (/column .*web_notifications_read_at.* does not exist/i.test(error.message)) {
        setNotificationsError("Run docs/web_notifications.sql in Supabase to enable web notifications.");
      } else {
        setNotificationsError(error.message);
      }
      return;
    }

    const updatedSupplier = { ...supplier, web_notifications_read_at: nowIso };
    setSupplier(updatedSupplier);
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  useEffect(() => {
    if (!notificationsOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [notificationsOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen]);

  useEffect(() => {
    if (!supabase || !supplier) return;

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchLoading(false);
      setSearchError(null);
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);

      const cleanQuery = query.replace(/[(),]/g, " ").trim();
      const likePattern = `%${cleanQuery}%`;

      const clientQuery = supabase
        .from("clients")
        .select("id,name_1,name_2,email,status")
        .eq("supplier_id", supplier.id)
        .or(`name_1.ilike.${likePattern},name_2.ilike.${likePattern},email.ilike.${likePattern}`);

      const leadQuery = supabase
        .from("leads")
        .select("id,name_1,name_2,email,status")
        .eq("supplier_id", supplier.id)
        .or(`name_1.ilike.${likePattern},name_2.ilike.${likePattern},email.ilike.${likePattern}`);

      clientQuery.limit(20);
      leadQuery.limit(20);

      const [{ data: clientsData, error: clientsError }, { data: leadsData, error: leadsError }, { data: datesData, error: datesError }] =
        await Promise.all([
          clientQuery,
          leadQuery,
          supabase
            .from("key_dates")
            .select("id,title,datetime")
            .eq("supplier_id", supplier.id)
            .ilike("title", likePattern)
            .order("datetime", { ascending: true })
            .limit(5),
        ]);

      if (cancelled) return;

      if (clientsError || leadsError || datesError) {
        setSearchLoading(false);
        setSearchResults([]);
        setSearchError(clientsError?.message ?? leadsError?.message ?? datesError?.message ?? "Search failed.");
        return;
      }

      const rawClients = (clientsData ?? []) as SearchPersonRow[];
      const rawLeads = (leadsData ?? []) as SearchPersonRow[];
      const filteredClients = searchIncludeArchived
        ? rawClients
        : rawClients.filter((client) => !hiddenClientStatuses.has((client.status ?? "").trim().toLowerCase()));
      const filteredLeads = searchIncludeArchived
        ? rawLeads
        : rawLeads.filter((lead) => !hiddenLeadStatuses.has((lead.status ?? "").trim().toLowerCase()));

      const clientResults = filteredClients.map((client) => {
        const status = (client.status ?? "").trim().toLowerCase();
        return {
          id: client.id,
          kind: "client" as const,
          label: personDisplayName(client.name_1, client.name_2, "Client"),
          detail: client.email?.trim() || "Client",
          href: `/app/clients/${client.id}`,
          badge: hiddenClientStatuses.has(status) ? (client.status ?? "Archived") : undefined,
        };
      });

      const leadResults = filteredLeads.map((lead) => {
        const status = (lead.status ?? "").trim().toLowerCase();
        return {
          id: lead.id,
          kind: "lead" as const,
          label: personDisplayName(lead.name_1, lead.name_2, "Lead"),
          detail: lead.email?.trim() || "Lead",
          href: `/app/leads?selected=${lead.id}`,
          badge: hiddenLeadStatuses.has(status) ? (lead.status ?? "Archived") : undefined,
        };
      });

      const dateResults = ((datesData ?? []) as SearchDateRow[]).map((item) => ({
        id: item.id,
        kind: "key_date" as const,
        label: item.title?.trim() || "Key date",
        detail: item.datetime ? formatNotificationDate(item.datetime) : "Calendar",
        href: `/app/calendar?selected=${item.id}`,
        badge: undefined,
      }));

      const combined = [...clientResults, ...leadResults, ...dateResults].sort((a, b) => {
        const aPenalty = a.badge ? 1 : 0;
        const bPenalty = b.badge ? 1 : 0;
        return aPenalty - bPenalty;
      });
      setSearchResults(combined.slice(0, 12));
      setSearchLoading(false);
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchIncludeArchived, searchQuery, supabase, supplier]);

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

      let supplierData: SupplierRow | null = null;
      let error: { message: string } | null = null;

      {
        const { data, error: queryError } = await supabase
          .from("suppliers")
          .select(
            "id,user_id,tier,plan,entitlement_source,subscription_status,billing_enforcement,entitlement_expires_at,trial_ends_at,web_notifications_read_at",
          )
          .eq("user_id", session.user.id)
          .maybeSingle<SupplierRow>();
        supplierData = data;
        error = queryError ? { message: queryError.message } : null;
      }

      if (error && /column .*web_notifications_read_at.* does not exist/i.test(error.message)) {
        const fallback = await supabase
          .from("suppliers")
          .select(
            "id,user_id,tier,plan,entitlement_source,subscription_status,billing_enforcement,entitlement_expires_at,trial_ends_at",
          )
          .eq("user_id", session.user.id)
          .maybeSingle<
            Omit<SupplierRow, "web_notifications_read_at"> & {
              web_notifications_read_at?: string | null;
            }
          >();
        supplierData = fallback.data
          ? {
              ...fallback.data,
              web_notifications_read_at: null,
            }
          : null;
        error = fallback.error ? { message: fallback.error.message } : null;
      }

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
      void loadContractNotifications(supplierData);

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
            <div className="relative" ref={searchRef}>
              <input
                placeholder="Search clients, leads, key dates..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  if (!searchOpen) setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchOpen(false);
                    return;
                  }
                  if (event.key === "Enter" && searchResults.length > 0) {
                    event.preventDefault();
                    const first = searchResults[0];
                    setSearchOpen(false);
                    setSearchQuery("");
                    router.push(first.href);
                  }
                }}
                className="w-56 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 placeholder:text-zinc-500 md:w-72"
              />
              {searchOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-black/10 bg-white p-2 shadow-[0_20px_40px_-20px_rgba(16,24,40,0.35)]">
                  {searchQuery.trim().length < 2 ? (
                    <p className="rounded-lg border border-black/5 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                      Type at least 2 characters.
                    </p>
                  ) : null}
                  <label className="mb-2 inline-flex items-center gap-2 px-1 text-xs text-zinc-600">
                    <input
                      type="checkbox"
                      checked={searchIncludeArchived}
                      onChange={(event) => setSearchIncludeArchived(event.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    Include archived/deleted records
                  </label>

                  {searchLoading ? (
                    <p className="rounded-lg border border-black/5 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                      Searching...
                    </p>
                  ) : null}

                  {!searchLoading && searchError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {searchError}
                    </p>
                  ) : null}

                  {!searchLoading && !searchError && searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                    <p className="rounded-lg border border-black/5 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                      No matches found.
                    </p>
                  ) : null}

                  {!searchLoading && !searchError && searchResults.length > 0 ? (
                    <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                      {searchResults.map((result) => (
                        <Link
                          key={`${result.kind}-${result.id}`}
                          href={result.href}
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                          }}
                          className="block rounded-lg border border-black/10 bg-white px-3 py-2 hover:bg-zinc-50"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            {result.kind === "key_date" ? "Calendar" : result.kind === "client" ? "Client" : "Lead"}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <p className="text-sm text-zinc-900">{result.label}</p>
                            {result.badge ? (
                              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                                {result.badge}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">{result.detail}</p>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen((current) => !current)}
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100"
                aria-label="Open notifications"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
                </svg>
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-[320px] rounded-xl border border-black/10 bg-white p-2 shadow-[0_20px_40px_-20px_rgba(16,24,40,0.35)]">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <p className="text-sm font-semibold text-zinc-900">Notifications</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void loadContractNotifications(supplier)}
                        className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline"
                      >
                        Refresh
                      </button>
                      {unreadNotifications > 0 ? (
                        <button
                          type="button"
                          onClick={() => void markNotificationsRead()}
                          className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline"
                        >
                          Mark all read
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {notificationsLoading ? (
                    <p className="rounded-lg border border-black/5 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                      Loading notifications...
                    </p>
                  ) : null}

                  {!notificationsLoading && notificationsError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {notificationsError}
                    </p>
                  ) : null}

                  {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                    <p className="rounded-lg border border-black/5 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                      No signed contracts yet.
                    </p>
                  ) : null}

                  {!notificationsLoading && !notificationsError && notifications.length > 0 ? (
                    <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                      {notifications.map((item) => (
                        <Link
                          key={item.documentId}
                          href="/app/documents"
                          onClick={() => setNotificationsOpen(false)}
                          className={`block rounded-lg border px-3 py-2 transition ${
                            item.read
                              ? "border-black/10 bg-white hover:bg-zinc-50"
                              : "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50"
                          }`}
                        >
                          <p className="text-sm text-zinc-900">Signed contract: {item.clientName}</p>
                          <p className="mt-1 text-xs text-zinc-500">{formatNotificationDate(item.signedAt)}</p>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <span className="inline-flex rounded-full border border-black/10 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
              {tierLabel(supplier.tier, supplier.plan)} - {sourceLabel(supplier.entitlement_source)}
            </span>
          </div>
        </header>
        <div className="p-5">{children}</div>
      </section>
      {supabase ? <ProductUpdatesPrompt supplierId={supplier.id} supabase={supabase} /> : null}
    </div>
  );
}
