export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getStripeClient,
  logBillingWebhookEvent,
  syncWebStripeEntitlementForUser,
} from "../../../lib/server/billing";

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

  return null;
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

  await logBillingWebhookEvent({
    eventId: event.id,
    eventType: event.type,
    deliveryStatus: "received",
    payload: event,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) {
          await logBillingWebhookEvent({
            eventId: event.id,
            eventType: event.type,
            deliveryStatus: "ignored",
            errorMessage: "Checkout session was not subscription mode.",
            payload: session,
          });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        const userId = await resolveUserIdFromSubscription(stripe, subscription);

        if (!userId) {
          await logBillingWebhookEvent({
            eventId: event.id,
            eventType: event.type,
            deliveryStatus: "error",
            errorMessage: "Could not resolve Supabase user id from subscription metadata/customer.",
            payload: subscription,
          });
          return NextResponse.json({ error: "Mapping not found", code: "MAPPING_NOT_FOUND" }, { status: 500 });
        }

        const synced = await syncWebStripeEntitlementForUser({
          stripe,
          userId,
          email: session.customer_details?.email,
        });

        if (!synced.ok && synced.code !== "IOS_MANAGED_SUPPLIER") {
          await logBillingWebhookEvent({
            eventId: event.id,
            eventType: event.type,
            deliveryStatus: "error",
            errorMessage: synced.message,
            payload: subscription,
            supplierUserId: userId,
          });
          return NextResponse.json({ error: synced.message, code: synced.code }, { status: 500 });
        }

        await logBillingWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          deliveryStatus: synced.ok ? "processed" : "ignored",
          errorMessage: synced.ok ? null : synced.message,
          payload: { plan: synced.plan, status: synced.status },
          supplierUserId: userId,
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserIdFromSubscription(stripe, subscription);

        if (!userId) {
          await logBillingWebhookEvent({
            eventId: event.id,
            eventType: event.type,
            deliveryStatus: "error",
            errorMessage: "Could not resolve Supabase user id from subscription metadata/customer.",
            payload: subscription,
          });
          return NextResponse.json({ error: "Mapping not found", code: "MAPPING_NOT_FOUND" }, { status: 500 });
        }

        const synced = await syncWebStripeEntitlementForUser({
          stripe,
          userId,
        });

        if (!synced.ok && synced.code !== "IOS_MANAGED_SUPPLIER") {
          await logBillingWebhookEvent({
            eventId: event.id,
            eventType: event.type,
            deliveryStatus: "error",
            errorMessage: synced.message,
            payload: subscription,
            supplierUserId: userId,
          });
          return NextResponse.json({ error: synced.message, code: synced.code }, { status: 500 });
        }

        await logBillingWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          deliveryStatus: synced.ok ? "processed" : "ignored",
          errorMessage: synced.ok ? null : synced.message,
          payload: { plan: synced.plan, status: synced.status },
          supplierUserId: userId,
        });
        break;
      }

      default: {
        await logBillingWebhookEvent({
          eventId: event.id,
          eventType: event.type,
          deliveryStatus: "ignored",
          errorMessage: "Event not handled by this endpoint.",
          payload: event,
        });
        break;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handling failed";
    await logBillingWebhookEvent({
      eventId: event.id,
      eventType: event.type,
      deliveryStatus: "error",
      errorMessage: message,
      payload: event,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
