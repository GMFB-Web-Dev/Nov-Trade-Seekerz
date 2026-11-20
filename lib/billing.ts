import "server-only";
import Stripe from "stripe";
import { liveIntegrationsEnabled } from "./env";
import { serviceDb } from "./supabase";
import { operationalError } from "./ops";
import type { Database } from "./database.types";

export type BillingEvent = Database["public"]["Functions"]["record_billing_event"]["Args"];

let stripeClient: Stripe | undefined;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!liveIntegrationsEnabled() || !key) throw new Error("Stripe checkout is disabled.");
  stripeClient ??= new Stripe(key, { maxNetworkRetries: 2 });
  return stripeClient;
}

const priceVariables: Record<string, string> = {
  "credits-20": "STRIPE_PRICE_CREDITS_20",
  starter: "STRIPE_PRICE_STARTER",
  pro: "STRIPE_PRICE_PRO",
};

export function stripePrice(product: string) {
  const variable = priceVariables[product];
  return variable && process.env[variable];
}

export async function recordBilling(event: BillingEvent) {
  const result = await serviceDb().rpc("record_billing_event", event);
  if (result.error) {
    await operationalError("billing-" + event.event_kind, result.error.code);
    throw new Error("The payment could not be reconciled.");
  }
  return result.data;
}

export function reference<T extends { id: string }>(value: string | T | null | undefined) {
  if (typeof value === "string") return value;
  return value?.id;
}

export function time(seconds?: number | null) {
  return seconds ? new Date(seconds * 1000).toISOString() : undefined;
}
