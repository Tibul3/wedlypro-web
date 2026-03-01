"use client";

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type DocumentType = "quote" | "invoice" | "contract";
type DocumentStatus = "draft" | "sent" | "paid" | "signed";

type SupplierRow = {
  id: string;
  tier: string | null;
  plan: string | null;
  business_name: string | null;
  email: string | null;
  contact_name: string | null;
};

type ClientRow = {
  id: string;
  name_1: string | null;
  name_2: string | null;
  email: string | null;
  status: string | null;
};

type DocumentLineItem = {
  description: string;
  amount: number;
};

type ContractDetails = {
  servicesIncluded: string;
  deliverables: string;
  paymentSchedule: string;
  timeline: string;
  specialTerms: string;
};

type DocumentContent = {
  lineItems?: DocumentLineItem[];
  invoiceNumber?: string;
  contractDetails?: ContractDetails;
};

type DocumentRow = {
  id: string;
  client_id: string;
  supplier_id: string;
  type: DocumentType;
  status: DocumentStatus;
  currency: string;
  subtotal: number;
  total: number;
  content_json: DocumentContent | null;
  pdf_path: string | null;
  sent_at: string | null;
  signed_at: string | null;
  invoice_paid_at: string | null;
  signing_requested_at: string | null;
  signing_expires_at: string | null;
  created_at: string;
};

type LineItemInput = {
  id: string;
  description: string;
  amount: string;
};

type DocumentForm = {
  clientId: string;
  type: DocumentType;
  status: DocumentStatus;
  currency: string;
  invoiceNumber: string;
  lineItems: LineItemInput[];
  contractDetails: ContractDetails;
};

type EditorMode = "create" | "edit" | null;

const documentTypes: DocumentType[] = ["quote", "invoice", "contract"];
const documentStatuses: DocumentStatus[] = ["draft", "sent", "paid", "signed"];
const contractsUpgradeMessage = "Contracts are available on Professional. Upgrade in Billing to create contracts.";
const copyrightNotice = "© 2026 Wedly Pro. All rights reserved.";

const blankContractDetails: ContractDetails = {
  servicesIncluded: "",
  deliverables: "",
  paymentSchedule: "",
  timeline: "",
  specialTerms: "",
};

const blankForm: DocumentForm = {
  clientId: "",
  type: "quote",
  status: "draft",
  currency: "GBP",
  invoiceNumber: "",
  lineItems: [{ id: "item-1", description: "", amount: "" }],
  contractDetails: blankContractDetails,
};

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  return null;
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMoney(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB");
}

function clientDisplayName(client: ClientRow | null): string {
  if (!client) return "Unknown client";
  const name1 = client.name_1?.trim() || "";
  const name2 = client.name_2?.trim() || "";
  if (name1 && name2) return `${name1} & ${name2}`;
  if (name1) return name1;
  if (name2) return name2;
  return `Client ${client.id.slice(0, 8)}`;
}

function documentTitle(document: DocumentRow, client: ClientRow | null): string {
  const content = document.content_json;
  const invoiceNumber = content?.invoiceNumber?.trim();
  if (document.type === "invoice" && invoiceNumber) {
    return `Invoice ${invoiceNumber}`;
  }
  return `${formatLabel(document.type)} - ${clientDisplayName(client)}`;
}

function normalizeLineItems(items: LineItemInput[]): DocumentLineItem[] {
  return items
    .map((item) => ({
      description: item.description.trim(),
      amount: Number(item.amount),
    }))
    .filter((item) => item.description && Number.isFinite(item.amount) && item.amount > 0);
}

function nextStatus(type: DocumentType, status: DocumentStatus): DocumentStatus | null {
  if (type === "quote") return status === "draft" ? "sent" : null;
  if (type === "invoice") {
    if (status === "draft") return "sent";
    if (status === "sent") return "paid";
    return null;
  }
  if (type === "contract") {
    if (status === "draft") return "sent";
    if (status === "sent") return "signed";
    return null;
  }
  return null;
}

function statusActionLabel(type: DocumentType, status: DocumentStatus): string | null {
  const next = nextStatus(type, status);
  if (!next) return null;
  if (next === "sent") return "Mark sent";
  if (next === "paid") return "Mark paid";
  if (next === "signed") return "Mark signed";
  return null;
}

function displayDocumentStatus(type: DocumentType, status: DocumentStatus): string {
  if (type === "invoice" && status === "sent") return "Submitted";
  return formatLabel(status);
}

function isProfessionalSupplier(supplier: SupplierRow | null): boolean {
  if (!supplier) return false;
  return supplier.tier === "professional" || supplier.plan === "pro";
}

function slugifyFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "document";
}

