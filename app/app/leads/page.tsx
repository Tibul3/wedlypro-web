"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type LeadRow = {
  id: string;
  supplier_id?: string | null;
  [key: string]: unknown;
};

type LeadColumn = {
  key: string;
  title: string;
  items: LeadRow[];
};

type LeadForm = {
  status: string;
  full_name: string;
  email: string;
  phone: string;
  wedding_date: string;
  venue: string;
  source: string;
  notes: string;
};

type TimelineNote = {
  id: string;
  body: string;
  created_at: string | null;
};

const defaultStatusOrder = ["new", "contacted", "discovery_booked", "quoted", "won", "lost", "converted", "booked"];
const hiddenByDefaultStatuses = new Set(["converted", "archived", "lost"]);

const statusOptions = [
  "New",
  "Contacted",
  "Discovery booked",
  "Quoted",
  "Won",
  "Lost",
  "Converted",
  "Booked",
];

const emptyForm: LeadForm = {
  status: "New",
  full_name: "",
  email: "",
  phone: "",
  wedding_date: "",
  venue: "",
  source: "",
  notes: "",
};

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

function leadFieldLabel(key: string): string {
  if (key === "name_1" || key === "name") return "Full name";
  if (key === "name_2") return "Partner's name";
  return statusTitle(key);
}

function leadDisplayName(lead: LeadRow): string {
  const primary = pickFirstText(lead, ["name_1", "name", "lead_name", "display_name", "email"]);
  const secondary = pickFirstText(lead, ["name_2"]);
  if (primary && secondary) return `${primary} & ${secondary}`;
  return primary ?? `Lead ${String(lead.id).slice(0, 8)}`;
}

