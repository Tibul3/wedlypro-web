"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

type PreferenceState = boolean | null;

export default function SettingsPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [preference, setPreference] = useState<PreferenceState>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPreference() {
      if (!supabase) {
        if (mounted) {
          setError("Web app is not configured yet.");
          setLoading(false);
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        setError("Please sign in again.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("suppliers")
        .select("product_updates_opt_in")
        .eq("user_id", session.user.id)
        .maybeSingle<{ product_updates_opt_in: boolean | null }>();

      if (!mounted) return;

      if (queryError) {
        const missingColumn = /column .*product_updates_opt_in.* does not exist/i.test(queryError.message);
        if (missingColumn) {
          setError("Update preferences are not enabled yet in this environment.");
          setLoading(false);
          return;
        }
        setError(queryError.message);
        setLoading(false);
        return;
      }

      setPreference(data?.product_updates_opt_in ?? null);
      setLoading(false);
    }

    void loadPreference();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const savePreference = async (value: boolean) => {
    if (!supabase) return;

    setError(null);
    setMessage(null);
    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      setError("Session expired. Please sign in again.");
      return;
    }

    const { error: updateError } = await supabase
      .from("suppliers")
      .update({ product_updates_opt_in: value })
      .eq("user_id", session.user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPreference(value);
    setMessage("Preference saved.");
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
    </div>
  );
}
