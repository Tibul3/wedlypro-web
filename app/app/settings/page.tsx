"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type PreferenceState = boolean | null;

type SupplierSettingsRow = {
  id: string;
  business_name: string | null;
  contact_name: string | null;
  email: string | null;
  logo_path: string | null;
  tier: string | null;
  plan: string | null;
  product_updates_opt_in: boolean | null;
};

type MaskedPaymentDetails = {
  accountName: string;
  sortCodeMasked: string;
  accountNumberMasked: string;
  ibanPresent: boolean;
  bicPresent: boolean;
  paymentReference: string | null;
  updatedAt: string;
};

type EditablePaymentDetails = {
  accountName: string;
  sortCode: string;
  accountNumber: string;
  iban: string;
  bic: string;
  paymentReference: string;
};

const supplierLogoBucket = "supplier-logos";

function isProfessional(tier: string | null, plan: string | null): boolean {
  return tier === "professional" || plan === "pro";
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatSortCodeInput(value: string) {
  const digits = digitsOnly(value).slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function mapPaymentDetailsError(message: string): string {
  if (/Could not find the function|does not exist/i.test(message)) {
    return "Payment details are not enabled yet in this environment.";
  }
  if (/Supplier profile not found/i.test(message)) {
    return "Supplier profile not found. Please sign in again.";
  }
  if (/Password confirmation failed/i.test(message)) {
    return "Password confirmation failed. Please check your password.";
  }
  return message;
}

function parseMaskedDetailsRow(input: unknown): MaskedPaymentDetails | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const accountName = typeof row.account_name === "string" ? row.account_name : "";
  const sortCodeMasked = typeof row.sort_code_masked === "string" ? row.sort_code_masked : "";
  const accountNumberMasked = typeof row.account_number_masked === "string" ? row.account_number_masked : "";
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : "";

  if (!accountName || !sortCodeMasked || !accountNumberMasked) return null;

  return {
    accountName,
    sortCodeMasked,
    accountNumberMasked,
    ibanPresent: Boolean(row.iban_present),
    bicPresent: Boolean(row.bic_present),
    paymentReference: typeof row.payment_reference === "string" ? row.payment_reference : null,
    updatedAt,
  };
}

function parseEditableDetailsRow(input: unknown): EditablePaymentDetails | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const accountName = typeof row.account_name === "string" ? row.account_name : "";
  const sortCode = typeof row.sort_code === "string" ? row.sort_code : "";
  const accountNumber = typeof row.account_number === "string" ? row.account_number : "";

  return {
    accountName,
    sortCode,
    accountNumber,
    iban: typeof row.iban === "string" ? row.iban : "",
    bic: typeof row.bic === "string" ? row.bic : "",
    paymentReference: typeof row.payment_reference === "string" ? row.payment_reference : "",
  };
}

