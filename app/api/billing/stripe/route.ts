import type Stripe from "stripe";
import { recordBilling, reference, stripe, time, type BillingEvent } from "@/lib/billing";
import { liveIntegrationsEnabled } from "@/lib/env";

export const runtime = "nodejs";

function membershipStatus(subscription: Stripe.Subscription) {
  if (["canceled", "incomplete_expired"].includes(subscription.status)) return "cancelled";
  if (subscription.cancel_at_period_end) return "cancelling";
  if (["active", "trialing"].includes(subscription.status)) return "active";
  return "past_due";
}

async function processEvent(event: Stripe.Event) {
  const base = { event_key: event.id, billing_provider: "stripe" };
  let entry: BillingEvent | undefined;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      if (session.mode !== "payment" || !session.client_reference_id
        || (session.payment_status !== "paid" && event.type !== "checkout.session.async_payment_failed")) return;
      entry = {
        ...base, order_key: session.client_reference_id,
        event_kind: event.type === "checkout.session.async_payment_failed" ? "failed" : "paid",
        payment_ref: reference(session.payment_intent),
        total_cents: session.amount_total ?? undefined, currency_code: session.currency ?? undefined,
      };
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const details = invoice.parent?.subscription_details;
      const membership = reference(details?.subscription);
      if (!membership) return;
      const subscription = await stripe().subscriptions.retrieve(membership);
      const order = subscription.metadata.order_id;
      if (!order) return;
      const payments = event.type === "invoice.paid"
        ? await stripe().invoicePayments.list({ invoice: invoice.id, status: "paid", limit: 10 })
        : null;
      const intent = payments?.data.find((item) => item.payment.type === "payment_intent")?.payment.payment_intent;
      entry = {
        ...base, order_key: order, event_kind: event.type === "invoice.paid" ? "paid" : "failed",
        payment_ref: reference(intent) || invoice.id, total_cents: invoice.amount_paid, currency_code: invoice.currency,
        membership_ref: membership, next_renewal: time(subscription.items.data[0]?.current_period_end),
      };
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.type === "customer.subscription.deleted"
        ? event.data.object : await stripe().subscriptions.retrieve(event.data.object.id);
      const order = subscription.metadata.order_id;
      if (!order) return;
      entry = {
        ...base, order_key: order, event_kind: "membership", membership_ref: subscription.id,
        membership_state: membershipStatus(subscription), next_renewal: time(subscription.items.data[0]?.current_period_end),
      };
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const payment = reference(charge.payment_intent);
      if (!payment) return;
      entry = { ...base, event_kind: "refunded", payment_ref: payment, total_cents: charge.amount_refunded };
      break;
    }
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const dispute = event.data.object;
      const charge = typeof dispute.charge === "string" ? await stripe().charges.retrieve(dispute.charge) : dispute.charge;
      const payment = reference(charge.payment_intent);
      if (!payment) return;
      if (event.type === "charge.dispute.closed" && dispute.status !== "won") return;
      const won = dispute.status === "won";
      entry = {
        ...base, event_kind: won ? "dispute_won" : "disputed",
        payment_ref: payment, total_cents: won ? charge.amount_refunded : dispute.amount,
      };
      break;
    }
  }
  if (entry) await recordBilling(entry);
}

export async function POST(request: Request) {
  if (!liveIntegrationsEnabled()) return new Response("Checkout is disabled.", { status: 404 });
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response("Missing verification configuration.", { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Invalid event signature.", { status: 400 });
  }
  try {
    await processEvent(event);
    return Response.json({ received: true });
  } catch {
    console.error("stripe-event", { type: event.type, id: event.id });
    return new Response("Processing will retry.", { status: 503 });
  }
}
