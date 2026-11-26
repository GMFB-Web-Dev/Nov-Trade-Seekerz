import { retryNotifications } from "@/app/actions/admin";
import { Tag } from "@/components/ui";
import type { AdminFilter } from "@/lib/admin";
import { isLoopback, liveIntegrationsEnabled, resendEnabled, sandboxEnabled, supabaseEnv } from "@/lib/env";
import { dollars, shortDate } from "@/lib/format";
import { db } from "@/lib/supabase";
import { AdminTable, FilterBar, readAdminPage } from "./table";

export async function Subscriptions({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const states = ["active", "past_due", "cancelling", "cancelled"];
  let request = client.from("subscriptions").select(
    "*,profiles(display_name,business_name),billing_products!inner(name),billing_orders(provider)", { count: "exact" });
  if (states.includes(filter.state)) request = request.eq("status", filter.state);
  if (filter.q) request = request.ilike("billing_products.name", "%" + filter.q + "%");
  const { data, count } = await readAdminPage(request.order("created_at", { ascending: false }), filter, "Could not load subscriptions.");
  return <>
    <FilterBar path="/admin/subscriptions" filter={filter} states={states} search="Plan name" />
    <AdminTable path="/admin/subscriptions" total={count} filter={filter} rows={data.map((item) => ({
      id: item.id,
      cells: {
        Member: <strong>{item.profiles?.business_name || item.profiles?.display_name || "Account removed"}</strong>,
        Plan: item.billing_products.name,
        Status: <Tag value={item.status} />,
        Renews: item.renews_at && item.status !== "cancelled" ? shortDate(item.renews_at) : "—",
        Provider: item.billing_orders.provider,
      },
    }))} />
  </>;
}

export async function BillingOrders({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const states = ["pending","paid","failed","refunded","disputed"];
  let request = client.from("billing_orders").select(
    "*,profiles(display_name,business_name),billing_products!inner(name)", { count: "exact" });
  if (states.includes(filter.state)) request = request.eq("status", filter.state);
  if (filter.q) request = request.ilike("billing_products.name", "%" + filter.q + "%");
  const { data, count } = await readAdminPage(request.order("created_at", { ascending: false }), filter, "Could not load orders.");
  return <>
    <FilterBar path="/admin/billing" filter={filter} states={states} search="Product name" />
    <AdminTable path="/admin/billing" total={count} filter={filter} rows={data.map((item) => ({
      id: item.id,
      cells: {
        Buyer: <strong>{item.profiles?.business_name || item.profiles?.display_name || "Account removed"}</strong>,
        Product: <>{item.billing_products.name}<small>{item.provider}</small></>,
        Amount: dollars(item.price_cents),
        Status: <Tag value={item.status} />,
        Created: shortDate(item.created_at),
      },
    }))} />
  </>;
}

export async function Errors({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const query = client.from("system_errors").select("*", { count: "exact" }).order("created_at", { ascending: false });
  const { data, count } = await readAdminPage(query, filter, "Could not load error records.");
  return <AdminTable path="/admin/errors" total={count} filter={filter} rows={data.map((item) => ({
    id: item.id,
    cells: {
      Operation: item.scope,
      Code: <code>{item.code}</code>,
      Recorded: shortDate(item.created_at),
    },
  }))} />;
}

export async function Audit({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const query = client.from("audit_log").select("*,profiles(display_name)", { count: "exact" }).order("created_at", { ascending: false });
  const { data, count } = await readAdminPage(query, filter, "Could not load audit history.");
  return <AdminTable path="/admin/audit" total={count} filter={filter} rows={data.map((item) => ({
    id: item.id,
    cells: {
      Action: <code>{item.event}</code>,
      Admin: item.profiles?.display_name || "Account removed",
      Subject: <small>{item.subject_id}</small>,
      Recorded: shortDate(item.created_at),
    },
  }))} />;
}

export function Settings() {
  const isLocal = isLoopback(supabaseEnv().url);
  const checkout = sandboxEnabled() ? "Local test checkout" : liveIntegrationsEnabled() ? "Stripe integration enabled" : "Checkout disabled";
  const mailpit = process.env.MAILPIT_WEB_URL || "http://127.0.0.1:55424";
  return <div className="panel stack"><h2>Service status</h2>
    <dl className="admin-service-list">
      <div><dt>Database</dt><dd>{isLocal ? "Local Supabase" : "Configured Supabase project"}</dd></div>
      <div><dt>Billing</dt><dd>{checkout}</dd></div>
      <div><dt>Transactional mail</dt><dd>{isLocal ? "Mailpit" : resendEnabled() && process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "Resend" : "Delivery disabled"}</dd></div>
    </dl>
    <div className="buttons">{isLocal && isLoopback(mailpit) && <a className="button secondary" href={mailpit}>Open local mail inbox</a>}
      <form action={retryNotifications}><button className="button" type="submit">Process due notifications</button></form></div>
  </div>;
}
