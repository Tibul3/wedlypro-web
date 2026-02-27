"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function inferBusinessName(user: User): string {
  const metadata = user.user_metadata ?? {};
  const fromMetadata =
    (typeof metadata.business_name === "string" && metadata.business_name.trim()) ||
    (typeof metadata.businessName === "string" && metadata.businessName.trim()) ||
    (typeof metadata.company === "string" && metadata.company.trim());

  if (fromMetadata) return fromMetadata;

  const email = user.email?.trim().toLowerCase();
  if (!email) return "My Wedding Business";

  const localPart = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  if (!localPart) return "My Wedding Business";

  return localPart
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function ensureSupplierProfile(supabase: SupabaseClient, user: User): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing, error: existingError } = await supabase
    .from("suppliers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (existing) {
    return { ok: true };
  }

  const email = user.email?.trim().toLowerCase() || `${user.id}@wedlypro.local`;
  const businessName = inferBusinessName(user);

  const { error: insertError } = await supabase.from("suppliers").insert({
    user_id: user.id,
    email,
    business_name: businessName,
  });

  if (insertError) {
    const duplicate = /duplicate key|already exists|unique/i.test(insertError.message);
    if (duplicate) {
      return { ok: true };
    }
    return { ok: false, error: insertError.message };
  }

  return { ok: true };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
