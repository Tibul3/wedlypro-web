"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  supplierId: string;
  supabase: SupabaseClient;
};

type SupplierPrefRow = {
  product_updates_opt_in: boolean | null;
};

export default function ProductUpdatesPrompt({ supplierId, supabase }: Props) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadPreference() {
      const { data, error } = await supabase
        .from("suppliers")
        .select("product_updates_opt_in")
        .eq("id", supplierId)
        .maybeSingle<SupplierPrefRow>();

      if (!mounted) return;

      if (error) {
        const missingColumn = /column .*product_updates_opt_in.* does not exist/i.test(error.message);
        if (missingColumn) {
          setVisible(false);
          setLoading(false);
          return;
        }
        setVisible(false);
        setLoading(false);
        return;
      }

      setVisible((data?.product_updates_opt_in ?? null) === null);
      setLoading(false);
    }

    void loadPreference();

    return () => {
      mounted = false;
    };
  }, [supplierId, supabase]);

  const setPreference = async (value: boolean) => {
    setSaving(true);
    const { error } = await supabase
      .from("suppliers")
      .update({ product_updates_opt_in: value })
      .eq("id", supplierId);
    setSaving(false);

    if (!error) {
      setVisible(false);
    }
  };

  if (loading || !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-[0_20px_40px_-24px_rgba(16,24,40,0.45)]">
        <h2 className="text-lg font-semibold text-zinc-900">Product updates</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Do you want email updates about new features, improvements, and release notes?
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreference(true)}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Yes, keep me updated"}
          </button>
          <button
            type="button"
            onClick={() => setPreference(false)}
            disabled={saving}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm text-zinc-800 disabled:opacity-60"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
