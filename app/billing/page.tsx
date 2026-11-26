import Link from "next/link";
import { CircleAlert, Coins, CreditCard } from "lucide-react";
import { beginCheckout, manageSubscription } from "@/app/actions/billing";
import { Empty, Notice, PageTitle, Tag } from "@/components/ui";
import { stripePrice } from "@/lib/billing";
import { liveIntegrationsEnabled, sandboxEnabled } from "@/lib/env";
import { dollars, shortDate, type Query } from "@/lib/format";
import { db } from "@/lib/supabase";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Tokens and Membership" };

export default async function Billing({ searchParams }: { searchParams: Promise<Query> }) {
  const [client, viewer, query] = await Promise.all([db(), getViewer(), searchParams]);
  const trade = viewer?.profile?.role === "tradesperson" && viewer.profile.status === "active";
  const [products, history, memberPlans, balance] = await Promise.all([
    client.from("billing_products").select("*").eq("active", true).order("price_cents"),
    trade ? client.from("token_ledger").select("*").eq("user_id", viewer.user.id).order("created_at", { ascending: false }).limit(35) : null,
    trade ? client.from("subscriptions").select("*").eq("buyer_id", viewer.user.id).order("created_at", { ascending: false }).limit(4) : null,
    trade ? client.rpc("token_balance") : null,
  ]);
  const sandbox = sandboxEnabled();
  const stripeConfigured = liveIntegrationsEnabled() && Boolean(process.env.STRIPE_SECRET_KEY);
  const plans = (products.data ?? []).map((item) => ({ ...item, purchasable: sandbox || (stripeConfigured && Boolean(stripePrice(item.slug))) }));
  const checkoutEnabled = plans.some((plan) => plan.purchasable);

  return <div className="market-surface"><div className="container page billing-page">
    <PageTitle title="Tokens and membership" description="Each job application uses one token."
      action={trade ? <Link className="button secondary" href="/jobs">Find jobs</Link>
        : !viewer && <Link className="button" href="/register?role=tradesperson">Create a trade account</Link>} />
    <Notice query={query} />
    <div className="member-section-stack">
      {trade && <section className="panel kpi billing-balance" aria-label="Token balance">
        <Coins size={24} aria-hidden="true" />
        <div><strong>{balance?.data ?? 0}</strong><span>Available tokens</span></div>
      </section>}
      <section className="member-section-stack" aria-labelledby="billing-options">
        <h2 id="billing-options">Top-ups and memberships</h2>
        {sandbox && <div className="notice success"><CreditCard size={18} aria-hidden="true" /><span>Local test checkout. Purchases use simulated payments.</span></div>}
        {!checkoutEnabled && !sandbox && <div className="notice billing-unavailable"><CircleAlert size={18} aria-hidden="true" /><span>Online checkout is currently unavailable.</span></div>}
        {plans.length ? <div className="plan-grid">
          {plans.map((item) => <article className="panel plan-card" key={item.slug}>
            <div><Tag value={item.interval === "once" ? "One-time top-up" : "Monthly membership"} tone="neutral" /></div>
            <h3>{item.name}</h3>
            <p className="price">{dollars(item.price_cents)} <small>NZD{item.interval === "month" ? " / month" : ""}</small></p>
            <p>{item.credits} application tokens{item.interval === "month" ? " with each paid month" : ""}</p>
            {trade && item.purchasable && <form action={beginCheckout}>
              <input type="hidden" name="product" value={item.slug} />
              <button className="button">{item.interval === "once" ? "Buy tokens" : "Choose " + item.name}</button>
            </form>}
            {checkoutEnabled && !item.purchasable && <p className="field-note">Temporarily unavailable</p>}
          </article>)}
        </div> : <Empty title="No plans available" />}
      </section>
      {trade && <div className="billing-activity">
        <section className="panel stack"><h2>Memberships</h2>
          {memberPlans?.data?.length ? <ul className="member-activity-list">{memberPlans.data.map((plan) =>
            <li key={plan.id}><div className="member-activity-copy"><strong>{products.data?.find((item) => item.slug === plan.product_slug)?.name ?? plan.product_slug}</strong>
              {plan.renews_at && plan.status !== "cancelled" && <time dateTime={plan.renews_at}>Next renewal {shortDate(plan.renews_at)}</time>}</div>
              <div className="buttons"><Tag value={plan.status} />{!["cancelled", "cancelling"].includes(plan.status) && <form action={manageSubscription}>
                <input type="hidden" name="id" value={plan.id} /><button className="button secondary small">Cancel membership</button>
              </form>}</div></li>)}</ul> : <Empty title="No memberships yet" />}
        </section>
        <section className="panel stack"><h2>Token history</h2>
          {history?.data?.length ? <ul className="member-activity-list">{history.data.map((entry) => <li key={entry.id}>
            <div className="member-activity-copy"><strong>{entry.reason}</strong><time dateTime={entry.created_at}>{shortDate(entry.created_at)}</time></div>
            <strong className={entry.delta > 0 ? "token-change positive" : "token-change"}>{entry.delta > 0 ? "+" : ""}{entry.delta}</strong></li>)}</ul>
            : <Empty title="No transactions yet" />}
        </section>
      </div>}
    </div>
  </div></div>;
}
