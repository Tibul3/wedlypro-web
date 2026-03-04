"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type SupplierRow = {
  id: string;
};

type ClientRow = {
  id: string;
  name_1: string | null;
  name_2: string | null;
  email: string | null;
};

type InvoiceContent = {
  invoiceNumber?: string;
  [key: string]: unknown;
};

type InvoiceRow = {
  id: string;
  client_id: string;
  supplier_id: string;
  status: "draft" | "sent" | "paid" | "signed";
  total: number;
  subtotal: number;
  currency: string;
  content_json: InvoiceContent | null;
  pdf_path: string | null;
  sent_at: string | null;
  invoice_paid_at: string | null;
  created_at: string;
};

type PaymentStatus = "all" | "draft" | "unpaid" | "paid";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB");
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(Number.isFinite(value) ? value : 0);
}

function clientDisplayName(client: ClientRow | null): string {
  if (!client) return "Unknown client";
  const name1 = client.name_1?.trim() || "";
  const name2 = client.name_2?.trim() || "";
  if (name1 && name2) return `${name1} & ${name2}`;
  return name1 || name2 || `Client ${client.id.slice(0, 8)}`;
}

function invoiceNumber(invoice: InvoiceRow): string {
  const raw = invoice.content_json?.invoiceNumber;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "-";
}

function paymentStatus(invoice: InvoiceRow): Exclude<PaymentStatus, "all"> {
  return invoice.status === "paid" ? "paid" : invoice.status === "sent" ? "unpaid" : "draft";
}

function paymentStatusLabel(status: Exclude<PaymentStatus, "all">): string {
  if (status === "paid") return "Paid";
  if (status === "unpaid") return "Unpaid";
  return "Draft";
}

function statusClass(status: Exclude<PaymentStatus, "all">): string {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "unpaid") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

