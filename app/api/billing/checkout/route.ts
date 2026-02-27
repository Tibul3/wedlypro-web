import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

type SupplierBillingRow = {
  id: string;
  entitlement_source: string | null;
  tier: string | null;
  plan: string | null;
  subscription_status: string | null;
};

type CheckoutRequest = {
  action?: "checkout" | "portal";
  plan?: "essentials" | "professional";
};

function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getAppOrigin(request: Request): string {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (envOrigin) return envOrigin;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function findCustomerId(stripe: Stripe, email: string | undefined, supabaseUserId: string): Promise<string | null> {
  if (!email) return null;
  const customers = await stripe.customers.list({ email, limit: 10 });
  const exactMatch = customers.data.find((customer) => customer.metadata?.supabase_user_id === supabaseUserId);
  if (exactMatch) return exactMatch.id;
  return customers.data[0]?.id ?? null;
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
    const customerId = await findCustomerId(stripe, user.email, user.id);
    if (!customerId) {
      return NextResponse.json(
        {
          error: "No Stripe customer found for this account yet.",
          code: "CUSTOMER_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ ok: true, action: "portal", url: portalSession.url });
  }

  if (supplier.entitlement_source === "web_stripe") {
    const customerId = await findCustomerId(stripe, user.email, user.id);
    if (customerId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return NextResponse.json({ ok: true, action: "portal", url: portalSession.url });
    }
  }

  const essentialsPriceId = process.env.STRIPE_PRICE_ESSENTIALS_MONTHLY;
  const professionalPriceId = process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY;

  const priceId = plan === "professional" ? professionalPriceId : essentialsPriceId;

  if (!priceId) {
    return NextResponse.json(
      {
        error: `Missing Stripe price configuration for ${plan}.`,
      },
      { status: 500 },
    );
  }

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
      metadata: {
        supabase_user_id: user.id,
        supplier_id: supplier.id,
      },
    },
  });

  return NextResponse.json({ ok: true, action: "checkout", url: checkoutSession.url });
}
