"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type KeyDateRow = {
  id: string;
  [key: string]: unknown;
};

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function pickFirstText(record: KeyDateRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = toText(record[key]);
    if (value) return value;
  }
  return null;
}

function formatLabel(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayTitle(item: KeyDateRow): string {
  return (
    pickFirstText(item, ["title", "name", "label", "event_type", "type", "description"]) ??
    `Key date ${String(item.id).slice(0, 8)}`
  );
}

function displayDate(item: KeyDateRow): string {
  return (
    pickFirstText(item, ["date", "event_date", "due_date", "reminder_date", "start_date", "created_at"]) ??
    "No date"
  );
}

function displayClient(item: KeyDateRow): string {
  return pickFirstText(item, ["client_name", "name", "client_id", "lead_id"]) ?? "No client linked";
}

export default function CalendarPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [dates, setDates] = useState<KeyDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadKeyDates() {
      if (!supabase) {
        if (mounted) {
          setError("Web app is not configured yet.");
          setLoading(false);
        }
        return;
      }

      const { data, error: queryError } = await supabase
        .from("key_dates")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as KeyDateRow[];
      setDates(rows);
      setSelectedId(rows.length > 0 ? rows[0].id : null);
      setLoading(false);
    }

    void loadKeyDates();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const selected = useMemo(() => dates.find((item) => item.id === selectedId) ?? null, [dates, selectedId]);

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading key dates...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load calendar data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">Read-only key dates synced from Supabase.</p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-black/10 bg-zinc-50 p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Upcoming dates ({dates.length})</h2>
          <div className="mt-3 space-y-2">
            {dates.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/10 bg-white px-3 py-3 text-xs text-zinc-500">
                No key dates yet.
              </p>
            ) : (
              dates.map((item) => {
                const active = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-left transition ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/10 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{displayTitle(item)}</p>
                    <p className={`mt-1 truncate text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                      {displayDate(item)}
                    </p>
                    <p className={`mt-1 truncate text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                      {displayClient(item)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-black/10 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Date details</h3>
          {!selected ? (
            <p className="mt-3 text-sm text-zinc-600">Select a key date to view details.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(selected)
                .filter(([key, value]) => value !== null && value !== "" && key !== "supplier_id")
                .slice(0, 18)
                .map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-black/10 px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">{formatLabel(key)}</dt>
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
