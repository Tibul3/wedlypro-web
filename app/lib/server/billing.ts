import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export type PlanTier = "essentials" | "professional";

export type SupplierBillingRow = {
  id: string;
  user_id: string;
  email: string | null;
  entitlement_source: string | null;
  tier: string | null;
  plan: string | null;
  subscription_status: string | null;
};

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function getPriceForPlan(plan: PlanTier): string | null {
  if (plan === "professional") return process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ?? null;
  return process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY ?? null;
}

export function getPlanForPrice(priceId: string | null): PlanTier | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY) return "professional";
  if (priceId === process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY) return "essentials";
  return null;
}

export function normalizePlan(plan: PlanTier): { tier: string; plan: string } {
  if (plan === "professional") return { tier: "professional", plan: "pro" };
  return { tier: "essentials", plan: "free" };
}

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function findSupplierByUserId(userId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { supplier: null, error: "SUPABASE_SERVICE_ROLE_KEY missing" };

  const { data, error } = await supabase
    .from("suppliers")
    .select("id,user_id,email,entitlement_source,tier,plan,subscription_status")
    .eq("user_id", userId)
    .maybeSingle<SupplierBillingRow>();

  return { supplier: data ?? null, error: error?.message ?? null };
}

export async function findSupplierByEmail(email: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { supplier: null, error: "SUPABASE_SERVICE_ROLE_KEY missing" };

  const { data, error } = await supabase
    .from("suppliers")
    .select("id,user_id,email,entitlement_source,tier,plan,subscription_status")
    .ilike("email", email)
    .maybeSingle<SupplierBillingRow>();

  return { supplier: data ?? null, error: error?.message ?? null };
}

export async function applyWebStripeEntitlement(params: {
  userId: string;
  plan: PlanTier;
  status: "active" | "trialing" | "past_due" | "canceled" | "inactive";
  expiresAt: string | null;
  trialEndsAt: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY missing" };

  const { tier, plan } = normalizePlan(params.plan);

  const { data: current, error: loadError } = await supabase
    .from("suppliers")
    .select("id,entitlement_source")
    .eq("user_id", params.userId)
    .maybeSingle<{ id: string; entitlement_source: string | null }>();

  if (loadError) return { ok: false, error: loadError.message };
  if (!current) return { ok: false, error: "Supplier not found" };

  if (current.entitlement_source === "ios_iap") {
    return { ok: false, error: "IOS_MANAGED_SUPPLIER", code: "IOS_MANAGED_SUPPLIER" as const };
  }

  const { error: updateError } = await supabase
    .from("suppliers")
    .update({
      entitlement_source: "web_stripe",
      subscription_status: params.status,
      tier,
      plan,
      entitlement_expires_at: params.expiresAt,
      trial_ends_at: params.trialEndsAt,
    })
    .eq("user_id", params.userId);

  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true };
}
