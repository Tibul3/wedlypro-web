"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type ClientRow = {
  id: string;
  [key: string]: unknown;
};

const hiddenByDefaultStatuses = new Set(["archived", "converted"]);

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function pickFirstText(record: ClientRow, keys: string[]): string | null {
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

function formatLabel(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isTechnicalField(key: string): boolean {
  return (
    key === "id" ||
    key === "supplier_id" ||
    key.endsWith("_id") ||
    key.endsWith("_token") ||
    key.startsWith("converted_from_")
  );
}

function displayName(client: ClientRow): string {
  return (
    pickFirstText(client, [
      "name",
      "client_name",
      "couple_name",
      "display_name",
      "name_1",
      "name_2",
      "email",
    ]) ?? `Client ${String(client.id).slice(0, 8)}`
  );
}

function displaySubline(client: ClientRow): string {
  return (
    pickFirstText(client, ["email", "phone", "event_date", "wedding_date", "status"]) ??
    "No extra details"
  );
}

export default function ClientsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showArchivedConverted, setShowArchivedConverted] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadClients() {
      if (!supabase) {
        if (mounted) {
          setError("Web app is not configured yet.");
          setLoading(false);
        }
        return;
      }

      const { data, error: queryError } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as ClientRow[];
      setClients(rows);
      setSelectedClientId(rows.length > 0 ? rows[0].id : null);
      setLoading(false);
    }

    void loadClients();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const visibleClients = useMemo(() => {
    if (showArchivedConverted) return clients;
    return clients.filter((client) => {
      const status = normalizeStatus(pickFirstText(client, ["status", "client_status", "stage"]));
      return !hiddenByDefaultStatuses.has(status);
    });
  }, [clients, showArchivedConverted]);

  useEffect(() => {
    if (!selectedClientId) return;
    if (!visibleClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(visibleClients[0]?.id ?? null);
    }
  }, [visibleClients, selectedClientId]);

  const selectedClient = useMemo(
    () => visibleClients.find((client) => client.id === selectedClientId) ?? null,
    [visibleClients, selectedClientId],
  );

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading clients...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load clients: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">Read-only client list synced from Supabase.</p>
        <label className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={showArchivedConverted}
            onChange={(e) => setShowArchivedConverted(e.target.checked)}
          />
          Show archived/converted
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-black/10 bg-zinc-50 p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Clients ({visibleClients.length})</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {visibleClients.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/10 bg-white px-3 py-3 text-xs text-zinc-500">
                No clients yet.
              </p>
            ) : (
              visibleClients.map((client) => {
                const active = selectedClientId === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-left transition ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/10 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{displayName(client)}</p>
                    <p className={`mt-1 truncate text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                      {displaySubline(client)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-black/10 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Client details</h3>
          {!selectedClient ? (
            <p className="mt-3 text-sm text-zinc-600">Select a client to view details.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(selectedClient)
                .filter(([key, value]) => value !== null && value !== "" && !isTechnicalField(key))
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