function getSingleRpcRow(data: unknown): unknown {
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

export default function SettingsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [preference, setPreference] = useState<PreferenceState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [supplier, setSupplier] = useState<SupplierSettingsRow | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);

  const [paymentDetailsMasked, setPaymentDetailsMasked] = useState<MaskedPaymentDetails | null>(null);
  const [paymentDetailsLoading, setPaymentDetailsLoading] = useState(false);
  const [paymentDetailsSaving, setPaymentDetailsSaving] = useState(false);
  const [paymentDetailsError, setPaymentDetailsError] = useState<string | null>(null);
  const [paymentDetailsSuccess, setPaymentDetailsSuccess] = useState<string | null>(null);
  const [editingPaymentDetails, setEditingPaymentDetails] = useState(false);
  const [paymentPasswordPromptVisible, setPaymentPasswordPromptVisible] = useState(false);
  const [paymentPassword, setPaymentPassword] = useState("");
  const [paymentAccountName, setPaymentAccountName] = useState("");
  const [paymentSortCode, setPaymentSortCode] = useState("");
  const [paymentAccountNumber, setPaymentAccountNumber] = useState("");
  const [paymentIban, setPaymentIban] = useState("");
  const [paymentBic, setPaymentBic] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNext, setPasswordNext] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const proEnabled = isProfessional(supplier?.tier ?? null, supplier?.plan ?? null);

  const loadLogoPreview = async (logoPath: string | null) => {
    if (!supabase || !logoPath) {
      setLogoPreviewUrl(null);
      return;
    }

    const { data, error: signedError } = await supabase.storage
      .from(supplierLogoBucket)
      .createSignedUrl(logoPath, 60 * 20);

    if (signedError || !data?.signedUrl) {
      setLogoPreviewUrl(null);
      return;
    }

    setLogoPreviewUrl(data.signedUrl);
  };

  const loadMaskedPaymentDetails = async () => {
    if (!supabase) return;

    setPaymentDetailsLoading(true);
    setPaymentDetailsError(null);

    const { data, error: rpcError } = await supabase.rpc("get_supplier_payment_details_masked");

    if (rpcError) {
      setPaymentDetailsLoading(false);
      setPaymentDetailsMasked(null);
      setPaymentDetailsError(mapPaymentDetailsError(rpcError.message));
      return;
    }

    const mapped = parseMaskedDetailsRow(getSingleRpcRow(data));
    setPaymentDetailsMasked(mapped);
    setPaymentDetailsLoading(false);
  };

  const loadSettings = async () => {
    if (!supabase) {
      setError("Web app is not configured yet.");
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Please sign in again.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("suppliers")
      .select("id,business_name,contact_name,email,logo_path,tier,plan,product_updates_opt_in")
      .eq("user_id", session.user.id)
      .maybeSingle<SupplierSettingsRow>();

    if (queryError || !data) {
      setError(queryError?.message ?? "Supplier profile unavailable.");
      setLoading(false);
      return;
    }

    setSupplier(data);
    setPreference(data.product_updates_opt_in ?? null);
    setBusinessName(data.business_name ?? "");
    setContactName(data.contact_name ?? "");
    setReplyEmail(data.email ?? session.user.email ?? "");
    await loadLogoPreview(data.logo_path ?? null);
    await loadMaskedPaymentDetails();
    setLoading(false);
  };

  useEffect(() => {
    void loadSettings();
  }, [supabase]);

  const savePreference = async (value: boolean) => {
    if (!supabase || !supplier) return;

    setError(null);
    setMessage(null);
    setSaving(true);

    const { error: updateError } = await supabase
      .from("suppliers")
      .update({ product_updates_opt_in: value })
      .eq("id", supplier.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPreference(value);
    setMessage("Preference saved.");
  };

  const saveBusinessProfile = async () => {
    if (!supabase || !supplier) return;

    setProfileError(null);
    setProfileMessage(null);
    setProfileSaving(true);

    const { error: updateError } = await supabase
      .from("suppliers")
      .update({
        business_name: businessName.trim() || null,
        contact_name: contactName.trim() || null,
        email: replyEmail.trim().toLowerCase() || null,
      })
      .eq("id", supplier.id);

    setProfileSaving(false);

    if (updateError) {
      setProfileError(updateError.message);
      return;
    }

    setProfileMessage("Business profile updated.");
    await loadSettings();
  };

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!file || !supabase || !supplier) return;
    if (!proEnabled) {
      setProfileError("Business logo upload is available on Professional.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfileError("Please choose an image file.");
      return;
    }

    setLogoUploading(true);
    setProfileError(null);
    setProfileMessage(null);

    const extension = (file.name.split(".").pop() || "png").toLowerCase();
    const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "png";
    const storagePath = `${supplier.id}/logo-${Date.now()}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage.from(supplierLogoBucket).upload(storagePath, file, {
      upsert: true,
      contentType: file.type || "image/png",
    });

    if (uploadError) {
      setLogoUploading(false);
      setProfileError(uploadError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("suppliers")
      .update({ logo_path: storagePath })
      .eq("id", supplier.id);

    setLogoUploading(false);

    if (updateError) {
      setProfileError(updateError.message);
      return;
    }

    setProfileMessage("Business logo updated.");
    await loadSettings();
  };

  const removeLogo = async () => {
    if (!supabase || !supplier) return;

    setLogoRemoving(true);
    setProfileError(null);
    setProfileMessage(null);

    const { error: updateError } = await supabase
      .from("suppliers")
      .update({ logo_path: null })
      .eq("id", supplier.id);

    setLogoRemoving(false);

    if (updateError) {
      setProfileError(updateError.message);
      return;
    }

    setProfileMessage("Business logo removed.");
    await loadSettings();
  };

  const handleEditPaymentDetails = async () => {
    if (!supabase) return;

    setPaymentDetailsError(null);
    setPaymentDetailsSuccess(null);

    const { data, error: rpcError } = await supabase.rpc("get_supplier_payment_details_for_edit");

    if (rpcError) {
      setPaymentDetailsError(mapPaymentDetailsError(rpcError.message));
      return;
    }

    const mapped = parseEditableDetailsRow(getSingleRpcRow(data));

    setPaymentAccountName(mapped?.accountName ?? "");
    setPaymentSortCode(formatSortCodeInput(mapped?.sortCode ?? ""));
    setPaymentAccountNumber(mapped?.accountNumber ?? "");
    setPaymentIban(mapped?.iban ?? "");
    setPaymentBic(mapped?.bic ?? "");
    setPaymentReference(mapped?.paymentReference ?? "");
    setPaymentPassword("");
    setPaymentPasswordPromptVisible(false);
    setEditingPaymentDetails(true);
  };

  const handleCancelPaymentDetails = () => {
    setEditingPaymentDetails(false);
    setPaymentPasswordPromptVisible(false);
    setPaymentPassword("");
    setPaymentDetailsError(null);
  };

  const validatePaymentDetailsForm = () => {
    const accountName = paymentAccountName.trim();
    const sortCode = digitsOnly(paymentSortCode);
    const accountNumber = digitsOnly(paymentAccountNumber);
    const iban = paymentIban.trim().replace(/\s+/g, "").toUpperCase();
    const bic = paymentBic.trim().replace(/\s+/g, "").toUpperCase();

    if (!accountName) return "Account name is required.";
    if (sortCode.length !== 6) return "Sort code must be 6 digits.";
    if (accountNumber.length !== 8) return "Account number must be 8 digits.";
    if (iban && (iban.length < 15 || iban.length > 34 || !/^[A-Z0-9]+$/.test(iban))) {
      return "Enter a valid IBAN.";
    }
    if (bic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic)) {
      return "BIC must be 8 or 11 letters/numbers.";
    }
    return null;
  };

  const handleSavePaymentDetails = async () => {
    if (!supabase || !supplier) return;

    const validationError = validatePaymentDetailsForm();
    if (validationError) {
      setPaymentDetailsError(validationError);
      return;
    }

    setPaymentDetailsError(null);
    setPaymentDetailsSuccess(null);

    if (!paymentPasswordPromptVisible) {
      setPaymentPasswordPromptVisible(true);
      return;
    }

    const password = paymentPassword.trim();
    if (!password) {
      setPaymentDetailsError("Enter your password to confirm this change.");
      return;
    }

    setPaymentDetailsSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        throw new Error("Unable to confirm current user.");
      }

      const { data: reauthData, error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (reauthError) {
        throw new Error("Password confirmation failed.");
      }

      const sortCodeDigits = digitsOnly(paymentSortCode);
      const accountNumberDigits = digitsOnly(paymentAccountNumber);

      const { data, error: upsertError } = await supabase.rpc("upsert_supplier_payment_details", {
        p_account_name: paymentAccountName.trim(),
        p_sort_code: sortCodeDigits,
        p_account_number: accountNumberDigits,
        p_iban: paymentIban.trim() || null,
        p_bic: paymentBic.trim() || null,
        p_payment_reference: paymentReference.trim() || null,
      });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      const mappedMasked = parseMaskedDetailsRow(getSingleRpcRow(data));
      setPaymentDetailsMasked(mappedMasked);
      setEditingPaymentDetails(false);
      setPaymentPasswordPromptVisible(false);
      setPaymentPassword("");
      setPaymentDetailsSuccess("Payment details saved.");

      const accessToken =
        reauthData.session?.access_token ?? (await supabase.auth.getSession()).data.session?.access_token ?? null;

      if (accessToken) {
        const { error: notificationError } = await supabase.functions.invoke("notifyPaymentDetailsChanged", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: {
            last4: accountNumberDigits.slice(-4),
            sortCodeLast2: sortCodeDigits.slice(-2),
            changedAt: new Date().toISOString(),
          },
        });

        if (notificationError) {
          setPaymentDetailsSuccess(`Payment details saved. Notification email failed: ${notificationError.message}`);
        }
      }

      await loadMaskedPaymentDetails();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save payment details.";
      setPaymentDetailsError(mapPaymentDetailsError(message));
    } finally {
      setPaymentDetailsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!supabase) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordCurrent || !passwordNext || !passwordConfirm) {
      setPasswordError("Enter current password, new password, and confirm password.");
      return;
    }

    if (passwordNext !== passwordConfirm) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    const strongEnough =
      passwordNext.length >= 8 && /[a-z]/i.test(passwordNext) && /\d/.test(passwordNext);
    if (!strongEnough) {
      setPasswordError("New password must be at least 8 characters and include letters and numbers.");
      return;
    }

    if (passwordCurrent === passwordNext) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      setPasswordError("Unable to verify current account. Please sign in again.");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordCurrent,
      });

      if (reauthError) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: passwordNext });
      if (updateError) {
        throw new Error(updateError.message);
      }

      setPasswordCurrent("");
      setPasswordNext("");
      setPasswordConfirm("");
      setPasswordSuccess("Password updated successfully.");
    } catch (updatePasswordError) {
      const message =
        updatePasswordError instanceof Error ? updatePasswordError.message : "Unable to update password.";
      setPasswordError(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading settings...</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">Settings</h2>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-black/10 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Business profile</h3>
        <p className="mt-1 text-sm text-zinc-600">
          These details are used on document emails and branded PDFs.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-600 sm:col-span-2">
            Business name
            <input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <label className="text-xs text-zinc-600">
            Contact name
            <input
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <label className="text-xs text-zinc-600">
            Reply email
            <input
              type="email"
              value={replyEmail}
              onChange={(event) => setReplyEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveBusinessProfile}
            disabled={profileSaving || logoUploading || logoRemoving}
            className="btn-primary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileSaving ? "Saving..." : "Save business profile"}
          </button>
          {!proEnabled ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800">
              Logo branding requires Professional
            </span>
          ) : null}
        </div>

        <div className="mt-4 rounded-lg border border-black/10 bg-white p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Business logo</p>
          <p className="mt-1 text-xs text-zinc-500">Shown on Professional branded document PDFs and emails.</p>

          {logoPreviewUrl ? (
            <div className="mt-3 rounded-md border border-black/10 bg-white p-2">
              <img src={logoPreviewUrl} alt="Business logo preview" className="h-16 w-auto object-contain" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">No logo uploaded yet.</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer px-3 py-1.5 text-xs">
              {logoUploading ? "Uploading..." : "Upload logo"}
              <input
                type="file"
                accept="image/*"
                onChange={uploadLogo}
                disabled={logoUploading || logoRemoving || !proEnabled}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={removeLogo}
              disabled={logoRemoving || logoUploading || !logoPreviewUrl}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {logoRemoving ? "Removing..." : "Remove logo"}
            </button>
          </div>
        </div>

        {profileError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</p> : null}
        {profileMessage ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{profileMessage}</p> : null}
      </section>

      <section className="rounded-xl border border-black/10 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Payment details (secure)</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Used on invoice PDFs. Confirm your password before changes are saved.
        </p>

        {paymentDetailsLoading ? <p className="mt-3 text-sm text-zinc-600">Loading payment details...</p> : null}

        {!editingPaymentDetails ? (
          <div className="mt-3 rounded-lg border border-black/10 bg-white p-3">
            {!paymentDetailsLoading && !paymentDetailsMasked ? (
              <p className="text-sm text-zinc-600">No payment details saved yet.</p>
            ) : null}

            {paymentDetailsMasked ? (
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Account name</dt>
                  <dd className="mt-1 text-zinc-900">{paymentDetailsMasked.accountName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Sort code</dt>
                  <dd className="mt-1 text-zinc-900">{paymentDetailsMasked.sortCodeMasked}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Account number</dt>
                  <dd className="mt-1 text-zinc-900">{paymentDetailsMasked.accountNumberMasked}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">IBAN / BIC</dt>
                  <dd className="mt-1 text-zinc-900">
                    {paymentDetailsMasked.ibanPresent ? "IBAN set" : "No IBAN"} - {paymentDetailsMasked.bicPresent ? "BIC set" : "No BIC"}
                  </dd>
                </div>
                {paymentDetailsMasked.paymentReference ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">Payment reference</dt>
                    <dd className="mt-1 text-zinc-900">{paymentDetailsMasked.paymentReference}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Updated</dt>
                  <dd className="mt-1 text-zinc-900">{new Date(paymentDetailsMasked.updatedAt).toLocaleString("en-GB")}</dd>
                </div>
              </dl>
            ) : null}

            <div className="mt-3">
              <button type="button" onClick={handleEditPaymentDetails} className="btn-secondary px-3 py-1.5 text-xs">
                {paymentDetailsMasked ? "Edit payment details" : "Add payment details"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-black/10 bg-white p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-600 sm:col-span-2">
                Account name
                <input
                  value={paymentAccountName}
                  onChange={(event) => setPaymentAccountName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>

              <label className="text-xs text-zinc-600">
                Sort code
                <input
                  value={paymentSortCode}
                  onChange={(event) => setPaymentSortCode(formatSortCodeInput(event.target.value))}
                  placeholder="12-34-56"
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>

              <label className="text-xs text-zinc-600">
                Account number
                <input
                  value={paymentAccountNumber}
                  onChange={(event) => setPaymentAccountNumber(digitsOnly(event.target.value).slice(0, 8))}
                  placeholder="12345678"
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>

              <label className="text-xs text-zinc-600">
                IBAN (optional)
                <input
                  value={paymentIban}
                  onChange={(event) => setPaymentIban(event.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>

              <label className="text-xs text-zinc-600">
                BIC (optional)
                <input
                  value={paymentBic}
                  onChange={(event) => setPaymentBic(event.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>

              <label className="text-xs text-zinc-600 sm:col-span-2">
                Payment reference (optional)
                <input
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
            </div>

            {paymentPasswordPromptVisible ? (
              <label className="mt-3 block text-xs text-zinc-600">
                Confirm password
                <input
                  type="password"
                  value={paymentPassword}
                  onChange={(event) => setPaymentPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSavePaymentDetails}
                disabled={paymentDetailsSaving}
                className="btn-primary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paymentDetailsSaving ? "Saving..." : paymentPasswordPromptVisible ? "Confirm & save" : "Save payment details"}
              </button>
              <button
                type="button"
                onClick={handleCancelPaymentDetails}
                disabled={paymentDetailsSaving}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {paymentDetailsError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{paymentDetailsError}</p> : null}
        {paymentDetailsSuccess ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{paymentDetailsSuccess}</p> : null}
      </section>

      <section className="rounded-xl border border-black/10 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Product updates</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Choose whether you want Wedly Pro feature and release updates by email.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => savePreference(true)}
            disabled={saving}
            className={`rounded-lg border px-3 py-2 text-sm ${preference === true ? "border-zinc-900 bg-zinc-900 text-white" : "border-black/10 bg-white text-zinc-800"} disabled:opacity-60`}
          >
            {saving && preference !== true ? "Saving..." : "Opt in"}
          </button>
          <button
            type="button"
            onClick={() => savePreference(false)}
            disabled={saving}
            className={`rounded-lg border px-3 py-2 text-sm ${preference === false ? "border-zinc-900 bg-zinc-900 text-white" : "border-black/10 bg-white text-zinc-800"} disabled:opacity-60`}
          >
            {saving && preference !== false ? "Saving..." : "Opt out"}
          </button>
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Current preference: {preference === null ? "Not set" : preference ? "Opted in" : "Opted out"}
        </p>

        {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
      </section>

      <section className="rounded-xl border border-black/10 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Change password</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Re-enter your current password, then set a new one.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-zinc-600 sm:col-span-2">
            Current password
            <input
              type="password"
              value={passwordCurrent}
              onChange={(event) => setPasswordCurrent(event.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
          <label className="text-xs text-zinc-600">
            New password
            <input
              type="password"
              value={passwordNext}
              onChange={(event) => setPasswordNext(event.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
          <label className="text-xs text-zinc-600">
            Confirm new password
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
        </div>

        <p className="mt-2 text-xs text-zinc-500">
          Use at least 8 characters with letters and numbers.
        </p>

        <div className="mt-3">
          <button
            type="button"
            onClick={handleUpdatePassword}
            disabled={passwordSaving}
            className="btn-primary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60"
          >
            {passwordSaving ? "Updating..." : "Update password"}
          </button>
        </div>

        {passwordError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{passwordError}</p> : null}
        {passwordSuccess ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{passwordSuccess}</p> : null}
      </section>

      <section className="rounded-xl border border-black/10 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Calendar sync</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Export key dates as .ics files from the calendar page today. Provider-connected sync is the next rollout.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/app/calendar"
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100"
          >
            Open calendar exports
          </Link>
          <button
            type="button"
            disabled
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-400"
          >
            Connect Google Calendar (Coming soon)
          </button>
          <button
            type="button"
            disabled
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-zinc-400"
          >
            Connect Outlook (Coming soon)
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Use the calendar screen to download either a selected event or all key dates as an .ics file.
        </p>
      </section>
    </div>
  );
}
