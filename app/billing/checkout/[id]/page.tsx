import { notFound } from "next/navigation";
import { completeTestCheckout } from "@/app/actions/billing";
import { Back, Notice, PageTitle, Tag } from "@/components/ui";
import { sandboxEnabled } from "@/lib/env";
import { dollars, type Query } from "@/lib/format";
import { uuid } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export default async function TestCheckout({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const { user } = await member("tradesperson");
  const { id } = await params;
  if (!uuid.safeParse(id).success || !sandboxEnabled()) notFound();
  const client = await db();
  const { data } = await client.from("billing_orders").select("*,billing_products(name)")
    .eq("id", id).eq("buyer_id", user.id).eq("provider", "local").maybeSingle();
  if (!data) notFound();
  return <div className="container narrow page">
    <Back to="/billing">Tokens and membership</Back>
    <PageTitle title="Test checkout" description="Simulate a payment using your local test environment." />
    <Notice query={await searchParams} />
    <section className="panel stack">
      <h2>{data.billing_products.name}</h2>
      <p>{dollars(data.price_cents)} NZD · {data.credits} tokens</p>
      <div><Tag value={data.status} /></div>
      {["pending", "failed"].includes(data.status) &&
        <form action={completeTestCheckout} className="buttons">
          <input type="hidden" name="id" value={id} />
          <button className="button" name="outcome" value="paid">Confirm test payment</button>
          <button className="button secondary" name="outcome" value="failed">Simulate failed payment</button>
        </form>}
    </section>
  </div>;
}
