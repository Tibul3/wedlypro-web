"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type LeadRow = {
  id: string;
  [key: string]: unknown;
};

type LeadColumn = {
  key: string;
  title: string;
  items: LeadRow[];
};

const defaultStatusOrder = ["new", "discovery", "booked"];

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function pickFirstText(record: LeadRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = toText(record[key]);
    if (value) return value;
  }
  return null;
}

function normalizeStatus(rawStatus: string | null): string {
  if (!rawStatus) return "unsorted";
  return rawStatus.trim().toLowerCase().replace(/\s+/g, "_");
}

function statusTitle(statusKey: string): string {
  if (statusKey === "unsorted") return "Unsorted";
  return statusKey
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function leadDisplayName(lead: LeadRow): string {
  return (
    pickFirstText(lead, [
      "name",
      "lead_name",
      "couple_name",
      "display_name",
      "client_name",
      "event_name",
      "wedding_name",
      "title",
      "email",
    ]) ?? `Lead ${String(lead.id).slice(0, 8)}`
  );
}

function leadSubline(lead: LeadRow): string {
  return (
    pickFirstText(lead, [
      "email",
      "phone",
      "event_date",
      "wedding_date",
      "created_at",
      "source",
    ]) ?? "No extra details"
  );
}

function buildColumns(leads: LeadRow[]): LeadColumn[] {
  const grouped = new Map<string, LeadRow[]>();

  for (const lead of leads) {
    const rawStatus = pickFirstText(lead, ["status", "lead_status", "stage"]);
    const key = normalizeStatus(rawStatus);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(lead);
  }

  const orderedKeys = [
    ...defaultStatusOrder.filter((status) => grouped.has(status)),
    ...Array.from(grouped.keys()).filter((status) => !defaultStatusOrder.includes(status)).sort(),
  ];

  if (orderedKeys.length === 0) {
    return [{ key: "empty", title: "No leads", items: [] }];
  }

  return orderedKeys.map((key) => ({
    key,
    title: statusTitle(key),
    items: grouped.get(key) ?? [],
  }));
}

export default function LeadsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadLeads() {
      if (!supabase) {
        if (mounted) {
          setError("Web app is not configured yet.");
          setLoading(false);
        }
        return;
      }

      const { data, error: queryError } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as LeadRow[];
      setLeads(rows);
      setSelectedLeadId(rows.length > 0 ? rows[0].id : null);
      setLoading(false);
    }

    void loadLeads();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const columns = useMemo(() => buildColumns(leads), [leads]);
  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId],
  );

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading leads...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load leads: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">Read-only board synced from Supabase.</p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-x-auto">
          <div className="grid min-w-[780px] gap-4 md:grid-cols-3 xl:grid-cols-4">
            {columns.map((column) => (
              <section key={column.key} className="rounded-xl border border-black/10 bg-zinc-50 p-3">
                <h2 className="text-sm font-semibold text-zinc-900">
                  {column.title} <span className="text-zinc-500">({column.items.length})</span>
                </h2>
                <div className="mt-3 space-y-2">
                  {column.items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-black/10 px-3 py-3 text-xs text-zinc-500">
                      No leads yet.
                    </p>
                  ) : (
                    column.items.map((lead) => {
                      const isActive = selectedLeadId === lead.id;
                      return (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => setSelectedLeadId(lead.id)}
                          className={`w-full min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-left transition ${
                            isActive
                              ? "border-zinc-900 bg-zinc-900 text-white"
                              : "border-black/10 bg-white text-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          <p className="truncate text-sm font-medium">{leadDisplayName(lead)}</p>
                          <p className={`mt-1 truncate text-xs ${isActive ? "text-zinc-200" : "text-zinc-500"}`}>
                            {leadSubline(lead)}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-black/10 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Lead details</h3>
          {!selectedLead ? (
            <p className="mt-3 text-sm text-zinc-600">Select a lead card to view details.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(selectedLead)
                .filter(([key, value]) => value !== null && value !== "" && key !== "supplier_id")
                .slice(0, 18)
                .map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-black/10 px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">{statusTitle(key)}</dt>
                    <dd className="mt-1 break-words text-zinc-800">{String(value)}</dd>
                  </div>
                ))}
            </dl>
          )}
        </aside>
      </div>
    </div>
  );
}
