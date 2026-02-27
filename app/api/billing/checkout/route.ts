import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SupplierBillingRow = {
  id: string;
  entitlement_source: string | null;
  tier: string | null;
  plan: string | null;
  subscription_status: string | null;
};

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
        error: "IAP users are managed by Apple subscriptions.",
        code: "IOS_MANAGED",
      },
      { status: 409 },
    );
  }

  if (supplier.entitlement_source === "web_stripe") {
    return NextResponse.json(
      {
        ok: true,
        action: "portal",
        message: "Web Stripe portal wiring pending.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      action: "checkout",
      code: "WEB_CHECKOUT_NOT_READY",
      message: "Web checkout is not connected yet.",
    },
    { status: 501 },
  );
}
