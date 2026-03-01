"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type KeyDateRow = {
  id: string;
  supplier_id?: string | null;
  [key: string]: unknown;
};

type KeyDateForm = {
  title: string;
  datetime_local: string;
  reminder_minutes: string;
};

const emptyForm: KeyDateForm = {
  title: "",
  datetime_local: "",
  reminder_minutes: "60",
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
    pickFirstText(item, ["datetime", "date", "event_date", "due_date", "reminder_date", "start_date"]) ??
    "No date"
  );
}

function displayClient(item: KeyDateRow): string {
  return pickFirstText(item, ["client_name", "name", "client_id", "lead_id"]) ?? "No client linked";
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB");
}

function isTechnicalField(key: string): boolean {
  return (
    key === "supplier_id" ||
    key === "created_at" ||
    key === "updated_at" ||
    key === "calendar_event_id" ||
    key === "calendar_id"
  );
}

function formFromKeyDate(item: KeyDateRow): KeyDateForm {
  return {
    title: pickFirstText(item, ["title"]) ?? "",
    datetime_local: toDateTimeLocalValue(pickFirstText(item, ["datetime"])),
    reminder_minutes: pickFirstText(item, ["reminder_minutes"]) ?? "60",
  };
}

export default function CalendarPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [dates, setDates] = useState<KeyDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<KeyDateForm>(emptyForm);

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
      .from("key_dates")
      .select("*")
      .eq("supplier_id", supplier.id)
      .order("datetime", { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as KeyDateRow[];
    setDates(rows);
    setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
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

  const selected = useMemo(() => dates.find((item) => item.id === selectedId) ?? null, [dates, selectedId]);

  const startCreate = () => {
    setEditingId("new");
    setForm(emptyForm);
  };

  const startEdit = () => {
    if (!selected) return;
    setEditingId(selected.id);
    setForm(formFromKeyDate(selected));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const saveKeyDate = async () => {
    if (!supabase || !supplierId) return;
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.datetime_local) {
      setError("Date and time are required.");
      return;
    }

    const reminderMinutes = Number.parseInt(form.reminder_minutes || "0", 10);
    if (Number.isNaN(reminderMinutes) || reminderMinutes < 0) {
      setError("Reminder minutes must be 0 or more.");
      return;
    }

    setError(null);
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      datetime: new Date(form.datetime_local).toISOString(),
      reminder_minutes: reminderMinutes,
    };

    if (editingId === "new") {
      const { data, error: insertError } = await supabase
        .from("key_dates")
        .insert({
          supplier_id: supplierId,
          ...payload,
        })
        .select("id")
        .single<{ id: string }>();

      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }

      await loadData();
      setSelectedId(data?.id ?? null);
      setEditingId(null);
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error: updateError } = await supabase
        .from("key_dates")
        .update(payload)
        .eq("id", editingId)
        .eq("supplier_id", supplierId);

      if (updateError) {
        setSaving(false);
        setError(updateError.message);
        return;
      }

      await loadData();
      setEditingId(null);
    }

    setSaving(false);
  };

  const deleteKeyDate = async () => {
    if (!supabase || !supplierId || !selected?.id) return;
    const confirmed = window.confirm("Delete this key date?");
    if (!confirmed) return;

    setSaving(true);
    const { error: deleteError } = await supabase
      .from("key_dates")
      .delete()
      .eq("id", selected.id)
      .eq("supplier_id", supplierId);
    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSelectedId(null);
    await loadData();
  };

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

  const isEditing = editingId !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">Key dates synced from Supabase. You can now create and edit entries.</p>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          New key date
        </button>
      </div>

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
                      {formatDateTime(pickFirstText(item, ["datetime", "date"]))}
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
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">{isEditing ? "Edit key date" : "Date details"}</h3>
            {!isEditing && selected ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={startEdit}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={deleteKeyDate}
                  disabled={saving}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
          {isEditing ? (
            <div className="space-y-2 text-sm">
              <label className="block text-xs text-zinc-600">
                Title
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Date and time
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.datetime_local}
                  onChange={(e) => setForm((prev) => ({ ...prev, datetime_local: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Reminder (minutes before)
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.reminder_minutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, reminder_minutes: e.target.value }))}
                />
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={saveKeyDate}
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
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
          ) : !selected ? (
            <p className="mt-3 text-sm text-zinc-600">Select a key date to view details.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(selected)
                .filter(([key, value]) => value !== null && value !== "" && !isTechnicalField(key))
                .slice(0, 18)
                .map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-black/10 px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">{formatLabel(key)}</dt>
                    <dd className="mt-1 break-words text-zinc-800">
                      {key === "datetime" ? formatDateTime(String(value)) : String(value)}
                    </dd>
                  </div>
                ))}
            </dl>
          )}
        </aside>
      </div>
    </div>
  );
}
