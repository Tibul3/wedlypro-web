"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type PaymentRow = {
  id: string;
  [key: string]: unknown;
};

const statusOrder = ["paid", "unpaid", "overdue"];

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickFirstText(record: PaymentRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = toText(record[key]);
    if (value) return value;
  }
  return null;
}

function pickFirstNumber(record: PaymentRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== null) return value;
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

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB");
}

function isTechnicalField(key: string): boolean {
  return key === "id" || key === "supplier_id" || key.endsWith("_id") || key.endsWith("_token");
}

function paymentStatus(row: PaymentRow): string {
  const raw = pickFirstText(row, ["payment_status", "status", "invoice_status"]);
  return raw ? raw.toLowerCase() : "unknown";
}

function paymentTitle(row: PaymentRow): string {
  return (
    pickFirstText(row, ["invoice_number", "title", "document_title", "client_name", "name", "email"]) ??
    `Payment ${String(row.id).slice(0, 8)}`
  );
}

function paymentAmount(row: PaymentRow): string {
  const amount = pickFirstNumber(row, ["amount_due", "amount", "total", "total_amount"]);
  if (amount === null) return "Amount not set";
  return `£${amount.toFixed(2)}`;
}

function paymentDate(row: PaymentRow): string {
  const raw = pickFirstText(row, ["due_date", "event_date", "issued_at", "created_at"]);
  return raw ? formatDateTime(raw) : "No date";
}

function detailValue(key: string, value: unknown): string {
  const raw = toText(value);
  if (!raw) return "-";
  if (key.endsWith("_at") || key.includes("date") || key.includes("time")) {
    return formatDateTime(raw);
  }
  return raw;
}

export default function PaymentsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openingPdf, setOpeningPdf] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadPayments() {
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

      const docs = (data ?? []) as PaymentRow[];
      const inferredPayments = docs.filter((row) => {
        const type = pickFirstText(row, ["document_type", "type", "kind", "category"])?.toLowerCase() ?? "";
        const hasPaymentFields =
          pickFirstNumber(row, ["amount_due", "amount", "total", "total_amount"]) !== null ||
          pickFirstText(row, ["payment_status", "invoice_status"]) !== null;
        return type.includes("invoice") || hasPaymentFields;
      });

      setPayments(inferredPayments);
      setSelectedId(inferredPayments[0]?.id ?? null);
      setLoading(false);
    }

    void loadPayments();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: payments.length };
    for (const row of payments) {
      const status = paymentStatus(row);
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [payments]);

  const availableStatuses = useMemo(() => {
    const discovered = Object.keys(statusCounts).filter((status) => status !== "all");
    return [
      ...statusOrder.filter((status) => discovered.includes(status)),
      ...discovered.filter((status) => !statusOrder.includes(status)).sort(),
    ];
  }, [statusCounts]);

  const visiblePayments = useMemo(() => {
    if (statusFilter === "all") return payments;
    return payments.filter((row) => paymentStatus(row) === statusFilter);
  }, [payments, statusFilter]);

  useEffect(() => {
    if (!selectedId) return;
    if (!visiblePayments.some((row) => row.id === selectedId)) {
      setSelectedId(visiblePayments[0]?.id ?? null);
    }
  }, [visiblePayments, selectedId]);

  useEffect(() => {
    setDetailMessage(null);
  }, [selectedId]);

  const selected = useMemo(
    () => visiblePayments.find((row) => row.id === selectedId) ?? null,
    [visiblePayments, selectedId],
  );

  const openSelectedPdf = async () => {
    if (!supabase || !selected) return;
    const pdfPath = pickFirstText(selected, ["pdf_path"]);
    if (!pdfPath) return;

    setDetailMessage(null);
    setOpeningPdf(true);
    const { data, error: signedError } = await supabase.storage.from("documents").createSignedUrl(pdfPath, 60 * 60);
    setOpeningPdf(false);

    if (signedError || !data?.signedUrl) {
      setDetailMessage(signedError?.message ?? "Unable to open PDF.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) return <p className="text-sm text-zinc-600">Loading payments...</p>;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load payments: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">Read-only payment view inferred from invoice data.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-full border px-3 py-1 text-xs ${
              statusFilter === "all" ? "border-zinc-900 bg-zinc-900 text-white" : "border-black/10 bg-white text-zinc-700"
            }`}
          >
            All ({statusCounts.all ?? 0})
          </button>
          {availableStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-3 py-1 text-xs ${
                statusFilter === status
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-black/10 bg-white text-zinc-700"
              }`}
            >
              {formatLabel(status)} ({statusCounts[status] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-xl border border-black/10 bg-zinc-50 p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Payments ({visiblePayments.length})</h2>
          <div className="mt-3 space-y-2">
            {visiblePayments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/10 bg-white px-3 py-3 text-xs text-zinc-500">
                No payment records found.
              </p>
            ) : (
              visiblePayments.map((row) => {
                const active = selectedId === row.id;
                const status = paymentStatus(row);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-left transition ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/10 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{paymentTitle(row)}</p>
                    <p className={`mt-1 truncate text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                      {paymentAmount(row)} - {formatLabel(status)}
                    </p>
                    <p className={`mt-1 truncate text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                      {paymentDate(row)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-black/10 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Payment details</h3>
          {!selected ? (
            <p className="mt-3 text-sm text-zinc-600">Select a payment record to view details.</p>
          ) : (
            <>
              {pickFirstText(selected, ["pdf_path"]) ? (
                <div className="mt-3 rounded-lg border border-black/10 bg-zinc-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">PDF</p>
                  <button
                    type="button"
                    onClick={openSelectedPdf}
                    disabled={openingPdf}
                    className="mt-2 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {openingPdf ? "Opening..." : "Open PDF"}
                  </button>
                  {detailMessage ? <p className="mt-2 text-xs text-red-700">{detailMessage}</p> : null}
                </div>
              ) : null}
              <dl className="mt-3 space-y-2 text-sm">
                {Object.entries(selected)
                  .filter(([key, value]) => value !== null && value !== "" && !isTechnicalField(key))
                  .filter(([key]) => key !== "pdf_path" && key !== "content_json")
                  .slice(0, 18)
                  .map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-black/10 px-3 py-2">
                      <dt className="text-xs uppercase tracking-wide text-zinc-500">{formatLabel(key)}</dt>
                      <dd className="mt-1 break-words text-zinc-800">{detailValue(key, value)}</dd>
                    </div>
                  ))}
              </dl>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
