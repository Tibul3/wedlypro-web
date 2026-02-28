"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type ClientRow = {
  id: string;
  supplier_id?: string | null;
  [key: string]: unknown;
};

type ClientForm = {
  status: string;
  name_1: string;
  name_2: string;
  email: string;
  phone: string;
  wedding_date: string;
  venue: string;
  notes: string;
};

const hiddenByDefaultStatuses = new Set(["archived", "converted"]);
const statusOptions = ["active", "archived", "converted"];

const emptyForm: ClientForm = {
  status: "active",
  name_1: "",
  name_2: "",
  email: "",
  phone: "",
  wedding_date: "",
  venue: "",
  notes: "",
};

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

function formFromClient(client: ClientRow): ClientForm {
  return {
    status: pickFirstText(client, ["status"]) ?? "active",
    name_1: pickFirstText(client, ["name_1", "name", "client_name"]) ?? "",
    name_2: pickFirstText(client, ["name_2"]) ?? "",
    email: pickFirstText(client, ["email"]) ?? "",
    phone: pickFirstText(client, ["phone"]) ?? "",
    wedding_date: pickFirstText(client, ["wedding_date", "event_date"]) ?? "",
    venue: pickFirstText(client, ["venue"]) ?? "",
    notes: pickFirstText(client, ["notes"]) ?? "",
  };
}

export default function ClientsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showArchivedConverted, setShowArchivedConverted] = useState(false);

  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);

  const loadData = async () => {
    if (!supabase) {
      setError("Web app is not configured yet.");
      setLoading(false);
      return;
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setError("Please sign in again.");
      setLoading(false);
      return;
    }

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle<{ id: string }>();

    if (supplierError || !supplier) {
      setError("Supplier profile missing.");
      setLoading(false);
      return;
    }

    setSupplierId(supplier.id);

    const { data, error: queryError } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as ClientRow[];
    setClients(rows);
    setSelectedClientId((prev) => prev ?? rows[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      await loadData();
      if (!mounted) return;
    })();

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

  const startCreate = () => {
    setEditingClientId("new");
    setForm(emptyForm);
  };

  const startEdit = () => {
    if (!selectedClient) return;
    setEditingClientId(selectedClient.id);
    setForm(formFromClient(selectedClient));
  };

  const cancelEdit = () => {
    setEditingClientId(null);
    setForm(emptyForm);
  };

  const saveClient = async () => {
    if (!supabase) return;
    if (!supplierId) {
      setError("Supplier profile missing.");
      return;
    }
    if (!form.name_1.trim()) {
      setError("Client name is required.");
      return;
    }

    setError(null);
    setSaving(true);

    const payload = {
      supplier_id: supplierId,
      status: form.status.trim().toLowerCase() || "active",
      name_1: form.name_1.trim(),
      name_2: form.name_2.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      wedding_date: form.wedding_date || null,
      venue: form.venue.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editingClientId === "new") {
      const { data, error: insertError } = await supabase
        .from("clients")
        .insert(payload)
        .select("id")
        .single<{ id: string }>();

      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }

      await loadData();
      setSelectedClientId(data?.id ?? null);
      setEditingClientId(null);
      setSaving(false);
      return;
    }

    if (editingClientId) {
      const { error: updateError } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", editingClientId);

      if (updateError) {
        setSaving(false);
        setError(updateError.message);
        return;
      }

      await loadData();
      setEditingClientId(null);
    }

    setSaving(false);
  };

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading clients...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const isEditing = editingClientId !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">Client list synced from Supabase. You can now create and edit clients.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            New client
          </button>
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
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">{isEditing ? "Edit client" : "Client details"}</h3>
            {!isEditing && selectedClient ? (
              <button
                type="button"
                onClick={startEdit}
                className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Edit
              </button>
            ) : null}
          </div>

          {isEditing ? (
            <div className="space-y-2 text-sm">
              <label className="block text-xs text-zinc-600">
                Status
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-zinc-600">
                Name 1
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.name_1}
                  onChange={(e) => setForm((prev) => ({ ...prev, name_1: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Name 2
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.name_2}
                  onChange={(e) => setForm((prev) => ({ ...prev, name_2: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Email
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Phone
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Wedding date
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  type="date"
                  value={form.wedding_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, wedding_date: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Venue
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.venue}
                  onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Notes
                <textarea
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={saveClient}
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save client"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-lg border border-black/10 px-3 py-2 text-xs text-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : !selectedClient ? (
            <p className="text-sm text-zinc-600">Select a client to view details.</p>
          ) : (
            <dl className="space-y-2 text-sm">
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
