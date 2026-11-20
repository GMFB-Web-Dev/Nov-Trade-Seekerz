import Link from "next/link";
import { ArrowRight, MapPin, Search, Star } from "lucide-react";
import { Cover } from "@/components/marketing";
import { Empty, Pagination, Tag } from "@/components/ui";
import { tradeLabel } from "@/lib/catalog";
import { param, type Query } from "@/lib/format";
import { loadCategories } from "@/lib/projects";
import { db } from "@/lib/supabase";

export const metadata = { title: "Find a Trade" };
const size = 12;

export default async function TradesDirectory({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const q = param(query.q).replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 70).trim();
  const postcode = param(query.postcode).replace(/\D/g, "").slice(0, 4);
  const requested = param(query.trade);
  const page = Math.max(1, Math.min(200, Math.floor(Number(param(query.page)) || 1)));
  const client = await db();
  const categories = await loadCategories();
  const exactMatch = categories.find((category) => category.name.toLowerCase() === q.toLowerCase());
  const trade = categories.some((category) => category.slug === requested) ? requested : exactMatch?.slug || "";
  let request = client.from("profiles").select("id,display_name,business_name,category_slug,bio,postcode", { count: "exact" })
    .eq("role", "tradesperson").eq("status", "active").not("onboarded_at", "is", null);
  if (q && !exactMatch) request = request.or("business_name.ilike.%" + q + "%,display_name.ilike.%" + q + "%,bio.ilike.%" + q + "%");
  if (trade) request = request.eq("category_slug", trade);
  if (postcode) request = request.like("postcode", postcode + "%");
  const result = await request.order("business_name").range((page - 1) * size, page * size - 1);
  if (result.error) throw new Error("Could not load the directory.");
  const ids = result.data.map((profile) => profile.id);
  const reviews = ids.length ? await client.from("reviews").select("rating,tradesperson_id").in("tradesperson_id", ids).eq("visible", true) : null;
  const nameOf = (slug: string) => categories.find((item) => item.slug === slug)?.name ?? tradeLabel(slug);
  return <>
    <Cover title="Find by Trade" image="/images/hero.webp"><p>Search for tradespeople by skill, business name, or postcode.</p></Cover>
    <div className="container page">
      <form action="/trades" className="directory-search">
        <label>Search<input name="q" type="search" defaultValue={q} placeholder="Trade or business name" maxLength={70} /></label>
        <label>Trade<select name="trade" defaultValue={trade}><option value="">All trades</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
        <label>Postcode<input name="postcode" inputMode="numeric" maxLength={4} defaultValue={postcode} placeholder="e.g. 1025" /></label>
        <button className="button"><Search size={17} /> Search</button>
      </form>
      <p className="list-head"><strong>{result.count ?? 0} tradespeople</strong><Link href="/trades">Clear filters</Link></p>
      <section className="project-list" aria-label="Tradespeople">
        {result.data.map((profile) => {
          const name = profile.business_name || profile.display_name;
          const feedback = reviews?.data?.filter((review) => review.tradesperson_id === profile.id) ?? [];
          const rating = feedback.length ? (feedback.reduce((sum, review) => sum + review.rating, 0) / feedback.length).toFixed(1) : null;
          return <article className="panel trade-card" key={profile.id}>
            <div className="trade-avatar" aria-hidden="true">{name.match(/\b\w/g)?.slice(0, 2).join("").toUpperCase() || "TS"}</div>
            <div>
              <h2><Link href={"/trades/" + profile.id}>{name}</Link></h2>
              <div className="chips">{profile.category_slug && <Tag value={nameOf(profile.category_slug)} />}
                {!!profile.postcode && <span className="location"><MapPin size={14} /> {profile.postcode}</span>}
                {rating && <span className="rating"><Star size={14} />{rating} ({feedback.length})</span>}</div>
              {profile.bio && <p className="clamp">{profile.bio}</p>}
            </div>
            <Link className="button secondary small" href={"/trades/" + profile.id}>View profile <ArrowRight size={15} /></Link>
          </article>;
        })}
        {!result.data.length && <Empty title="No tradespeople found">Try removing a filter or searching a nearby postcode.</Empty>}
      </section>
      <Pagination page={page} total={result.count ?? 0} size={size} path="/trades" params={{ q, trade, postcode }} />
      {!trade && <div className="chips category-shortcuts" aria-label="Browse trade categories">
        {categories.map((item) => <Link key={item.slug} href={"/trades?trade=" + item.slug} className="tag">{item.name}</Link>)}
      </div>}
    </div>
  </>;
}
