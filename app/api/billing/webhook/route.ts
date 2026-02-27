export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  applyWebStripeEntitlement,
  findSupplierByEmail,
  getPlanForPrice,
  getStripeClient,
} from "../../../lib/server/billing";

function toIsoOrNull(unixSeconds?: number | null): string | null {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

function mapStripeStatus(status: Stripe.Subscription.Status): "active" | "trialing" | "past_due" | "canceled" | "inactive" {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due") return "past_due";
  if (status === "canceled") return "canceled";
  return "inactive";
}

async function resolveUserIdFromSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.supabase_user_id;
  if (fromMetadata) return fromMetadata;

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) return null;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  if (customer.metadata?.supabase_user_id) return customer.metadata.supabase_user_id;

  if (customer.email) {
    const byEmail = await findSupplierByEmail(customer.email);
    if (byEmail.supplier?.user_id) return byEmail.supplier.user_id;
  }

  return null;
}

async function applySubscriptionUpdate(stripe: Stripe, subscription: Stripe.Subscription) {
  const userId = await resolveUserIdFromSubscription(stripe, subscription);
  if (!userId) {
    return { ok: false, error: "No supabase user mapping found", code: "MAPPING_NOT_FOUND" } as const;
  }

  const activePrice = subscription.items.data[0]?.price?.id ?? null;
  const plan = getPlanForPrice(activePrice);
  if (!plan) {
    return { ok: false, error: `Unknown Stripe price id: ${activePrice ?? "none"}`, code: "UNKNOWN_PRICE" } as const;
  }

  const period = subscription as unknown as { current_period_end?: number | null; trial_end?: number | null };
  const now = Date.now();
  const periodEndMs = (period.current_period_end ?? 0) * 1000;

  let mappedStatus = mapStripeStatus(subscription.status);
  if (subscription.status === "canceled" && periodEndMs > now) {
    mappedStatus = "active";
  }

  const result = await applyWebStripeEntitlement({
    userId,
    plan,
    status: mappedStatus,
    expiresAt: toIsoOrNull(period.current_period_end),
    trialEndsAt: toIsoOrNull(period.trial_end),
  });

  return result.ok
    ? ({ ok: true } as const)
    : ({ ok: false, error: result.error, code: result.code ?? "UPDATE_FAILED" } as const);
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        const applied = await applySubscriptionUpdate(stripe, subscription);

        if (!applied.ok && applied.code !== "IOS_MANAGED_SUPPLIER") {
          return NextResponse.json({ error: applied.error, code: applied.code }, { status: 500 });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const applied = await applySubscriptionUpdate(stripe, subscription);

        if (!applied.ok && applied.code !== "IOS_MANAGED_SUPPLIER") {
          return NextResponse.json({ error: applied.error, code: applied.code }, { status: 500 });
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handling failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