export default function PaymentsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus>("all");
  const [openingPdf, setOpeningPdf] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

    const { data: supplierData, error: supplierError } = await supabase
      .from("suppliers")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle<SupplierRow>();

    if (supplierError || !supplierData) {
      setError(supplierError?.message ?? "Supplier profile missing.");
      setLoading(false);
      return;
    }

    setSupplierId(supplierData.id);

    const [{ data: invoiceData, error: invoiceError }, { data: clientData, error: clientError }] =
      await Promise.all([
        supabase
          .from("documents")
          .select(
            "id,client_id,supplier_id,status,total,subtotal,currency,content_json,pdf_path,sent_at,invoice_paid_at,created_at",
          )
          .eq("supplier_id", supplierData.id)
          .eq("type", "invoice")
          .order("created_at", { ascending: false }),
        supabase
          .from("clients")
          .select("id,name_1,name_2,email")
          .eq("supplier_id", supplierData.id)
          .order("created_at", { ascending: false }),
      ]);

    if (invoiceError) {
      setError(invoiceError.message);
      setLoading(false);
      return;
    }
    if (clientError) {
      setError(clientError.message);
      setLoading(false);
      return;
    }

    const nextInvoices = (invoiceData ?? []) as InvoiceRow[];
    const nextClients = (clientData ?? []) as ClientRow[];

    setInvoices(nextInvoices);
    setClients(nextClients);
    setSelectedId((prev) => prev ?? nextInvoices[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [supabase]);

  const clientsById = useMemo(() => {
    const map = new Map<string, ClientRow>();
    for (const client of clients) map.set(client.id, client);
    return map;
  }, [clients]);

  const visibleInvoices = useMemo(() => {
    if (statusFilter === "all") return invoices;
    return invoices.filter((invoice) => paymentStatus(invoice) === statusFilter);
  }, [invoices, statusFilter]);

  const counts = useMemo(() => {
    const base = { all: invoices.length, draft: 0, unpaid: 0, paid: 0 };
    for (const invoice of invoices) {
      base[paymentStatus(invoice)] += 1;
    }
    return base;
  }, [invoices]);

  useEffect(() => {
    if (!selectedId) return;
    if (!visibleInvoices.some((invoice) => invoice.id === selectedId)) {
      setSelectedId(visibleInvoices[0]?.id ?? null);
    }
  }, [visibleInvoices, selectedId]);

  const selected = useMemo(
    () => visibleInvoices.find((invoice) => invoice.id === selectedId) ?? null,
    [visibleInvoices, selectedId],
  );

  const openSelectedPdf = async () => {
    if (!supabase || !selected?.pdf_path) return;
    setError(null);
    setNotice(null);
    setOpeningPdf(true);

    const { data, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrl(selected.pdf_path, 60 * 60);

    setOpeningPdf(false);

    if (signedError || !data?.signedUrl) {
      setError(signedError?.message ?? "Unable to open invoice PDF.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const updateSelectedStatus = async (target: "sent" | "paid") => {
    if (!supabase || !selected || !supplierId) return;

    setError(null);
    setNotice(null);
    setUpdatingStatus(true);

    const payload: Record<string, unknown> = { status: target };
    if (target === "sent") {
      payload.sent_at = selected.sent_at ?? new Date().toISOString();
      payload.invoice_paid_at = null;
      payload.invoice_paid_method = null;
      payload.invoice_paid_reference = null;
    }
    if (target === "paid") {
      payload.sent_at = selected.sent_at ?? new Date().toISOString();
      payload.invoice_paid_at = new Date().toISOString();
      payload.invoice_paid_method = "manual";
      payload.invoice_paid_reference = "web";
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update(payload)
      .eq("id", selected.id)
      .eq("supplier_id", supplierId);

    setUpdatingStatus(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadData();
    setSelectedId(selected.id);
    setNotice(target === "paid" ? "Invoice marked as paid." : "Invoice marked as unpaid.");
  };

  if (loading) return <p className="text-sm text-zinc-600">Loading payments...</p>;

  if (error && !supplierId) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load payments: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">Track invoice payment state and quick actions from one place.</p>
        <div className="flex flex-wrap gap-2">
          {(["all", "draft", "unpaid", "paid"] as PaymentStatus[]).map((status) => (
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
              {status === "all" ? "All" : paymentStatusLabel(status)} ({counts[status] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-black/10 bg-zinc-50 p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Invoices ({visibleInvoices.length})</h2>
          <div className="mt-3 space-y-2">
            {visibleInvoices.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/10 bg-white px-3 py-3 text-xs text-zinc-500">
                No invoices found.
              </p>
            ) : (
              visibleInvoices.map((invoice) => {
                const active = selectedId === invoice.id;
                const status = paymentStatus(invoice);
                const linkedClient = clientsById.get(invoice.client_id) ?? null;
                return (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => setSelectedId(invoice.id)}
                    className={`w-full min-w-0 overflow-hidden rounded-lg border px-3 py-2 text-left transition ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/10 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{clientDisplayName(linkedClient)}</p>
                    <p className={`mt-1 truncate text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                      {formatMoney(Number(invoice.total || 0), invoice.currency)} - {paymentStatusLabel(status)}
                    </p>
                    <p className={`mt-1 truncate text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                      Created {formatDateTime(invoice.created_at)}
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
            <p className="mt-3 text-sm text-zinc-600">Select an invoice to view payment details.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Client</p>
                <p className="mt-1 text-zinc-900">{clientDisplayName(clientsById.get(selected.client_id) ?? null)}</p>
              </div>

              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Client email</p>
                <p className="mt-1 break-words text-zinc-900">{clientsById.get(selected.client_id)?.email ?? "-"}</p>
              </div>

              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Invoice number</p>
                <p className="mt-1 text-zinc-900">{invoiceNumber(selected)}</p>
              </div>

              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Status</p>
                <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(paymentStatus(selected))}`}>
                  {paymentStatusLabel(paymentStatus(selected))}
                </span>
              </div>

              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Total</p>
                <p className="mt-1 text-zinc-900">{formatMoney(Number(selected.total || 0), selected.currency)}</p>
              </div>

              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Created</p>
                <p className="mt-1 text-zinc-900">{formatDateTime(selected.created_at)}</p>
              </div>

              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Sent at</p>
                <p className="mt-1 text-zinc-900">{formatDateTime(selected.sent_at)}</p>
              </div>

              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Paid at</p>
                <p className="mt-1 text-zinc-900">{formatDateTime(selected.invoice_paid_at)}</p>
              </div>

              <div className="rounded-lg border border-black/10 bg-zinc-50 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Actions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/app/documents?selected=${selected.id}`}
                    className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    Open invoice
                  </Link>

                  {selected.pdf_path ? (
                    <button
                      type="button"
                      onClick={openSelectedPdf}
                      disabled={openingPdf || updatingStatus}
                      className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {openingPdf ? "Opening..." : "Open PDF"}
                    </button>
                  ) : null}

                  {paymentStatus(selected) !== "paid" ? (
                    <button
                      type="button"
                      onClick={() => void updateSelectedStatus("paid")}
                      disabled={updatingStatus || openingPdf}
                      className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingStatus ? "Please wait..." : "Mark paid"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void updateSelectedStatus("sent")}
                      disabled={updatingStatus || openingPdf}
                      className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingStatus ? "Please wait..." : "Mark unpaid"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
