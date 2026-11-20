import Link from "next/link";
import { Coins, CreditCard } from "lucide-react";
import { beginCheckout, manageSubscription } from "@/app/actions/billing";
import { Empty, Notice, PageTitle, Tag } from "@/components/ui";
import { sandboxEnabled } from "@/lib/env";
import { dollars, shortDate, type Query } from "@/lib/format";
import { db } from "@/lib/supabase";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Tokens and Membership" };

export default async function Billing({ searchParams }: { searchParams: Promise<Query> }) {
  const client = await db();
  const viewer = await getViewer();
  const trade = viewer?.profile?.role === "tradesperson" && viewer.profile.status === "active";
  const [products, history, memberPlans, balance] = await Promise.all([
    client.from("billing_products").select("*").eq("active", true).order("price_cents"),
    trade ? client.from("token_ledger").select("*").eq("user_id", viewer.user.id).order("created_at", { ascending: false }).limit(35) : null,
    trade ? client.from("subscriptions").select("*").eq("buyer_id", viewer.user.id).order("created_at", { ascending: false }).limit(4) : null,
    trade ? client.rpc("token_balance") : null,
  ]);
  return <div className="market-surface"><div className="container page">
    <PageTitle title="Tokens and membership" description="Apply to jobs with tokens. Browse jobs before choosing a top-up or membership."
      action={trade && <div className="kpi"><Coins size={18} /><strong>{balance?.data ?? 0}</strong><span>Available tokens</span></div>} />
    <Notice query={await searchParams} />
    {sandboxEnabled() && <div className="notice success"><CreditCard size={18} /><span>Local test checkout. Purchases use simulated payments.</span></div>}
    <div className="plan-grid">
      {(products.data ?? []).map((item) => <article className="panel plan-card" key={item.slug}>
        <Tag value={item.interval === "once" ? "One-time top-up" : "Monthly membership"} />
        <h2>{item.name}</h2><p className="price">{dollars(item.price_cents)} <small>NZD{item.interval === "month" ? " / month" : ""}</small></p>
        <p>{item.credits} application tokens{item.interval === "month" ? " with each paid month" : ""}. One token per job application.</p>
        {trade ? <form action={beginCheckout}><input type="hidden" name="product" value={item.slug} /><button className="button">{item.interval === "once" ? "Buy tokens" : "Choose " + item.name}</button></form>
          : <Link href={viewer ? "/account" : "/register?role=tradesperson"} className="button secondary">{viewer ? "View account" : "Create a trade account"}</Link>}
      </article>)}
    </div>
    {trade && <>
      <section className="panel"><h2>Memberships</h2>
        {memberPlans?.data?.length ? <ul className="ledger-list">{memberPlans.data.map((plan) =>
          <li key={plan.id}><div><strong>{products.data?.find((item) => item.slug === plan.product_slug)?.name ?? plan.product_slug}</strong>
            {plan.renews_at && plan.status !== "cancelled" && <time>Next renewal {shortDate(plan.renews_at)}</time>}</div>
            <div className="buttons"><Tag value={plan.status} />{!["cancelled", "cancelling"].includes(plan.status) && <form action={manageSubscription}>
              <input type="hidden" name="id" value={plan.id} /><button className="button secondary small">Cancel membership</button>
            </form>}</div></li>)}</ul> : <Empty title="No memberships yet" />}
      </section>
      <section className="panel"><h2>Token history</h2>
        {history?.data?.length ? <ul className="ledger-list">{history.data.map((entry) => <li key={entry.id}>
          <div><strong>{entry.reason}</strong><time>{shortDate(entry.created_at)}</time></div>
          <strong>{entry.delta > 0 ? "+" : ""}{entry.delta}</strong></li>)}</ul> : <Empty title="No transactions yet" />}
      </section>
    </>}
  </div></div>;
}
