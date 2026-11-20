"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { recordBilling, stripe, stripePrice } from "@/lib/billing";
import { appUrl, liveIntegrationsEnabled, sandboxEnabled } from "@/lib/env";
import { failure, idSchema, mutate, parse, slugSchema } from "@/lib/forms";
import { withNotice } from "@/lib/format";
import { db, serviceDb } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export async function beginCheckout(form: FormData) {
  const viewer = await member("tradesperson");
  const path = "/billing";
  const { product } = parse(z.object({ product: slugSchema }), form, path);
  const provider = sandboxEnabled() ? "local" : "stripe";
  const price = provider === "stripe" && liveIntegrationsEnabled() ? stripePrice(product) : null;
  if (provider === "stripe" && !price) failure(path, "Checkout is currently disabled.");
  const id = await mutate("new_order", { product, provider }, path);
  if (provider === "local") redirect("/billing/checkout/" + id);

  const client = serviceDb();
  const bill = await client.from("billing_orders").select("*").eq("id", id).eq("buyer_id", viewer.user.id).single();
  if (bill.error || !price) failure(path, "Could not initialise checkout.");

  let checkoutUrl: string | null = null;
  try {
    const checkout = await stripe().checkout.sessions.create({
      mode: bill.data.interval === "once" ? "payment" : "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: viewer.user.email,
      client_reference_id: id,
      metadata: { order_id: id },
      ...(bill.data.interval === "month" ? { subscription_data: { metadata: { order_id: id } } } : {}),
      success_url: appUrl() + "/billing?success=Checkout+submitted.+Payment+updates+will+appear+here.",
      cancel_url: appUrl() + "/billing",
    }, { idempotencyKey: "market-order/" + id });
    const stored = await client.from("billing_orders").update({ provider_session: checkout.id }).eq("id", id);
    if (stored.error || !checkout.url) throw new Error("Checkout URL could not be saved");
    checkoutUrl = checkout.url;
  } catch {
    failure(path, "Checkout is unavailable. Try again shortly.");
  }
  redirect(checkoutUrl);
}

export async function completeTestCheckout(form: FormData) {
  const { user } = await member("tradesperson");
  const { id, outcome } = parse(z.object({ id: idSchema, outcome: z.enum(["paid", "failed"]) }), form, "/billing");
  const path = "/billing/checkout/" + id;
  if (!sandboxEnabled()) failure("/billing", "Local test checkout is disabled.");
  const client = await db();
  const { data: order } = await client.from("billing_orders").select("*")
    .eq("id", id).eq("buyer_id", user.id).eq("provider", "local").maybeSingle();
  if (!order) failure("/billing", "That test order is unavailable.");
  const renewal = new Date();
  renewal.setUTCMonth(renewal.getUTCMonth() + 1);
  try {
    await recordBilling({
      event_key: "local:" + outcome + ":" + id,
      event_kind: outcome,
      billing_provider: "local",
      order_key: id,
      payment_ref: "local-payment:" + id,
      membership_ref: order.interval === "month" ? "local-subscription:" + id : undefined,
      total_cents: order.price_cents,
      currency_code: order.currency,
      next_renewal: renewal.toISOString(),
    });
  } catch {
    failure(path, "Could not process the test payment.");
  }
  redirect(withNotice("/billing", outcome === "paid" ? "success" : "error",
    outcome === "paid" ? "Test payment completed. Your tokens are ready." : "Test payment failed. No tokens were credited."));
}

export async function manageSubscription(form: FormData) {
  const viewer = await member("tradesperson");
  const { id } = parse(z.object({ id: idSchema }), form, "/billing");
  const client = await db();
  const { data } = await client.from("subscriptions").select("*,billing_orders(provider)")
    .eq("id", id).eq("buyer_id", viewer.user.id).maybeSingle();
  if (!data || data.status === "cancelled") failure("/billing", "That membership is unavailable.");
  try {
    if (data.billing_orders.provider === "local") {
      if (!sandboxEnabled()) throw new Error("Local checkout disabled");
      await recordBilling({
        event_key: "local:cancel:" + data.id, event_kind: "membership", billing_provider: "local",
        order_key: data.order_id, membership_state: "cancelled",
      });
    } else {
      await stripe().subscriptions.update(data.provider_ref, { cancel_at_period_end: true });
    }
  } catch {
    failure("/billing", "Could not update the membership. Try again.");
  }
  redirect(withNotice("/billing", "success", "Membership cancellation requested."));
}
