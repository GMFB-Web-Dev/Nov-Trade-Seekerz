import { notFound } from "next/navigation";
import { completeTestCheckout } from "@/app/actions/billing";
import { Back, Notice, PageTitle, Tag } from "@/components/ui";
import { sandboxEnabled } from "@/lib/env";
import { dollars, type Query } from "@/lib/format";
import { uuid } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export default async function TestCheckout({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const [{ user }, { id }, query] = await Promise.all([member("tradesperson"), params, searchParams]);
  if (!uuid.safeParse(id).success || !sandboxEnabled()) notFound();
  const client = await db();
  const { data } = await client.from("billing_orders").select("*,billing_products(name)")
    .eq("id", id).eq("buyer_id", user.id).eq("provider", "local").maybeSingle();
  if (!data) notFound();

  return <div className="market-surface"><div className="container narrow page">
    <Back to="/billing">Tokens and membership</Back>
    <PageTitle title="Test checkout" description="Simulate a payment using your local test environment." />
    <Notice query={query} />
    <section className="panel stack">
      <div className="section-head"><h2>Order summary</h2><Tag value={data.status} /></div>
      <dl className="checkout-summary">
        <div><dt>Product</dt><dd>{data.billing_products.name}</dd></div>
        <div><dt>Tokens</dt><dd>{data.credits}</dd></div>
        <div><dt>Total</dt><dd>{dollars(data.price_cents)} NZD</dd></div>
      </dl>
      {["pending", "failed"].includes(data.status) &&
        <form action={completeTestCheckout} className="buttons member-section-form">
          <input type="hidden" name="id" value={id} />
          <button className="button" name="outcome" value="paid">Confirm test payment</button>
          <button className="button secondary" name="outcome" value="failed">Simulate failed payment</button>
        </form>}
    </section>
  </div></div>;
}
