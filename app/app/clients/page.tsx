"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type ClientRow = {
  id: string;
  supplier_id?: string | null;
  [key: string]: unknown;
};

type ClientForm = {
  status: string;
  full_name: string;
  partner_name: string;
  partner_phone: string;
  email: string;
  phone: string;
  wedding_date: string;
  venue: string;
  notes: string;
};

type InspirationImage = {
  id: string;
  storage_path: string;
  file_name: string | null;
  caption: string | null;
  preview_url: string | null;
  created_at: string | null;
};

type DisplayItem = {
  key: string;
  label: string;
  value: string;
};

type TimelineNote = {
  id: string;
  body: string;
  created_at: string | null;
};

type ClientKeyDate = {
  id: string;
  title: string | null;
  datetime: string | null;
  reminder_minutes: number | null;
};

type InspirationViewer = {
  url: string;
  caption: string;
};

const hiddenByDefaultStatuses = new Set(["archived", "converted"]);
const statusOptions = ["active", "archived", "converted"];
const INSPIRATION_BUCKET = "inspiration";
const MAX_INSPIRATION_IMAGES = 20;

const emptyForm: ClientForm = {
  status: "active",
  full_name: "",
  partner_name: "",
  partner_phone: "",
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

function clientFieldLabel(key: string): string {
  if (key === "name_1" || key === "name") return "Full name";
  if (key === "name_2") return "Partner's name";
  return formatLabel(key);
}

function isTechnicalField(key: string): boolean {
  return (
    key === "id" ||
    key === "supplier_id" ||
    key === "created_at" ||
    key === "updated_at" ||
    key.endsWith("_id") ||
    key.endsWith("_token") ||
    key.startsWith("converted_from_")
  );
}

function extractHomeAddress(notes: string | null): string {
  if (!notes) return "";
  const match = notes.match(/^Home address:\s*(.+)$/im);
  return match?.[1]?.trim() ?? "";
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

function extractPartnerPhone(notes: string | null): string {
  if (!notes) return "";
  const match = notes.match(/^Partner phone:\s*(.+)$/im);
  return match?.[1]?.trim() ?? "";
}

function stripPartnerPhoneFromNotes(notes: string | null): string {
  if (!notes) return "";
  return notes
    .split("\n")
    .filter((line) => !line.trim().toLowerCase().startsWith("partner phone:"))
    .join("\n")
    .trim();
}

function stripStructuredClientNotes(notes: string | null): string {
  if (!notes) return "";
  return notes
    .split("\n")
    .filter((line) => {
      const normalized = line.trim().toLowerCase();
      return !normalized.startsWith("partner phone:") && !normalized.startsWith("home address:");
    })
    .join("\n")
    .trim();
}

async function resolveInspirationPreviewUrl(
  supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  supplierId: string,
  clientId: string,
  storagePath: string,
  fileName: string | null,
): Promise<string | null> {
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) return storagePath;

  const normalized = storagePath.trim();
  const candidates = [
    normalized,
    normalized.startsWith("/") ? normalized.slice(1) : normalized,
    normalized.replace(/^inspiration\//, ""),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const { data, error } = await supabase.storage.from(INSPIRATION_BUCKET).createSignedUrl(candidate, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  if (fileName) {
    const { data: listed, error: listError } = await supabase.storage
      .from(INSPIRATION_BUCKET)
      .list(`${supplierId}/${clientId}`, { limit: 200, sortBy: { column: "name", order: "asc" } });
    if (!listError && listed) {
      const matched = listed.find((item) => item.name.toLowerCase() === fileName.toLowerCase());
      if (matched) {
        const fallbackPath = `${supplierId}/${clientId}/${matched.name}`;
        const { data, error } = await supabase.storage.from(INSPIRATION_BUCKET).createSignedUrl(fallbackPath, 3600);
        if (!error && data?.signedUrl) return data.signedUrl;
      }
    }
  }

  return null;
}

function formFromClient(client: ClientRow): ClientForm {
  const rawNotes = pickFirstText(client, ["notes"]);
  return {
    status: pickFirstText(client, ["status"]) ?? "active",
    full_name: pickFirstText(client, ["name_1", "name", "client_name"]) ?? "",
    partner_name: pickFirstText(client, ["name_2"]) ?? "",
    partner_phone: extractPartnerPhone(rawNotes),
    email: pickFirstText(client, ["email"]) ?? "",
    phone: pickFirstText(client, ["phone"]) ?? "",
    wedding_date: pickFirstText(client, ["wedding_date", "event_date"]) ?? "",
    venue: pickFirstText(client, ["venue"]) ?? "",
    notes: stripPartnerPhoneFromNotes(rawNotes),
  };
}

function clientDisplayItems(client: ClientRow): DisplayItem[] {
  const notes = pickFirstText(client, ["notes"]);
  const ordered: DisplayItem[] = [];
  const push = (key: string, label: string, value: string | null) => {
    if (!value) return;
    ordered.push({ key, label, value });
  };

  push("status", "Status", pickFirstText(client, ["status"]));
  push("full_name", "Full name", pickFirstText(client, ["name_1", "name", "client_name"]));
  push("partner_name", "Partner's name", pickFirstText(client, ["name_2"]));
  push("email", "Email", pickFirstText(client, ["email"]));
  push("phone", "Phone", pickFirstText(client, ["phone"]));
  push("partner_phone", "Partner's phone number", extractPartnerPhone(notes));
  push("wedding_date", "Wedding date", pickFirstText(client, ["wedding_date", "event_date"]));
  push("venue", "Venue", pickFirstText(client, ["venue"]));
  push("home_address", "Home address", extractHomeAddress(notes));
  push("notes", "Notes", stripStructuredClientNotes(notes));

  return ordered;
}

function formatDateTime(value: string | null): string {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB");
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
  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [uploadingInspiration, setUploadingInspiration] = useState(false);
  const [deletingInspirationId, setDeletingInspirationId] = useState<string | null>(null);
  const [inspirationCaption, setInspirationCaption] = useState("");
  const [inspirationError, setInspirationError] = useState<string | null>(null);
  const [refreshingImageId, setRefreshingImageId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<InspirationViewer | null>(null);
  const [timelineNotes, setTimelineNotes] = useState<TimelineNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteBody, setEditingNoteBody] = useState("");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [clientKeyDates, setClientKeyDates] = useState<ClientKeyDate[]>([]);
  const [keyDatesLoading, setKeyDatesLoading] = useState(false);

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

  const loadTimelineNotes = async (clientId: string) => {
    if (!supabase || !supplierId) return;
    setNotesLoading(true);
    const { data, error: notesError } = await supabase
      .from("client_notes")
      .select("id,body,created_at")
      .eq("client_id", clientId)
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

  const loadClientKeyDates = async (clientId: string) => {
    if (!supabase || !supplierId) return;
    setKeyDatesLoading(true);
    const { data, error: keyDatesError } = await supabase
      .from("key_dates")
      .select("id,title,datetime,reminder_minutes")
      .eq("client_id", clientId)
      .eq("supplier_id", supplierId)
      .order("datetime", { ascending: true });

    if (keyDatesError) {
      setKeyDatesLoading(false);
      setError(keyDatesError.message);
      return;
    }

    setClientKeyDates((data as ClientKeyDate[]) ?? []);
    setKeyDatesLoading(false);
  };

  const loadInspirations = async (clientId: string) => {
    if (!supabase || !supplierId) return;
    setInspirationLoading(true);
    setInspirationError(null);

    const { data, error: queryError } = await supabase
      .from("client_inspiration_images")
      .select("id,storage_path,file_name,caption,created_at")
      .eq("client_id", clientId)
      .eq("supplier_id", supplierId)
      .order("created_at", { ascending: false });

    if (queryError) {
      setInspirationImages([]);
      setInspirationLoading(false);
      setInspirationError(queryError.message);
      return;
    }

    const rows =
      (data as Array<{
        id: string;
        storage_path: string;
        file_name: string | null;
        caption: string | null;
        created_at: string | null;
      }> | null) ?? [];

    const hydrated = await Promise.all(
      rows.map(async (row) => {
        const previewUrl = await resolveInspirationPreviewUrl(
          supabase,
          supplierId,
          clientId,
          row.storage_path,
          row.file_name,
        );
        return {
          ...row,
          preview_url: previewUrl,
        };
      }),
    );

    setInspirationImages(hydrated);
    setInspirationLoading(false);
  };

  useEffect(() => {
    if (!selectedClient?.id) {
      setInspirationImages([]);
      setInspirationCaption("");
      setInspirationError(null);
      setTimelineNotes([]);
      setClientKeyDates([]);
      setNoteInput("");
      setEditingNoteId(null);
      setEditingNoteBody("");
      return;
    }
    void loadInspirations(selectedClient.id);
    void loadTimelineNotes(selectedClient.id);
    void loadClientKeyDates(selectedClient.id);
  }, [selectedClient?.id, supplierId]);

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
    if (!form.full_name.trim()) {
      setError("Client name is required.");
      return;
    }

    setError(null);
    setSaving(true);

    const notesParts: string[] = [];
    if (form.notes.trim()) notesParts.push(form.notes.trim());
    if (form.partner_phone.trim()) notesParts.push(`Partner phone: ${form.partner_phone.trim()}`);

    const payload = {
      supplier_id: supplierId,
      status: form.status.trim().toLowerCase() || "active",
      name_1: form.full_name.trim(),
      name_2: form.partner_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      wedding_date: form.wedding_date || null,
      venue: form.venue.trim() || null,
      notes: notesParts.length > 0 ? notesParts.join("\n") : null,
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

  const handleUploadInspiration = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !supabase || !supplierId || !selectedClient?.id) return;

    if (!file.type.startsWith("image/")) {
      setInspirationError("Only image files are allowed.");
      return;
    }
    if (inspirationImages.length >= MAX_INSPIRATION_IMAGES) {
      setInspirationError(`Maximum ${MAX_INSPIRATION_IMAGES} images per client.`);
      return;
    }

    setInspirationError(null);
    setUploadingInspiration(true);

    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileSuffix = Math.random().toString(36).slice(2, 8);
    const storagePath = `${supplierId}/${selectedClient.id}/web-inspo-${Date.now()}-${fileSuffix}.${fileExtension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(INSPIRATION_BUCKET)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        setUploadingInspiration(false);
        setInspirationError(uploadError.message);
        return;
      }

      const { error: insertError } = await supabase.from("client_inspiration_images").insert({
        supplier_id: supplierId,
        client_id: selectedClient.id,
        storage_path: storagePath,
        file_name: file.name,
        caption: inspirationCaption.trim() || null,
      });

      if (insertError) {
        await supabase.storage.from(INSPIRATION_BUCKET).remove([storagePath]);
        setUploadingInspiration(false);
        setInspirationError(insertError.message);
        return;
      }

      setInspirationCaption("");
      await loadInspirations(selectedClient.id);
    } finally {
      setUploadingInspiration(false);
    }
  };

  const handleDeleteInspiration = async (image: InspirationImage) => {
    if (!supabase || !supplierId) return;
    setInspirationError(null);
    setDeletingInspirationId(image.id);

    const { error: deleteError } = await supabase
      .from("client_inspiration_images")
      .delete()
      .eq("id", image.id)
      .eq("supplier_id", supplierId);

    if (deleteError) {
      setDeletingInspirationId(null);
      setInspirationError(deleteError.message);
      return;
    }

    await supabase.storage.from(INSPIRATION_BUCKET).remove([image.storage_path]);
    setInspirationImages((prev) => prev.filter((item) => item.id !== image.id));
    setDeletingInspirationId(null);
  };

  const refreshInspirationPreview = async (imageId: string) => {
    if (!supabase) return;
    const image = inspirationImages.find((item) => item.id === imageId);
    if (!image) return;

    setRefreshingImageId(imageId);
    const previewUrl = await resolveInspirationPreviewUrl(
      supabase,
      supplierId ?? "",
      selectedClient?.id ?? "",
      image.storage_path,
      image.file_name,
    );
    setRefreshingImageId(null);

    if (!previewUrl) {
      setInspirationError("Unable to refresh this image preview.");
      return;
    }

    setInspirationImages((prev) =>
      prev.map((item) => (item.id === imageId ? { ...item, preview_url: previewUrl } : item)),
    );
  };

  const archiveToggleClient = async () => {
    if (!supabase || !selectedClient?.id) return;
    const currentStatus = normalizeStatus(pickFirstText(selectedClient, ["status"]));
    const nextStatus = currentStatus === "archived" ? "active" : "archived";
    const confirmed = window.confirm(
      currentStatus === "archived" ? "Unarchive this client?" : "Archive this client?",
    );
    if (!confirmed) return;

    setSaving(true);
    const { error: updateError } = await supabase
      .from("clients")
      .update({ status: nextStatus })
      .eq("id", selectedClient.id);
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadData();
  };

  const deleteClient = async () => {
    if (!supabase || !selectedClient?.id) return;
    const confirmed = window.confirm("Delete this client permanently?");
    if (!confirmed) return;

    setSaving(true);
    const { error: deleteError } = await supabase.from("clients").delete().eq("id", selectedClient.id);
    setSaving(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSelectedClientId(null);
    await loadData();
  };

  const addNote = async () => {
    if (!supabase || !supplierId || !selectedClient?.id) return;
    if (!noteInput.trim()) return;
    setSavingNote(true);
    const { error: insertError } = await supabase.from("client_notes").insert({
      supplier_id: supplierId,
      client_id: selectedClient.id,
      body: noteInput.trim(),
    });
    setSavingNote(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNoteInput("");
    await loadTimelineNotes(selectedClient.id);
  };

  const saveEditedNote = async () => {
    if (!supabase || !supplierId || !selectedClient?.id || !editingNoteId) return;
    if (!editingNoteBody.trim()) return;
    setSavingNote(true);
    const { error: updateError } = await supabase
      .from("client_notes")
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
    await loadTimelineNotes(selectedClient.id);
  };

  const deleteNote = async (noteId: string) => {
    if (!supabase || !supplierId || !selectedClient?.id) return;
    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) return;
    setDeletingNoteId(noteId);
    const { error: deleteError } = await supabase
      .from("client_notes")
      .delete()
      .eq("id", noteId)
      .eq("supplier_id", supplierId);
    setDeletingNoteId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadTimelineNotes(selectedClient.id);
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
            <div className="flex items-center gap-2">
              {!isEditing && selectedClient ? (
                <Link
                  href={`/app/clients/${selectedClient.id}`}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  Open page
                </Link>
              ) : null}
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
                Full name
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.full_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-zinc-600">
                Partner's name (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.partner_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, partner_name: e.target.value }))}
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
                Partner's phone number (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  value={form.partner_phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, partner_phone: e.target.value }))}
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
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={archiveToggleClient}
                  disabled={saving}
                  className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {normalizeStatus(pickFirstText(selectedClient, ["status"])) === "archived"
                    ? "Unarchive"
                    : "Archive"}
                </button>
                <button
                  type="button"
                  onClick={deleteClient}
                  disabled={saving}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>

              <dl className="space-y-2 text-sm">
                {clientDisplayItems(selectedClient).map((item) => (
                  <div key={item.key} className="rounded-lg border border-black/10 px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">{item.label}</dt>
                    <dd className="mt-1 break-words text-zinc-800">{item.value}</dd>
                  </div>
                ))}
                {Object.entries(selectedClient)
                  .filter(([key, value]) => value !== null && value !== "" && !isTechnicalField(key))
                  .filter(([key]) => !["status", "name_1", "name_2", "name", "client_name", "email", "phone", "wedding_date", "event_date", "venue", "notes"].includes(key))
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-black/10 px-3 py-2">
                      <dt className="text-xs uppercase tracking-wide text-zinc-500">{clientFieldLabel(key)}</dt>
                      <dd className="mt-1 break-words text-zinc-800">{String(value)}</dd>
                    </div>
                  ))}
              </dl>

              <section className="rounded-lg border border-black/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Key dates</h4>
                  <Link
                    href={selectedClient ? `/app/calendar` : "/app/calendar"}
                    className="rounded-lg border border-black/10 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
                  >
                    Open calendar
                  </Link>
                </div>
                {keyDatesLoading ? <p className="text-xs text-zinc-500">Loading key dates...</p> : null}
                {!keyDatesLoading && clientKeyDates.length === 0 ? (
                  <p className="text-xs text-zinc-500">No key dates for this client.</p>
                ) : null}
                <div className="space-y-2">
                  {clientKeyDates.slice(0, 3).map((item) => (
                    <Link
                      key={item.id}
                      href={`/app/calendar?selected=${item.id}`}
                      className="block rounded-lg border border-black/10 px-2.5 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                    >
                      <p className="font-medium text-zinc-900">{item.title ?? "Untitled"}</p>
                      <p className="mt-1 text-zinc-600">{formatDateTime(item.datetime)}</p>
                    </Link>
                  ))}
                </div>
              </section>

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

              <section className="rounded-lg border border-black/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-700">
                    Inspirations ({inspirationImages.length})
                  </h4>
                </div>

                <label className="block text-xs text-zinc-600">
                  Caption (optional)
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                    value={inspirationCaption}
                    onChange={(e) => setInspirationCaption(e.target.value)}
                    placeholder="e.g. Floral arch reference"
                    maxLength={140}
                  />
                </label>

                <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50">
                  {uploadingInspiration ? "Uploading..." : "Add inspiration image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadInspiration}
                    disabled={uploadingInspiration || inspirationImages.length >= MAX_INSPIRATION_IMAGES}
                  />
                </label>

                {inspirationError ? <p className="mt-2 text-xs text-red-700">{inspirationError}</p> : null}
                {inspirationLoading ? <p className="mt-2 text-xs text-zinc-500">Loading images...</p> : null}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {inspirationImages.map((image) => (
                    <div key={image.id} className="rounded-lg border border-black/10 bg-zinc-50 p-2">
                      {image.preview_url ? (
                        <img
                          src={image.preview_url}
                          alt={image.caption ?? image.file_name ?? "Inspiration"}
                          className="h-24 w-full cursor-zoom-in rounded-md object-cover"
                          onClick={() =>
                            setViewer({
                              url: image.preview_url as string,
                              caption: image.caption || image.file_name || "Inspiration",
                            })
                          }
                          onError={() => void refreshInspirationPreview(image.id)}
                        />
                      ) : (
                        <div className="flex h-24 items-center justify-center rounded-md bg-zinc-200 text-xs text-zinc-600">
                          No preview
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void refreshInspirationPreview(image.id)}
                        disabled={refreshingImageId === image.id}
                        className="mt-1 rounded-md border border-black/10 px-2 py-1 text-[11px] text-zinc-700 disabled:opacity-60"
                      >
                        {refreshingImageId === image.id ? "Refreshing..." : "Refresh preview"}
                      </button>
                      <p className="mt-1 break-words text-[11px] text-zinc-600">
                        {image.caption || image.file_name || "No caption"}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleDeleteInspiration(image)}
                        disabled={deletingInspirationId === image.id}
                        className="mt-1 rounded-md border border-red-200 px-2 py-1 text-[11px] text-red-700 disabled:opacity-60"
                      >
                        {deletingInspirationId === image.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>

                {!inspirationLoading && inspirationImages.length === 0 ? (
                  <p className="mt-2 text-xs text-zinc-500">No inspiration images yet.</p>
                ) : null}
              </section>
            </div>
          )}
        </aside>
      </div>

      {viewer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setViewer(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <img src={viewer.url} alt={viewer.caption} className="max-h-[80vh] w-full object-contain bg-black" />
            <div className="flex items-center justify-between gap-3 p-3">
              <p className="text-sm text-zinc-700">{viewer.caption}</p>
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