function formFromDocument(document: DocumentRow): DocumentForm {
  const content = document.content_json ?? {};
  const contentItems = Array.isArray(content.lineItems) ? content.lineItems : [];
  const lineItems =
    contentItems.length > 0
      ? contentItems.map((item, index) => ({
          id: `item-${index + 1}`,
          description: String(item.description ?? ""),
          amount: Number.isFinite(item.amount) ? String(item.amount) : "",
        }))
      : [{ id: "item-1", description: "", amount: "" }];

  const nextContractDetails = {
    ...blankContractDetails,
    ...(content.contractDetails ?? {}),
  };

  return {
    clientId: document.client_id,
    type: document.type,
    status: document.status,
    currency: document.currency || "GBP",
    invoiceNumber: content.invoiceNumber ?? "",
    lineItems,
    contractDetails: nextContractDetails,
  };
}

function buildDocumentEmailTemplate(params: {
  documentType: DocumentType;
  supplierName: string;
  supplierSignoff: string;
  recipientName: string;
  totalLabel?: string | null;
  reviewUrl?: string | null;
  signingUrl?: string | null;
  contractSigned?: boolean;
}) {
  const typeLabel = params.documentType === "quote" ? "Quote" : params.documentType === "invoice" ? "Invoice" : "Contract";
  const isUnsignedContract = params.documentType === "contract" && !params.contractSigned;

  const subject =
    params.documentType === "contract"
      ? params.contractSigned
        ? `Signed contract from ${params.supplierName}`
        : `Contract from ${params.supplierName}`
      : `Your ${typeLabel.toLowerCase()} from ${params.supplierName}`;

  const lines: string[] = [`Hi ${params.recipientName},`, ""];
  if (params.documentType === "contract" && params.contractSigned) {
    lines.push(`Your signed contract from ${params.supplierName} is ready.`);
  } else if (isUnsignedContract) {
    lines.push(`Please review and sign your contract from ${params.supplierName}.`);
  } else {
    lines.push(`Your ${typeLabel.toLowerCase()} from ${params.supplierName} is ready.`);
  }

  if (params.totalLabel) {
    lines.push(`Total: ${params.totalLabel}`);
  }

  if (params.reviewUrl) {
    lines.push("", `Open document: ${params.reviewUrl}`);
  }
  if (params.signingUrl) {
    lines.push("", `Sign contract: ${params.signingUrl}`);
  }

  lines.push("", "Best regards,", params.supplierSignoff);

  const textBody = lines.join("\n");
  const htmlBody = `<p>${textBody.replace(/\n/g, "<br />")}</p>`;

  return {
    subject,
    textBody,
    htmlBody,
  };
}

