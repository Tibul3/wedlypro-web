"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type DocumentRow = {
  id: string;
  [key: string]: unknown;
};

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function pickFirstText(record: DocumentRow, keys: string[]): string | null {
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

function isTechnicalField(key: string): boolean {
  return key === "id" || key === "supplier_id" || key.endsWith("_id") || key.endsWith("_token");
}

function displayTitle(item: DocumentRow): string {
  return (
    pickFirstText(item, ["title", "document_title", "name", "subject", "invoice_number"]) ??
    `Document ${String(item.id).slice(0, 8)}`
  );
}

function displayType(item: DocumentRow): string {
  return pickFirstText(item, ["document_type", "type", "kind", "category"]) ?? "Document";
}

function displayStatus(item: DocumentRow): string {
  return pickFirstText(item, ["status", "document_status", "signature_status", "payment_status"]) ?? "Unknown";
}

function displayDate(item: DocumentRow): string {
  return pickFirstText(item, ["created_at", "updated_at", "issued_at", "sent_at"]) ?? "No date";
}

export default function DocumentsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    let mounted = true;

    async function loadDocuments() {
      if (!supabase) {
        if (mounted) {
          setError("Web app is not configured yet.");
          setLoading(false);
        }
        return;
      }

      const { data, error: queryError } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as DocumentRow[];
      setDocuments(rows);
      setSelectedId(rows[0]?.id ?? null);
      setLoading(false);
    }

    void loadDocuments();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const doc of documents) {
      set.add(displayType(doc).toLowerCase());
    }
    return Array.from(set).sort();
  }, [documents]);

  const visibleDocuments = useMemo(() => {
    if (typeFilter === "all") return documents;
    return documents.filter((doc) => displayType(doc).toLowerCase() === typeFilter);
  }, [documents, typeFilter]);

  useEffect(() => {
    if (!selectedId) return;
    if (!visibleDocuments.some((doc) => doc.id === selectedId)) {
      setSelectedId(visibleDocuments[0]?.id ?? null);
    }
  }, [visibleDocuments, selectedId]);

  const selected = useMemo(
    () => visibleDocuments.find((doc) => doc.id === selectedId) ?? null,
    [visibleDocuments, selectedId],
  );

  if (loading) return <p className="text-sm text-zinc-600">Loading documents...</p>;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load documents: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">Read-only documents synced from Supabase.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`rounded-full border px-3 py-1 text-xs ${
              typeFilter === "all" ? "border-zinc-900 bg-zinc-900 text-white" : "border-black/10 bg-white text-zinc-700"
            }`}
          >
            All
          </button>
          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`rounded-full border px-3 py-1 text-xs ${
                typeFilter === type ? "border-zinc-900 bg-zinc-900 text-white" : "border-black/10 bg-white text-zinc-700"
              }`}
            >
              {formatLabel(type)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-black/10 bg-zinc-50 p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Documents ({visibleDocuments.length})</h2>
          <div className="mt-3 space-y-2">
            {visibleDocuments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/10 bg-white px-3 py-3 text-xs text-zinc-500">
                No documents found.
              </p>
            ) : (
              visibleDocuments.map((doc) => {
                const active = selectedId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className={`w-full min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-left transition ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/10 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{displayTitle(doc)}</p>
                    <p className={`mt-1 truncate text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                      {formatLabel(displayType(doc))} - {displayStatus(doc)}
                    </p>
                    <p className={`mt-1 truncate text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                      {displayDate(doc)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-black/10 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Document details</h3>
          {!selected ? (
            <p className="mt-3 text-sm text-zinc-600">Select a document to view details.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {Object.entries(selected)
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
