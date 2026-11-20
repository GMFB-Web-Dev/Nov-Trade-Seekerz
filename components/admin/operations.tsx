import { retryNotifications } from "@/app/actions/admin";
import { Tag } from "@/components/ui";
import type { AdminFilter } from "@/lib/admin";
import { isLoopback, liveIntegrationsEnabled, sandboxEnabled, supabaseEnv } from "@/lib/env";
import { dollars, shortDate } from "@/lib/format";
import { db } from "@/lib/supabase";
import { AdminTable, FilterBar } from "./table";

export async function Subscriptions({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const states = ["active", "past_due", "cancelling", "cancelled"];
  let request = client.from("subscriptions").select(
    "*,profiles(display_name,business_name),billing_products!inner(name),billing_orders(provider)", { count: "exact" });
  if (states.includes(filter.state)) request = request.eq("status", filter.state);
  if (filter.q) request = request.ilike("billing_products.name", "%" + filter.q + "%");
  const { data, count, error } = await request.order("created_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load subscriptions.");
  return <>
    <FilterBar path="/admin/subscriptions" filter={filter} states={states} search="Plan name" />
    <AdminTable columns={["Member", "Plan", "Status", "Renews", "Provider"]} path="/admin/subscriptions" total={count} filter={filter}>
      {data.map((item) => <tr key={item.id}><td>{item.profiles?.business_name || item.profiles?.display_name || "Account removed"}</td>
        <td>{item.billing_products.name}</td><td><Tag value={item.status} /></td>
        <td>{item.renews_at && item.status !== "cancelled" ? shortDate(item.renews_at) : "—"}</td><td>{item.billing_orders.provider}</td></tr>)}
    </AdminTable>
  </>;
}

export async function BillingOrders({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const states = ["pending","paid","failed","refunded","disputed"];
  let request = client.from("billing_orders").select(
    "*,profiles(display_name,business_name),billing_products!inner(name)", { count: "exact" });
  if (states.includes(filter.state)) request = request.eq("status", filter.state);
  if (filter.q) request = request.ilike("billing_products.name", "%" + filter.q + "%");
  const { data, count, error } = await request.order("created_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load orders.");
  return <>
    <FilterBar path="/admin/billing" filter={filter} states={states} search="Product name" />
    <AdminTable columns={["Buyer", "Product", "Amount", "Status", "Created"]} path="/admin/billing" total={count} filter={filter}>
      {data.map((item) => <tr key={item.id}><td>{item.profiles?.business_name || item.profiles?.display_name || "Account removed"}</td>
        <td>{item.billing_products.name}<small>{item.provider}</small></td><td>{dollars(item.price_cents)}</td><td><Tag value={item.status} /></td>
        <td>{shortDate(item.created_at)}</td></tr>)}
    </AdminTable>
  </>;
}

export async function Errors({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const { data, count, error } = await client.from("system_errors").select("*", { count: "exact" })
    .order("created_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load error records.");
  return <AdminTable columns={["Operation", "Code", "Recorded"]} path="/admin/errors" total={count} filter={filter}>
    {data.map((item) => <tr key={item.id}><td>{item.scope}</td><td><code>{item.code}</code></td><td>{shortDate(item.created_at)}</td></tr>)}
  </AdminTable>;
}

export async function Audit({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const { data, count, error } = await client.from("audit_log").select("*,profiles(display_name)", { count: "exact" })
    .order("created_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load audit history.");
  return <AdminTable columns={["Action", "Admin", "Subject", "Recorded"]} path="/admin/audit" total={count} filter={filter}>
    {data.map((item) => <tr key={item.id}><td><code>{item.event}</code></td><td>{item.profiles?.display_name || "Account removed"}</td>
      <td><small>{item.subject_id}</small></td><td>{shortDate(item.created_at)}</td></tr>)}
  </AdminTable>;
}

export function Settings() {
  const isLocal = isLoopback(supabaseEnv().url);
  const checkout = sandboxEnabled() ? "Local test checkout" : liveIntegrationsEnabled() ? "Stripe integration enabled" : "Checkout disabled";
  const mailpit = process.env.MAILPIT_WEB_URL || "http://127.0.0.1:55424";
  return <div className="panel stack"><h2>Service status</h2>
    <p>Database <strong>{isLocal ? "Local Supabase" : "Configured Supabase project"}</strong></p>
    <p>Billing <strong>{checkout}</strong></p>
    <p>Transactional mail <strong>{isLocal ? "Mailpit" : liveIntegrationsEnabled() && process.env.RESEND_API_KEY ? "Resend" : "Delivery disabled"}</strong></p>
    <div className="buttons">{isLocal && isLoopback(mailpit) && <a className="button secondary" href={mailpit}>Open local mail inbox</a>}
      <form action={retryNotifications}><button className="button" type="submit">Process due notifications</button></form></div>
  </div>;
}
