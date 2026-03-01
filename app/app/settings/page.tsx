"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
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

const supplierLogoBucket = "supplier-logos";

function isProfessional(tier: string | null, plan: string | null): boolean {
  return tier === "professional" || plan === "pro";
}

export default function SettingsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [preference, setPreference] = useState<PreferenceState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);

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

  const proEnabled = isProfessional(supplier?.tier ?? null, supplier?.plan ?? null);

  const loadLogoPreview = async (supplierId: string, logoPath: string | null) => {
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
    await loadLogoPreview(data.id, data.logo_path ?? null);
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
            <img src={logoPreviewUrl} alt="Business logo preview" className="mt-3 h-16 w-auto rounded-md border border-black/10 bg-white p-1" />
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
        <h3 className="text-sm font-semibold text-zinc-900">Calendar sync</h3>
        <p className="mt-1 text-sm text-zinc-600">
          Connect an external calendar so key dates can be synced outside Wedly Pro.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
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
          <button
            type="button"
            onClick={() => setCalendarSyncEnabled((prev) => !prev)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              calendarSyncEnabled
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-black/10 bg-white text-zinc-800"
            }`}
          >
            {calendarSyncEnabled ? "Auto-sync enabled (local preview)" : "Enable auto-sync (local preview)"}
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Full provider integration requires OAuth setup and server webhooks. This section is staged for that rollout.
        </p>
      </section>
    </div>
  );
}