function leadSubline(lead: LeadRow): string {
  return pickFirstText(lead, ["email", "phone", "wedding_date", "source"]) ?? "No extra details";
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

function isTechnicalField(key: string): boolean {
  return (
    key === "id" ||
    key === "supplier_id" ||
    key === "created_at" ||
    key === "updated_at" ||
    key.endsWith("_id") ||
    key.endsWith("_token")
  );
}

function formFromLead(lead: LeadRow): LeadForm {
  return {
    status: pickFirstText(lead, ["status"]) ?? "New",
    full_name: pickFirstText(lead, ["name_1", "name"]) ?? "",
    email: pickFirstText(lead, ["email"]) ?? "",
    phone: pickFirstText(lead, ["phone"]) ?? "",
    wedding_date: pickFirstText(lead, ["wedding_date"]) ?? "",
    venue: pickFirstText(lead, ["venue"]) ?? "",
    source: pickFirstText(lead, ["source"]) ?? "",
    notes: pickFirstText(lead, ["notes"]) ?? "",
  };
}

export default function LeadsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showArchivedConverted, setShowArchivedConverted] = useState(false);

  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [form, setForm] = useState<LeadForm>(emptyForm);
  const [timelineNotes, setTimelineNotes] = useState<TimelineNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteBody, setEditingNoteBody] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

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
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as LeadRow[];
    setLeads(rows);
    setSelectedLeadId((prev) => prev ?? rows[0]?.id ?? null);
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

  const visibleLeads = useMemo(() => {
    if (showArchivedConverted) return leads;
    return leads.filter((lead) => {
      const status = normalizeStatus(pickFirstText(lead, ["status", "lead_status", "stage"]));
      return !hiddenByDefaultStatuses.has(status);
    });
  }, [leads, showArchivedConverted]);

  const columns = useMemo(() => buildColumns(visibleLeads), [visibleLeads]);

  useEffect(() => {
    if (!selectedLeadId) return;
    if (!visibleLeads.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(visibleLeads[0]?.id ?? null);
    }
  }, [visibleLeads, selectedLeadId]);

  const selectedLead = useMemo(
    () => visibleLeads.find((lead) => lead.id === selectedLeadId) ?? null,
    [visibleLeads, selectedLeadId],
  );

  const loadTimelineNotes = async (leadId: string) => {
    if (!supabase || !supplierId) return;
    setNotesLoading(true);
    const { data, error: notesError } = await supabase
      .from("lead_notes")
      .select("id,body,created_at")
      .eq("lead_id", leadId)
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });

    if (notesError) {
      setNotesLoading(false);
      setError(notesError.message);
      return;
    }

    setTimelineNotes((data as TimelineNote[]) ?? []);
    setNotesLoading(false);
  };

  useEffect(() => {
    setNoteInput("");
    setEditingNoteId(null);
    setEditingNoteBody("");
    if (!selectedLead?.id) {
      setTimelineNotes([]);
      return;
    }
    void loadTimelineNotes(selectedLead.id);
  }, [selectedLead?.id, supplierId]);

  const startCreate = () => {
    setEditingLeadId("new");
    setForm(emptyForm);
  };

  const startEdit = () => {
    if (!selectedLead) return;
    setEditingLeadId(selectedLead.id);
    setForm(formFromLead(selectedLead));
  };

  const cancelEdit = () => {
    setEditingLeadId(null);
    setForm(emptyForm);
  };

  const saveLead = async () => {
    if (!supabase) return;
    if (!supplierId) {
      setError("Supplier profile missing.");
      return;
    }

    if (!form.full_name.trim()) {
      setError("Lead name is required.");
      return;
    }

    setError(null);
    setSaving(true);

    const payload = {
      supplier_id: supplierId,
      status: form.status.trim() || "New",
      name_1: form.full_name.trim(),
      name_2: null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      wedding_date: form.wedding_date || null,
      venue: form.venue.trim() || null,
      source: form.source.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editingLeadId === "new") {
      const { data, error: insertError } = await supabase
        .from("leads")
        .insert(payload)
        .select("id")
        .single<{ id: string }>();

      if (insertError) {
        setSaving(false);
        setError(insertError.message);
        return;
      }

      await loadData();
      setSelectedLeadId(data?.id ?? null);
      setEditingLeadId(null);
      setSaving(false);
      return;
    }

    if (editingLeadId) {
      const { error: updateError } = await supabase
        .from("leads")
        .update(payload)
        .eq("id", editingLeadId);

      if (updateError) {
        setSaving(false);
        setError(updateError.message);
        return;
      }

      await loadData();
      setEditingLeadId(null);
    }

    setSaving(false);
  };

  const deleteLead = async () => {
    if (!supabase || !selectedLead?.id) return;
    const confirmed = window.confirm("Delete this lead permanently?");
    if (!confirmed) return;

    setSaving(true);
    const { error: deleteError } = await supabase.from("leads").delete().eq("id", selectedLead.id);
    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSelectedLeadId(null);
    await loadData();
  };

  const addNote = async () => {
    if (!supabase || !supplierId || !selectedLead?.id) return;
    if (!noteInput.trim()) return;
    setSavingNote(true);
    const { error: insertError } = await supabase.from("lead_notes").insert({
      supplier_id: supplierId,
      lead_id: selectedLead.id,
      body: noteInput.trim(),
    });
    setSavingNote(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNoteInput("");
    await loadTimelineNotes(selectedLead.id);
  };

  const saveEditedNote = async () => {
    if (!supabase || !editingNoteId || !selectedLead?.id || !supplierId) return;
    if (!editingNoteBody.trim()) return;
    setSavingNote(true);
    const { error: updateError } = await supabase
      .from("lead_notes")
      .update({ body: editingNoteBody.trim() })
      .eq("id", editingNoteId)
      .eq("supplier_id", supplierId);
    setSavingNote(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditingNoteId(null);
    setEditingNoteBody("");
    await loadTimelineNotes(selectedLead.id);
  };

  const deleteNote = async (noteId: string) => {
    if (!supabase || !supplierId || !selectedLead?.id) return;
    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) return;
    setDeletingNoteId(noteId);
    const { error: deleteError } = await supabase
      .from("lead_notes")
      .delete()
      .eq("id", noteId)
      .eq("supplier_id", supplierId);
    setDeletingNoteId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadTimelineNotes(selectedLead.id);
  };

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading leads...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const isEditing = editingLeadId !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">Board view synced from Supabase. You can now create and edit leads.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startCreate}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            New lead
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
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
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">{isEditing ? "Edit lead" : "Lead details"}</h3>
            {!isEditing && selectedLead ? (
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
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-zinc-600">
                Full name
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
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
                Source
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.source}
                  onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
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
                  onClick={saveLead}
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save lead"}
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
          ) : !selectedLead ? (
            <p className="text-sm text-zinc-600">Select a lead card to view details.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={deleteLead}
                  disabled={saving}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>

              <dl className="space-y-2 text-sm">
                {Object.entries(selectedLead)
                  .filter(([key, value]) => value !== null && value !== "" && !isTechnicalField(key))
                  .slice(0, 18)
                  .map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-black/10 px-3 py-2">
                      <dt className="text-xs uppercase tracking-wide text-zinc-500">{leadFieldLabel(key)}</dt>
                      <dd className="mt-1 break-words text-zinc-800">{String(value)}</dd>
                    </div>
                  ))}
              </dl>

              <section className="rounded-lg border border-black/10 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Timeline notes</h4>
                <div className="mt-2 flex gap-2">
                  <input
                    className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                    placeholder="Add note..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addNote}
                    disabled={savingNote || !noteInput.trim()}
                    className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-zinc-700 disabled:opacity-60"
                  >
                    Add
                  </button>
                </div>
                {notesLoading ? <p className="mt-2 text-xs text-zinc-500">Loading notes...</p> : null}
                <div className="mt-2 space-y-2">
                  {timelineNotes.map((note) => (
                    <div key={note.id} className="rounded-lg border border-black/10 px-2.5 py-2">
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                            value={editingNoteBody}
                            onChange={(e) => setEditingNoteBody(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveEditedNote}
                              disabled={savingNote || !editingNoteBody.trim()}
                              className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-zinc-700 disabled:opacity-60"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(null);
                                setEditingNoteBody("");
                              }}
                              className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-zinc-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="break-words text-sm text-zinc-800">{note.body}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {note.created_at ? new Date(note.created_at).toLocaleString("en-GB") : "No date"}
                          </p>
                          <div className="mt-1 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteBody(note.body);
                              }}
                              className="rounded-lg border border-black/10 px-2 py-1 text-[11px] text-zinc-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteNote(note.id)}
                              disabled={deletingNoteId === note.id}
                              className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-700 disabled:opacity-60"
                            >
                              {deletingNoteId === note.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {!notesLoading && timelineNotes.length === 0 ? (
                    <p className="text-xs text-zinc-500">No notes yet.</p>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
