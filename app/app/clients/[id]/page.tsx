"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabaseClient";

type ClientRow = {
  id: string;
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
};

type InspirationViewer = {
  url: string;
  caption: string;
};

type DisplayItem = {
  key: string;
  label: string;
  value: string;
};

const INSPIRATION_BUCKET = "inspiration";
const MAX_INSPIRATION_IMAGES = 20;
const clientStatusOptions = ["active", "archived", "converted"];

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

function extractPartnerPhone(notes: string | null): string {
  if (!notes) return "";
  const match = notes.match(/^Partner phone:\s*(.+)$/im);
  return match?.[1]?.trim() ?? "";
}

function extractHomeAddress(notes: string | null): string {
  if (!notes) return "";
  const match = notes.match(/^Home address:\s*(.+)$/im);
  return match?.[1]?.trim() ?? "";
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
    notes: stripStructuredClientNotes(rawNotes),
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

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params?.id;
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ClientForm>({
    status: "active",
    full_name: "",
    partner_name: "",
    partner_phone: "",
    email: "",
    phone: "",
    wedding_date: "",
    venue: "",
    notes: "",
  });

  const [inspirationImages, setInspirationImages] = useState<InspirationImage[]>([]);
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [uploadingInspiration, setUploadingInspiration] = useState(false);
  const [deletingInspirationId, setDeletingInspirationId] = useState<string | null>(null);
  const [refreshingImageId, setRefreshingImageId] = useState<string | null>(null);
  const [inspirationCaption, setInspirationCaption] = useState("");
  const [inspirationError, setInspirationError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<InspirationViewer | null>(null);

  const loadInspirations = async (nextClientId: string, nextSupplierId: string) => {
    if (!supabase) return;
    setInspirationLoading(true);
    setInspirationError(null);

    const { data, error: queryError } = await supabase
      .from("client_inspiration_images")
      .select("id,storage_path,file_name,caption")
      .eq("client_id", nextClientId)
      .eq("supplier_id", nextSupplierId)
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
      }> | null) ?? [];

    const hydrated = await Promise.all(
      rows.map(async (row) => {
        const previewUrl = await resolveInspirationPreviewUrl(
          supabase,
          nextSupplierId,
          nextClientId,
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
    if (!supabase || !clientId) return;

    let mounted = true;
    (async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (sessionError || !session) {
        setLoading(false);
        setError("Please sign in again.");
        return;
      }

      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle<{ id: string }>();

      if (!mounted) return;
      if (supplierError || !supplier) {
        setLoading(false);
        setError("Supplier profile missing.");
        return;
      }

      setSupplierId(supplier.id);

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .eq("supplier_id", supplier.id)
        .maybeSingle<ClientRow>();

      if (!mounted) return;
      if (clientError || !clientData) {
        setLoading(false);
        setError("Client not found.");
        return;
      }

      setClient(clientData);
      setForm(formFromClient(clientData));
      await loadInspirations(clientId, supplier.id);
      if (!mounted) return;
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, clientId]);

  const refreshInspirationPreview = async (imageId: string) => {
    if (!supabase) return;
    const image = inspirationImages.find((item) => item.id === imageId);
    if (!image) return;
    setRefreshingImageId(imageId);
    const previewUrl = await resolveInspirationPreviewUrl(
      supabase,
      supplierId ?? "",
      clientId ?? "",
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

  const handleUploadInspiration = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !supabase || !supplierId || !clientId) return;
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
    const storagePath = `${supplierId}/${clientId}/web-inspo-${Date.now()}-${fileSuffix}.${fileExtension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(INSPIRATION_BUCKET)
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        setInspirationError(uploadError.message);
        setUploadingInspiration(false);
        return;
      }

      const { error: insertError } = await supabase.from("client_inspiration_images").insert({
        supplier_id: supplierId,
        client_id: clientId,
        storage_path: storagePath,
        file_name: file.name,
        caption: inspirationCaption.trim() || null,
      });

      if (insertError) {
        await supabase.storage.from(INSPIRATION_BUCKET).remove([storagePath]);
        setInspirationError(insertError.message);
        setUploadingInspiration(false);
        return;
      }

      setInspirationCaption("");
      await loadInspirations(clientId, supplierId);
    } finally {
      setUploadingInspiration(false);
    }
  };

  const handleDeleteInspiration = async (image: InspirationImage) => {
    if (!supabase || !supplierId) return;
    setDeletingInspirationId(image.id);
    setInspirationError(null);

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

  const handleSaveClient = async () => {
    if (!supabase || !supplierId || !clientId) return;
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
      status: form.status.trim().toLowerCase() || "active",
      name_1: form.full_name.trim(),
      name_2: form.partner_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      wedding_date: form.wedding_date || null,
      venue: form.venue.trim() || null,
      notes: notesParts.length ? notesParts.join("\n") : null,
    };

    const { error: updateError } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", clientId)
      .eq("supplier_id", supplierId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setClient((prev) => (prev ? { ...prev, ...payload } : prev));
    setIsEditing(false);
  };

  if (loading) return <p className="text-sm text-zinc-600">Loading client...</p>;
  if (error || !client) {
    return (
      <div className="space-y-3">
        <Link href="/app/clients" className="inline-flex rounded-lg border border-black/10 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
          Back to clients
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error || "Client not found."}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Client details</h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSaveClient}
                disabled={saving}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(client ? formFromClient(client) : form);
                  setIsEditing(false);
                }}
                disabled={saving}
                className="rounded-lg border border-black/10 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              Edit
            </button>
          )}
          <Link href="/app/clients" className="rounded-lg border border-black/10 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
            Back to clients
          </Link>
        </div>
      </div>

      {isEditing ? (
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <label className="block text-xs text-zinc-600">
            Status
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              {clientStatusOptions.map((status) => (
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
              type="email"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
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
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
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
          <label className="block text-xs text-zinc-600 md:col-span-2">
            Notes
            <textarea
              rows={4}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
        </div>
      ) : (
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          {clientDisplayItems(client).map((item) => (
            <div key={item.key} className="rounded-lg border border-black/10 px-3 py-2">
              <dt className="text-xs uppercase tracking-wide text-zinc-500">{item.label}</dt>
              <dd className="mt-1 break-words text-zinc-800">{item.value}</dd>
            </div>
          ))}
          {Object.entries(client)
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
      )}

      <section className="rounded-xl border border-black/10 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Inspirations ({inspirationImages.length})</h3>

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block min-w-56 flex-1 text-xs text-zinc-600">
            Caption (optional)
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              value={inspirationCaption}
              onChange={(e) => setInspirationCaption(e.target.value)}
              maxLength={140}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50">
            {uploadingInspiration ? "Uploading..." : "Add inspiration image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadInspiration}
              disabled={uploadingInspiration || inspirationImages.length >= MAX_INSPIRATION_IMAGES}
            />
          </label>
        </div>

        {inspirationError ? <p className="mt-2 text-xs text-red-700">{inspirationError}</p> : null}
        {inspirationLoading ? <p className="mt-2 text-xs text-zinc-500">Loading images...</p> : null}

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {inspirationImages.map((image) => (
            <div key={image.id} className="rounded-lg border border-black/10 bg-zinc-50 p-2">
              {image.preview_url ? (
                <img
                  src={image.preview_url}
                  alt={image.caption ?? image.file_name ?? "Inspiration"}
                  className="h-36 w-full cursor-zoom-in rounded-md object-cover"
                  onClick={() =>
                    setViewer({
                      url: image.preview_url as string,
                      caption: image.caption || image.file_name || "Inspiration",
                    })
                  }
                  onError={() => void refreshInspirationPreview(image.id)}
                />
              ) : (
                <div className="flex h-36 items-center justify-center rounded-md bg-zinc-200 text-xs text-zinc-600">
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
              <p className="mt-1 break-words text-[11px] text-zinc-600">{image.caption || image.file_name || "No caption"}</p>
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
