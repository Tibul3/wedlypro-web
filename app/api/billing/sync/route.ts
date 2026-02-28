export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  findSupplierByUserId,
  getStripeClient,
  syncWebStripeEntitlementForUser,
} from "../../../lib/server/billing";

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

  const supplierLookup = await findSupplierByUserId(user.id);
  if (supplierLookup.error) {
    return NextResponse.json({ error: supplierLookup.error }, { status: 500 });
  }

  if (!supplierLookup.supplier) {
    return NextResponse.json({ error: "Supplier profile not found." }, { status: 404 });
  }

  if (supplierLookup.supplier.entitlement_source === "ios_iap") {
    return NextResponse.json(
      {
        error: "This account is managed by Apple subscriptions.",
        code: "IOS_MANAGED",
      },
      { status: 409 },
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const synced = await syncWebStripeEntitlementForUser({
    stripe,
    userId: user.id,
    email: user.email,
  });

  if (!synced.ok) {
    const status = synced.code === "CUSTOMER_NOT_FOUND" || synced.code === "SUBSCRIPTION_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: synced.message, code: synced.code }, { status });
  }

  return NextResponse.json({
    ok: true,
    code: synced.code,
    plan: synced.plan,
    status: synced.status,
    entitlement_expires_at: synced.expiresAt,
    trial_ends_at: synced.trialEndsAt,
  });
}