export default function DocumentsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<
    | "status"
    | "pdf"
    | "open"
    | "email"
    | "signing"
    | "delete"
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | DocumentType>("all");

  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [form, setForm] = useState<DocumentForm>(blankForm);

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
      .select("id,tier,plan,business_name,email,contact_name")
      .eq("user_id", session.user.id)
      .maybeSingle<SupplierRow>();

    if (supplierError || !supplierData) {
      setError(supplierError?.message ?? "Supplier profile missing.");
      setLoading(false);
      return;
    }

    const [{ data: clientsData, error: clientsError }, { data: docsData, error: docsError }] = await Promise.all([
      supabase
        .from("clients")
        .select("id,name_1,name_2,email,status")
        .neq("status", "archived")
        .order("name_1", { ascending: true }),
      supabase
        .from("documents")
        .select(
          "id,client_id,supplier_id,type,status,currency,subtotal,total,content_json,pdf_path,sent_at,signed_at,invoice_paid_at,signing_requested_at,signing_expires_at,created_at",
        )
        .eq("supplier_id", supplierData.id)
        .order("created_at", { ascending: false }),
    ]);

    if (clientsError) {
      setError(clientsError.message);
      setLoading(false);
      return;
    }

    if (docsError) {
      setError(docsError.message);
      setLoading(false);
      return;
    }

    const nextClients = (clientsData ?? []) as ClientRow[];
    const nextDocs = (docsData ?? []) as DocumentRow[];

    setSupplier(supplierData);
    setClients(nextClients);
    setDocuments(nextDocs);
    setSelectedDocumentId((prev) => prev ?? nextDocs[0]?.id ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, [supabase]);

  const clientsById = useMemo(() => {
    const mapped = new Map<string, ClientRow>();
    for (const client of clients) mapped.set(client.id, client);
    return mapped;
  }, [clients]);

  const visibleDocuments = useMemo(() => {
    if (typeFilter === "all") return documents;
    return documents.filter((document) => document.type === typeFilter);
  }, [documents, typeFilter]);

  useEffect(() => {
    if (!selectedDocumentId) return;
    if (!visibleDocuments.some((document) => document.id === selectedDocumentId)) {
      setSelectedDocumentId(visibleDocuments[0]?.id ?? null);
    }
  }, [visibleDocuments, selectedDocumentId]);

  const selectedDocument = useMemo(
    () => visibleDocuments.find((document) => document.id === selectedDocumentId) ?? null,
    [visibleDocuments, selectedDocumentId],
  );

  const canCreateContracts = isProfessionalSupplier(supplier);

  const startCreate = () => {
    setError(null);
    setNotice(null);
    setEditorMode("create");
    setEditingDocumentId(null);
    setForm({
      ...blankForm,
      clientId: clients[0]?.id ?? "",
    });
  };

  const startEdit = () => {
    if (!selectedDocument) return;
    setError(null);
    setNotice(null);
    setEditorMode("edit");
    setEditingDocumentId(selectedDocument.id);
    setForm(formFromDocument(selectedDocument));
  };

  const cancelEditor = () => {
    setEditorMode(null);
    setEditingDocumentId(null);
    setForm(blankForm);
  };

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: `item-${Date.now().toString(36)}`, description: "", amount: "" }],
    }));
  };

  const updateLineItem = (id: string, patch: Partial<LineItemInput>) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const removeLineItem = (id: string) => {
    setForm((prev) => {
      if (prev.lineItems.length <= 1) return prev;
      return {
        ...prev,
        lineItems: prev.lineItems.filter((item) => item.id !== id),
      };
    });
  };

  const saveDocument = async () => {
    if (!supabase || !supplier) return;

    setError(null);
    setNotice(null);

    if (!form.clientId) {
      setError("Select a client.");
      return;
    }

    if (form.type === "contract" && !canCreateContracts) {
      setError(contractsUpgradeMessage);
      return;
    }

    const normalizedLineItems = normalizeLineItems(form.lineItems);
    if (form.type !== "contract" && normalizedLineItems.length === 0) {
      setError("Add at least one line item with an amount.");
      return;
    }

    const subtotal = form.type === "contract" ? 0 : normalizedLineItems.reduce((sum, item) => sum + item.amount, 0);

    const contentPayload: DocumentContent = {
      ...(form.type !== "contract" ? { lineItems: normalizedLineItems } : { lineItems: [] }),
      ...(form.type === "invoice" && form.invoiceNumber.trim()
        ? { invoiceNumber: form.invoiceNumber.trim() }
        : {}),
      ...(form.type === "contract"
        ? {
            contractDetails: {
              ...blankContractDetails,
              ...form.contractDetails,
            },
          }
        : {}),
    };

    const payload = {
      client_id: form.clientId,
      supplier_id: supplier.id,
      type: form.type,
      status: form.status,
      currency: form.currency.trim() || "GBP",
      subtotal,
      total: subtotal,
      content_json: contentPayload,
    };

    setSaving(true);

    if (editorMode === "create") {
      const { data, error: insertError } = await supabase
        .from("documents")
        .insert(payload)
        .select("id")
        .single<{ id: string }>();

      setSaving(false);

      if (insertError) {
        setError(insertError.message);
        return;
      }

      await loadData();
      setSelectedDocumentId(data?.id ?? null);
      setNotice("Document created.");
      cancelEditor();
      return;
    }

    if (!editingDocumentId) {
      setSaving(false);
      setError("No document selected for edit.");
      return;
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update(payload)
      .eq("id", editingDocumentId)
      .eq("supplier_id", supplier.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadData();
    setSelectedDocumentId(editingDocumentId);
    setNotice("Document updated.");
    cancelEditor();
  };

  const removeDocument = async () => {
    if (!supabase || !supplier || !selectedDocument) return;
    if (!window.confirm(`Delete this ${selectedDocument.type}? This cannot be undone.`)) return;

    setBusyAction("delete");
    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", selectedDocument.id)
      .eq("supplier_id", supplier.id);

    setBusyAction(null);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadData();
    setNotice("Document deleted.");
  };

  const advanceStatus = async () => {
    if (!supabase || !supplier || !selectedDocument) return;
    const next = nextStatus(selectedDocument.type, selectedDocument.status);
    if (!next) return;

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = { status: next };
    if (next === "sent") updatePayload.sent_at = now;
    if (next === "paid") {
      updatePayload.invoice_paid_at = now;
      updatePayload.invoice_paid_method = "manual";
      updatePayload.invoice_paid_reference = "web";
    }
    if (next === "signed") updatePayload.signed_at = now;

    setBusyAction("status");
    setError(null);
    setNotice(null);

    const { error: updateError } = await supabase
      .from("documents")
      .update(updatePayload)
      .eq("id", selectedDocument.id)
      .eq("supplier_id", supplier.id);

    setBusyAction(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadData();
    setSelectedDocumentId(selectedDocument.id);
    setNotice(`Status updated to ${formatLabel(next)}.`);
  };

  const withAuthHeader = async () => {
    if (!supabase) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const createSecureDocumentLink = async (document: DocumentRow, preferredPdfPath?: string | null): Promise<string> => {
    if (!supabase || !supplier) {
      throw new Error("Supabase is not configured.");
    }

    const authHeaders = await withAuthHeader();
    if (!authHeaders) {
      throw new Error("Session expired. Please sign in again.");
    }

    const { data, error: functionError } = await supabase.functions.invoke("createDocumentEmailLink", {
      headers: authHeaders,
      body: {
        supplierId: supplier.id,
        documentId: document.id,
        expiresInHours: 24 * 7,
      },
    });

    if (!functionError && typeof data?.brandedUrl === "string" && data.brandedUrl.trim()) {
      return data.brandedUrl.trim();
    }

    const path = preferredPdfPath ?? document.pdf_path;
    if (!path) {
      throw new Error("Document PDF is not generated yet.");
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signedError || !signed?.signedUrl) {
      throw new Error(signedError?.message ?? "Unable to create secure document link.");
    }

    return signed.signedUrl;
  };

  const createContractSigningLink = async (document: DocumentRow): Promise<string> => {
    if (!supabase || !supplier) {
      throw new Error("Supabase is not configured.");
    }
    if (document.type !== "contract") {
      throw new Error("Only contracts can be sent for signature.");
    }

    const authHeaders = await withAuthHeader();
    if (!authHeaders) {
      throw new Error("Session expired. Please sign in again.");
    }

    const { data, error: functionError } = await supabase.functions.invoke("createContractSigningLink", {
      headers: authHeaders,
      body: {
        supplierId: supplier.id,
        documentId: document.id,
        expiresInHours: 24 * 7,
      },
    });

    if (functionError || typeof data?.signingUrl !== "string" || !data.signingUrl.trim()) {
      throw new Error(functionError?.message ?? "Signing link could not be created.");
    }

    return data.signingUrl.trim();
  };

  const sendDocumentEmail = async (params: {
    document: DocumentRow;
    toEmail: string;
    subject: string;
    textBody: string;
    htmlBody: string;
  }) => {
    if (!supabase || !supplier) {
      throw new Error("Supabase is not configured.");
    }

    const authHeaders = await withAuthHeader();
    if (!authHeaders) {
      throw new Error("Session expired. Please sign in again.");
    }

    const { error: sendError } = await supabase.functions.invoke("sendEmail", {
      headers: authHeaders,
      body: {
        supplierId: supplier.id,
        toEmail: params.toEmail,
        subject: params.subject,
        body: params.textBody,
        htmlBody: params.htmlBody,
        replyTo: supplier.email,
        clientId: params.document.client_id,
        leadId: null,
        documentId: params.document.id,
      },
    });

    if (sendError) {
      throw new Error(sendError.message);
    }
  };

  const generateAndUploadPdf = async (document: DocumentRow): Promise<string> => {
    if (!supabase || !supplier) {
      throw new Error("Supabase is not configured.");
    }

    const linkedClient = clientsById.get(document.client_id) ?? null;
    const safeClientName = clientDisplayName(linkedClient);
    const supplierName = supplier.business_name?.trim() || "Wedly Pro Supplier";

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 42;
    const contentWidth = pageWidth - margin * 2;
    const brand = { r: 47, g: 125, b: 109 };

    let y = margin;

    const ensureSpace = (height: number) => {
      if (y + height <= pageHeight - margin) return;
      pdf.addPage();
      y = margin;
    };

    const writeText = (
      text: string,
      opts?: { x?: number; width?: number; size?: number; bold?: boolean; color?: [number, number, number]; line?: number },
    ) => {
      const size = opts?.size ?? 11;
      const line = opts?.line ?? 14;
      const x = opts?.x ?? margin;
      const width = opts?.width ?? contentWidth;
      const color = opts?.color ?? [24, 24, 27];

      pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.setTextColor(color[0], color[1], color[2]);

      const chunks = pdf.splitTextToSize(text || "-", width) as string[];
      ensureSpace(chunks.length * line + 2);
      chunks.forEach((chunk) => {
        pdf.text(chunk, x, y);
        y += line;
      });
    };

    const drawRule = () => {
      ensureSpace(10);
      pdf.setDrawColor(228, 228, 231);
      pdf.setLineWidth(1);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 12;
    };

    const drawSectionHeading = (title: string) => {
      ensureSpace(18);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(39, 39, 42);
      pdf.text(title, margin, y);
      y += 14;
    };

    const drawField = (label: string, value: string, multiline = false) => {
      ensureSpace(16);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(113, 113, 122);
      pdf.text(label.toUpperCase(), margin, y);
      y += 12;
      writeText(value || "-", { size: 11, line: multiline ? 14 : 13, color: [24, 24, 27] });
      y += 4;
    };

    // Header band
    const headerHeight = 94;
    ensureSpace(headerHeight + 8);
    pdf.setFillColor(brand.r, brand.g, brand.b);
    pdf.roundedRect(margin, y, contentWidth, headerHeight, 10, 10, "F");

    const typeLabel = formatLabel(document.type);
    const statusLabel = displayDocumentStatus(document.type, document.status);
    const createdLabel = formatDateTime(document.created_at);

    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(`${typeLabel}`, margin + 16, y + 26);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(supplierName, margin + 16, y + 44);
    pdf.text(safeClientName, margin + 16, y + 60);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("STATUS", pageWidth - margin - 140, y + 26);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(statusLabel, pageWidth - margin - 140, y + 40);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("CREATED", pageWidth - margin - 140, y + 58);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(createdLabel, pageWidth - margin - 140, y + 72);

    y += headerHeight + 18;
    pdf.setTextColor(24, 24, 27);

    drawSectionHeading("Details");
    drawField("Document ID", document.id);
    if (document.type === "invoice" && document.content_json?.invoiceNumber?.trim()) {
      drawField("Invoice Number", document.content_json.invoiceNumber.trim());
    }
    if (linkedClient?.email) {
      drawField("Client Email", linkedClient.email);
    }
    if (supplier.email?.trim()) {
      drawField("Supplier Email", supplier.email.trim());
    }
    drawRule();

    const content = document.content_json ?? {};

    if (document.type !== "contract") {
      const items = Array.isArray(content.lineItems) ? content.lineItems : [];
      drawSectionHeading("Line Items");

      ensureSpace(22);
      pdf.setFillColor(244, 244, 245);
      pdf.roundedRect(margin, y, contentWidth, 20, 4, 4, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(82, 82, 91);
      pdf.text("Description", margin + 10, y + 14);
      pdf.text("Amount", pageWidth - margin - 90, y + 14);
      y += 28;

      if (items.length === 0) {
        writeText("No line items.", { size: 11, color: [82, 82, 91] });
      } else {
        items.forEach((item) => {
          const description = item.description?.trim() || "Untitled item";
          const amount = formatMoney(Number(item.amount || 0), document.currency);

          ensureSpace(20);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(11);
          pdf.setTextColor(24, 24, 27);
          const descriptionLines = pdf.splitTextToSize(description, contentWidth - 110) as string[];
          const rowHeight = Math.max(18, descriptionLines.length * 13);
          ensureSpace(rowHeight + 8);
          descriptionLines.forEach((line, idx) => {
            pdf.text(line, margin + 10, y + idx * 13);
          });
          pdf.text(amount, pageWidth - margin - 90, y);
          y += rowHeight + 4;
          pdf.setDrawColor(228, 228, 231);
          pdf.line(margin + 2, y, pageWidth - margin - 2, y);
          y += 8;
        });
      }

      ensureSpace(44);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(24, 24, 27);
      pdf.text(`Subtotal: ${formatMoney(Number(document.subtotal || 0), document.currency)}`, margin, y);
      y += 16;
      pdf.text(`Total: ${formatMoney(Number(document.total || 0), document.currency)}`, margin, y);
      y += 8;
    } else {
      drawSectionHeading("Contract Terms");
      const details = {
        ...blankContractDetails,
        ...(content.contractDetails ?? {}),
      };
      drawField("Services Included", details.servicesIncluded || "Not specified", true);
      drawField("Deliverables", details.deliverables || "Not specified", true);
      drawField("Payment Schedule", details.paymentSchedule || "Not specified", true);
      drawField("Timeline", details.timeline || "Not specified", true);
      drawField("Special Terms", details.specialTerms || "Not specified", true);
    }

    drawRule();
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(113, 113, 122);
    writeText(copyrightNotice, { size: 9, color: [113, 113, 122], line: 12 });

    const arrayBuffer = pdf.output("arraybuffer");
    const fileName = `${slugifyFileName(safeClientName)}-${document.type}-${document.id}.pdf`;
    const storagePath = `${supplier.id}/${document.client_id}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, arrayBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update({ pdf_path: storagePath })
      .eq("id", document.id)
      .eq("supplier_id", supplier.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return storagePath;
  };

  const handleGeneratePdf = async () => {
    if (!selectedDocument) return;
    setBusyAction("pdf");
    setError(null);
    setNotice(null);

    try {
      await generateAndUploadPdf(selectedDocument);
      await loadData();
      setSelectedDocumentId(selectedDocument.id);
      setNotice("PDF generated and saved.");
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "PDF generation failed.");
    } finally {
      setBusyAction(null);
    }
  };

  const openPdf = async () => {
    if (!supabase || !selectedDocument?.pdf_path) {
      setError("Generate the PDF first.");
      return;
    }

    setBusyAction("open");
    setError(null);
    setNotice(null);

    const { data, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrl(selectedDocument.pdf_path, 60 * 60);

    setBusyAction(null);

    if (signedError || !data?.signedUrl) {
      setError(signedError?.message ?? "Unable to open PDF.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const sendToClient = async () => {
    if (!supabase || !selectedDocument || !supplier) return;
    const linkedClient = clientsById.get(selectedDocument.client_id) ?? null;

    const clientEmail = linkedClient?.email?.trim();
    if (!clientEmail) {
      setError("Client email is required before sending this document.");
      return;
    }

    setBusyAction(selectedDocument.type === "contract" ? "signing" : "email");
    setError(null);
    setNotice(null);

    try {
      const supplierName = supplier.business_name?.trim() || "your wedding supplier";
      const supplierSignoff = supplier.contact_name?.trim() || supplierName;
      const recipientName = clientDisplayName(linkedClient);

      if (selectedDocument.type === "contract" && selectedDocument.status !== "signed") {
        const signingUrl = await createContractSigningLink(selectedDocument);
        const template = buildDocumentEmailTemplate({
          documentType: "contract",
          supplierName,
          supplierSignoff,
          recipientName,
          signingUrl,
          contractSigned: false,
        });

        await sendDocumentEmail({
          document: selectedDocument,
          toEmail: clientEmail,
          subject: template.subject,
          textBody: template.textBody,
          htmlBody: template.htmlBody,
        });

        await loadData();
        setSelectedDocumentId(selectedDocument.id);
        setNotice("Contract signing request sent.");
        return;
      }

      let pdfPath = selectedDocument.pdf_path;
      if (!pdfPath) {
        pdfPath = await generateAndUploadPdf(selectedDocument);
      }

      const secureUrl = await createSecureDocumentLink(selectedDocument, pdfPath);
      const template = buildDocumentEmailTemplate({
        documentType: selectedDocument.type,
        supplierName,
        supplierSignoff,
        recipientName,
        totalLabel:
          selectedDocument.type === "contract"
            ? null
            : formatMoney(Number(selectedDocument.total || 0), selectedDocument.currency),
        reviewUrl: secureUrl,
        contractSigned: selectedDocument.type === "contract" && selectedDocument.status === "signed",
      });

      await sendDocumentEmail({
        document: selectedDocument,
        toEmail: clientEmail,
        subject: template.subject,
        textBody: template.textBody,
        htmlBody: template.htmlBody,
      });

      if (selectedDocument.type === "contract" && selectedDocument.status === "signed" && supplier.email?.trim()) {
        await sendDocumentEmail({
          document: selectedDocument,
          toEmail: supplier.email.trim(),
          subject: `Copy: ${template.subject} (${recipientName})`,
          textBody: template.textBody,
          htmlBody: template.htmlBody,
        });
      }

      if (
        (selectedDocument.type === "quote" || selectedDocument.type === "invoice") &&
        selectedDocument.status === "draft"
      ) {
        await supabase
          .from("documents")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", selectedDocument.id)
          .eq("supplier_id", supplier.id);
      }

      await loadData();
      setSelectedDocumentId(selectedDocument.id);
      if (selectedDocument.type === "contract" && selectedDocument.status === "signed") {
        setNotice("Signed copy sent to client and supplier.");
      } else if (selectedDocument.type === "contract") {
        setNotice("Contract signing request sent.");
      } else {
        setNotice("Document email sent.");
      }
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send document email.");
    } finally {
      setBusyAction(null);
    }
  };

  const copySigningLink = async () => {
    if (!selectedDocument || selectedDocument.type !== "contract") return;

    setBusyAction("signing");
    setError(null);
    setNotice(null);

    try {
      const signingUrl = await createContractSigningLink(selectedDocument);
      await navigator.clipboard.writeText(signingUrl);
      await loadData();
      setSelectedDocumentId(selectedDocument.id);
      setNotice("Signing link copied.");
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Unable to create signing link.");
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading documents...</p>;
  }

  if (error && !supplier) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load documents: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Create, send, and track quotes, invoices, and contracts.
        </p>
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
          {documentTypes.map((type) => (
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
          <button type="button" onClick={startCreate} className="btn-primary px-4 py-2 text-xs">
            New document
          </button>
        </div>
      </div>

      {!canCreateContracts ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {contractsUpgradeMessage}
        </p>
      ) : null}

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>
      ) : null}

      {editorMode ? (
        <section className="rounded-xl border border-black/10 bg-zinc-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">
              {editorMode === "create" ? "New document" : "Edit document"}
            </h2>
            <button type="button" onClick={cancelEditor} className="btn-secondary px-3 py-1.5 text-xs">
              Cancel
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-zinc-600">
              Client
              <select
                value={form.clientId}
                onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {clientDisplayName(client)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-zinc-600">
              Type
              <select
                value={form.type}
                onChange={(event) => {
                  const nextType = event.target.value as DocumentType;
                  if (nextType === "contract" && !canCreateContracts) {
                    setError(contractsUpgradeMessage);
                    return;
                  }
                  setForm((prev) => ({ ...prev, type: nextType }));
                }}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                <option value="quote">Quote</option>
                <option value="invoice">Invoice</option>
                <option value="contract" disabled={!canCreateContracts}>
                  Contract{canCreateContracts ? "" : " (Professional)"}
                </option>
              </select>
            </label>

            <label className="text-xs text-zinc-600">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as DocumentStatus }))}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {documentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-zinc-600">
              Currency
              <input
                value={form.currency}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </label>

            {form.type === "invoice" ? (
              <label className="text-xs text-zinc-600 sm:col-span-2">
                Invoice number
                <input
                  value={form.invoiceNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, invoiceNumber: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
            ) : null}
          </div>

          {form.type === "contract" ? (
            <div className="mt-4 grid gap-3">
              <label className="text-xs text-zinc-600">
                Services included
                <textarea
                  rows={3}
                  value={form.contractDetails.servicesIncluded}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      contractDetails: { ...prev.contractDetails, servicesIncluded: event.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <label className="text-xs text-zinc-600">
                Deliverables
                <textarea
                  rows={3}
                  value={form.contractDetails.deliverables}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      contractDetails: { ...prev.contractDetails, deliverables: event.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <label className="text-xs text-zinc-600">
                Payment schedule
                <textarea
                  rows={3}
                  value={form.contractDetails.paymentSchedule}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      contractDetails: { ...prev.contractDetails, paymentSchedule: event.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <label className="text-xs text-zinc-600">
                Timeline
                <textarea
                  rows={3}
                  value={form.contractDetails.timeline}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      contractDetails: { ...prev.contractDetails, timeline: event.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
              <label className="text-xs text-zinc-600">
                Special terms
                <textarea
                  rows={3}
                  value={form.contractDetails.specialTerms}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      contractDetails: { ...prev.contractDetails, specialTerms: event.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Line items</h3>
                <button type="button" onClick={addLineItem} className="btn-secondary px-3 py-1.5 text-xs">
                  Add item
                </button>
              </div>
              {form.lineItems.map((item, index) => (
                <div key={item.id} className="grid gap-2 rounded-lg border border-black/10 bg-white p-3 sm:grid-cols-[1fr_140px_auto]">
                  <label className="text-xs text-zinc-600">
                    Description
                    <input
                      value={item.description}
                      onChange={(event) => updateLineItem(item.id, { description: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                    />
                  </label>
                  <label className="text-xs text-zinc-600">
                    Amount
                    <input
                      value={item.amount}
                      onChange={(event) => updateLineItem(item.id, { amount: event.target.value })}
                      inputMode="decimal"
                      className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      disabled={form.lineItems.length <= 1}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove {index + 1}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={saveDocument} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? "Saving..." : editorMode === "create" ? "Create document" : "Save changes"}
            </button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-black/10 bg-zinc-50 p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Documents ({visibleDocuments.length})</h2>
          <div className="mt-3 space-y-2">
            {visibleDocuments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/10 bg-white px-3 py-3 text-xs text-zinc-500">
                No documents found yet.
              </p>
            ) : (
              visibleDocuments.map((document) => {
                const linkedClient = clientsById.get(document.client_id) ?? null;
                const active = selectedDocumentId === document.id;
                return (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => setSelectedDocumentId(document.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-black/10 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{documentTitle(document, linkedClient)}</p>
                    <p className={`mt-1 text-xs ${active ? "text-zinc-200" : "text-zinc-500"}`}>
                      {formatLabel(document.type)} - {formatLabel(document.status)}
                    </p>
                    <p className={`mt-1 text-xs ${active ? "text-zinc-300" : "text-zinc-500"}`}>
                      {formatDateTime(document.created_at)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-black/10 bg-white p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Document details</h3>
          {!selectedDocument ? (
            <p className="mt-3 text-sm text-zinc-600">Select a document to view details.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={startEdit} className="btn-secondary px-3 py-1.5 text-xs">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={removeDocument}
                  disabled={busyAction !== null}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyAction === "delete" ? "Please wait..." : "Delete"}
                </button>
                {statusActionLabel(selectedDocument.type, selectedDocument.status) ? (
                  <button
                    type="button"
                    onClick={advanceStatus}
                    disabled={busyAction !== null}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {busyAction === "status" ? "Please wait..." : statusActionLabel(selectedDocument.type, selectedDocument.status)}
                  </button>
                ) : null}
              </div>

              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Client</p>
                <p className="mt-1 text-zinc-900">{clientDisplayName(clientsById.get(selectedDocument.client_id) ?? null)}</p>
              </div>
              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Type</p>
                <p className="mt-1 text-zinc-900">{formatLabel(selectedDocument.type)}</p>
              </div>
              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Status</p>
                <p className="mt-1 text-zinc-900">{formatLabel(selectedDocument.status)}</p>
              </div>
              {selectedDocument.type !== "contract" ? (
                <div className="rounded-lg border border-black/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Total</p>
                  <p className="mt-1 text-zinc-900">{formatMoney(Number(selectedDocument.total || 0), selectedDocument.currency)}</p>
                </div>
              ) : null}
              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Created</p>
                <p className="mt-1 text-zinc-900">{formatDateTime(selectedDocument.created_at)}</p>
              </div>
              <div className="rounded-lg border border-black/10 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Last sent</p>
                <p className="mt-1 text-zinc-900">{formatDateTime(selectedDocument.sent_at)}</p>
              </div>
              {selectedDocument.type === "contract" ? (
                <div className="rounded-lg border border-black/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Signature status</p>
                  <p className="mt-1 text-zinc-900">
                    {selectedDocument.status === "signed"
                      ? `Signed on ${formatDateTime(selectedDocument.signed_at)}`
                      : selectedDocument.signing_expires_at
                        ? `Awaiting signature (expires ${formatDateTime(selectedDocument.signing_expires_at)})`
                        : "Not sent for signature yet"}
                  </p>
                </div>
              ) : null}

              {selectedDocument.type !== "contract" ? (
                <div className="rounded-lg border border-black/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Line items</p>
                  <div className="mt-1 space-y-1 text-zinc-800">
                    {(selectedDocument.content_json?.lineItems ?? []).length === 0 ? (
                      <p className="text-zinc-600">No line items</p>
                    ) : (
                      (selectedDocument.content_json?.lineItems ?? []).map((item, index) => (
                        <p key={`${item.description}-${index}`}>
                          {item.description} - {formatMoney(Number(item.amount || 0), selectedDocument.currency)}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-black/10 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Contract terms</p>
                  {Object.entries({
                    services_included: selectedDocument.content_json?.contractDetails?.servicesIncluded ?? "",
                    deliverables: selectedDocument.content_json?.contractDetails?.deliverables ?? "",
                    payment_schedule: selectedDocument.content_json?.contractDetails?.paymentSchedule ?? "",
                    timeline: selectedDocument.content_json?.contractDetails?.timeline ?? "",
                    special_terms: selectedDocument.content_json?.contractDetails?.specialTerms ?? "",
                  })
                    .filter(([, value]) => toText(value))
                    .map(([key, value]) => (
                      <p key={key} className="mt-1 text-zinc-800">
                        <span className="font-medium">{formatLabel(key)}:</span> {String(value)}
                      </p>
                    ))}
                </div>
              )}

              <div className="rounded-lg border border-black/10 bg-zinc-50 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Actions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleGeneratePdf}
                    disabled={busyAction !== null}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {busyAction === "pdf" ? "Please wait..." : "Generate PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={openPdf}
                    disabled={busyAction !== null || !selectedDocument.pdf_path}
                    className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyAction === "open" ? "Please wait..." : "Open PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={sendToClient}
                    disabled={busyAction !== null}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {busyAction === "email" || busyAction === "signing"
                      ? "Please wait..."
                      : selectedDocument.type === "contract"
                        ? selectedDocument.status === "signed"
                          ? "Send signed copy"
                          : "Send for signature"
                        : "Send to client"}
                  </button>
                  {selectedDocument.type === "contract" && selectedDocument.status !== "signed" ? (
                    <button
                      type="button"
                      onClick={copySigningLink}
                      disabled={busyAction !== null}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      Copy signing link
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
