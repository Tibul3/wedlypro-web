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

type ApplyStatus = "active" | "trialing" | "grace_period" | "past_due" | "canceled" | "inactive";

type SyncResult = {
  ok: boolean;
  code: string;
  message: string;
  plan?: PlanTier;
  status?: ApplyStatus;
  expiresAt?: string | null;
  trialEndsAt?: string | null;
};

export type BillingWebhookLogInput = {
  eventId: string;
  eventType: string;
  deliveryStatus: "received" | "processed" | "ignored" | "error";
  errorMessage?: string | null;
  payload?: unknown;
  supplierUserId?: string | null;
};

type CandidateSubscription = {
  subscription: Stripe.Subscription;
  customerId: string;
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

export async function hasProcessedBillingWebhookEvent(eventId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("billing_webhook_events")
    .select("event_id,delivery_status")
    .eq("provider", "stripe")
    .eq("event_id", eventId)
    .maybeSingle<{ event_id: string; delivery_status: string }>();

  if (error) {
    const missingTable = /relation .*billing_webhook_events.* does not exist/i.test(error.message);
    if (!missingTable) {
      console.warn("billing_webhook_events lookup failed", error.message);
    }
    return false;
  }

  return data?.delivery_status === "processed";
}

export async function applyWebStripeEntitlement(params: {
  userId: string;
  plan: PlanTier;
  status: ApplyStatus;
  expiresAt: string | null;
  trialEndsAt: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
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

  const updatePayload: Record<string, unknown> = {
    entitlement_source: "web_stripe",
    subscription_status: params.status,
    tier,
    plan,
    entitlement_expires_at: params.expiresAt,
    trial_ends_at: params.trialEndsAt,
  };

  if (params.stripeCustomerId) updatePayload.stripe_customer_id = params.stripeCustomerId;
  if (params.stripeSubscriptionId) updatePayload.stripe_subscription_id = params.stripeSubscriptionId;

  const { error: updateError } = await supabase.from("suppliers").update(updatePayload).eq("user_id", params.userId);

  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true };
}

export async function logBillingWebhookEvent(input: BillingWebhookLogInput): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const { error } = await supabase.from("billing_webhook_events").upsert(
    {
      event_id: input.eventId,
      event_type: input.eventType,
      provider: "stripe",
      delivery_status: input.deliveryStatus,
      error_message: input.errorMessage ?? null,
      payload: input.payload ?? null,
      supplier_user_id: input.supplierUserId ?? null,
    },
    {
      onConflict: "provider,event_id",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    const missingTable = /relation .*billing_webhook_events.* does not exist/i.test(error.message);
    if (!missingTable) {
      console.warn("billing_webhook_events upsert failed", error.message);
    }
  }
}

function toIsoOrNull(unixSeconds?: number | null): string | null {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function mapStripeStatus(status: Stripe.Subscription.Status): ApplyStatus {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  return "inactive";
}

function pickBestSubscription(candidates: CandidateSubscription[]): CandidateSubscription | null {
  if (candidates.length === 0) return null;

  const priority: Record<string, number> = {
    active: 5,
    trialing: 4,
    past_due: 3,
    unpaid: 2,
    canceled: 1,
    incomplete: 0,
    incomplete_expired: 0,
    paused: 0,
  };

  return [...candidates].sort((a, b) => {
    const pa = priority[a.subscription.status] ?? 0;
    const pb = priority[b.subscription.status] ?? 0;
    if (pa !== pb) return pb - pa;
    const aCreated = typeof a.subscription.created === "number" ? a.subscription.created : 0;
    const bCreated = typeof b.subscription.created === "number" ? b.subscription.created : 0;
    return bCreated - aCreated;
  })[0];
}

async function findCustomerIdsForUser(params: {
  stripe: Stripe;
  userId: string;
  email?: string | null;
}): Promise<string[]> {
  const ids = new Set<string>();

  try {
    const matches = await params.stripe.customers.search({
      query: `metadata['supabase_user_id']:'${params.userId}'`,
      limit: 20,
    });
    for (const c of matches.data) ids.add(c.id);
  } catch {
    // Search API may be unavailable for some accounts/API versions; fallback below.
  }

  if (params.email) {
    const customers = await params.stripe.customers.list({ email: params.email, limit: 20 });
    for (const c of customers.data) ids.add(c.id);
  }

  return Array.from(ids);
}

export async function syncWebStripeEntitlementForUser(params: {
  stripe: Stripe;
  userId: string;
  email?: string | null;
}): Promise<SyncResult> {
  const supplierResult = await findSupplierByUserId(params.userId);
  if (supplierResult.error) {
    return { ok: false, code: "SUPPLIER_LOOKUP_FAILED", message: supplierResult.error };
  }

  const supplier = supplierResult.supplier;
  if (!supplier) {
    return { ok: false, code: "SUPPLIER_NOT_FOUND", message: "Supplier not found." };
  }

  if (supplier.entitlement_source === "ios_iap") {
    return {
      ok: false,
      code: "IOS_MANAGED_SUPPLIER",
      message: "Supplier is managed by Apple subscriptions.",
    };
  }

  const customerIds = await findCustomerIdsForUser({
    stripe: params.stripe,
    userId: params.userId,
    email: params.email,
  });

  if (customerIds.length === 0) {
    return {
      ok: false,
      code: "CUSTOMER_NOT_FOUND",
      message: "No Stripe customer found for this account.",
    };
  }

  const candidates: CandidateSubscription[] = [];
  for (const customerId of customerIds) {
    const subs = await params.stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    for (const sub of subs.data) {
      candidates.push({ subscription: sub, customerId });
    }
  }

  const picked = pickBestSubscription(candidates);
  if (!picked) {
    return {
      ok: false,
      code: "SUBSCRIPTION_NOT_FOUND",
      message: "No Stripe subscriptions found for this customer.",
    };
  }

  const subscription = picked.subscription;
  const activePrice = subscription.items.data[0]?.price?.id ?? null;
  const mappedPlan = getPlanForPrice(activePrice);

  if (!mappedPlan) {
    return {
      ok: false,
      code: "UNKNOWN_PRICE",
      message: `Unknown Stripe price id: ${activePrice ?? "none"}`,
    };
  }

  const period = subscription as unknown as {
    current_period_end?: number | null;
    trial_end?: number | null;
    cancel_at_period_end?: boolean | null;
  };
  const now = Date.now();
  const periodEndMs = (period.current_period_end ?? 0) * 1000;

  let mappedStatus = mapStripeStatus(subscription.status);
  if ((subscription.status === "active" || subscription.status === "trialing") && period.cancel_at_period_end) {
    mappedStatus = "grace_period";
  } else if (subscription.status === "canceled" && periodEndMs > now) {
    mappedStatus = "active";
  }

  const expiresAt = toIsoOrNull(period.current_period_end);
  const trialEndsAt = toIsoOrNull(period.trial_end);

  const applyResult = await applyWebStripeEntitlement({
    userId: params.userId,
    plan: mappedPlan,
    status: mappedStatus,
    expiresAt,
    trialEndsAt,
    stripeCustomerId: picked.customerId,
    stripeSubscriptionId: subscription.id,
  });

  if (!applyResult.ok) {
    return {
      ok: false,
      code: applyResult.code ?? "ENTITLEMENT_UPDATE_FAILED",
      message: applyResult.error ?? "Failed to apply entitlement update.",
    };
  }

  return {
    ok: true,
    code: "SYNC_APPLIED",
    message: "Entitlement synced from Stripe.",
    plan: mappedPlan,
    status: mappedStatus,
    expiresAt,
    trialEndsAt,
  };
}
