export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  type PlanTier,
  findSupplierByUserId,
  getPriceForPlan,
  getStripeClient,
} from "../../../lib/server/billing";

type SupplierBillingRow = {
  id: string;
  entitlement_source: string | null;
  tier: string | null;
  plan: string | null;
  subscription_status: string | null;
};

type CheckoutRequest = {
  action?: "checkout" | "portal";
  plan?: PlanTier;
};

function getAppOrigin(request: Request): string {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (envOrigin) return envOrigin;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Missing Supabase environment configuration." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
  }

  let payload: CheckoutRequest = {};
  try {
    payload = (await request.json()) as CheckoutRequest;
  } catch {
    payload = {};
  }

  const action = payload.action ?? "checkout";
  const plan = payload.plan ?? "essentials";
  const token = authHeader.slice(7);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
  }

  const { data: supplier, error: supplierError } = await supabase
    .from("suppliers")
    .select("id,entitlement_source,tier,plan,subscription_status")
    .eq("user_id", user.id)
    .maybeSingle<SupplierBillingRow>();

  if (supplierError) {
    return NextResponse.json({ error: supplierError.message }, { status: 500 });
  }

  if (!supplier) {
    return NextResponse.json({ error: "Supplier profile not found." }, { status: 404 });
  }

  if (supplier.entitlement_source === "ios_iap") {
    return NextResponse.json(
      {
        error: "This subscription is managed by Apple.",
        code: "IOS_MANAGED",
      },
      { status: 409 },
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const origin = getAppOrigin(request);
  const returnUrl = `${origin}/app/billing`;

  if (action === "portal") {
    const byUser = await findSupplierByUserId(user.id);
    if (byUser.error) return NextResponse.json({ error: byUser.error }, { status: 500 });

    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    const exactMatch = customers.data.find((customer) => customer.metadata?.supabase_user_id === user.id);
    const customer = exactMatch ?? customers.data[0] ?? null;

    if (!customer) {
      return NextResponse.json(
        {
          error: "No Stripe customer found for this account yet.",
          code: "CUSTOMER_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    return NextResponse.json({ ok: true, action: "portal", url: portalSession.url });
  }

  if (supplier.entitlement_source === "web_stripe") {
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    const exactMatch = customers.data.find((customer) => customer.metadata?.supabase_user_id === user.id);
    const customer = exactMatch ?? customers.data[0] ?? null;

    if (customer) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: returnUrl,
      });
      return NextResponse.json({ ok: true, action: "portal", url: portalSession.url });
    }
  }

  const priceId = getPriceForPlan(plan);
  if (!priceId) {
    return NextResponse.json({ error: `Missing Stripe price configuration for ${plan}.` }, { status: 500 });
  }

  const shouldApplyTrial = supplier.entitlement_source !== "web_stripe" && supplier.subscription_status !== "active";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?checkout=success`,
    cancel_url: `${returnUrl}?checkout=cancelled`,
    client_reference_id: user.id,
    customer_email: user.email,
    allow_promotion_codes: true,
    metadata: {
      supabase_user_id: user.id,
      supplier_id: supplier.id,
      requested_plan: plan,
    },
    subscription_data: {
      trial_period_days: shouldApplyTrial ? 14 : undefined,
      metadata: {
        supabase_user_id: user.id,
        supplier_id: supplier.id,
      },
    },
  });

  return NextResponse.json({ ok: true, action: "checkout", url: checkoutSession.url });
}
