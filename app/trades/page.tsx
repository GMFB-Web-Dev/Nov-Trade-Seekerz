import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, MapPin, Search, Star } from "lucide-react";
import { Empty, PageTitle, Pagination, Tag } from "@/components/ui";
import { param, type Query } from "@/lib/format";
import { loadCategories } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { directoryPath, tradeInitials } from "./directory-path";

export const metadata = { title: "Find a tradie" };
const size = 12;

export default async function TradesDirectory({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const keyword = param(query.q).replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 70).trim();
  const postcode = param(query.postcode).replace(/\D/g, "").slice(0, 4);
  const requested = param(query.trade);
  const page = Math.max(1, Math.min(200, Math.floor(Number(param(query.page)) || 1)));
  const [client, categories] = await Promise.all([db(), loadCategories()]);
  const categoryNames = new Map(categories.map(({ slug, name }) => [slug, name]));
  const selected = categoryNames.has(requested) ? requested : "";
  const exactMatch = categories.find((category) => category.name.toLowerCase() === keyword.toLowerCase());
  const trade = selected || exactMatch?.slug || "";
  const q = exactMatch?.slug === trade ? "" : keyword;
  const filters = { q, trade, postcode };

  let request = client.from("profiles")
    .select("id,display_name,business_name,bio,postcode,profile_trade_categories(category_slug),trade_match:profile_trade_categories()", { count: "exact" })
    .eq("role", "tradesperson").eq("status", "active").not("onboarded_at", "is", null);
  if (q) request = request.or("business_name.ilike.%" + q + "%,display_name.ilike.%" + q + "%,bio.ilike.%" + q + "%");
  if (trade) request = request.eq("trade_match.category_slug", trade).not("trade_match", "is", null);
  if (postcode) request = request.like("postcode", postcode + "%");
  const result = await request.order("business_name").order("id").range((page - 1) * size, page * size - 1);
  if (page > 1 && (result.error?.code === "PGRST103" || result.data?.length === 0)) redirect(directoryPath(filters));
  if (result.error) throw new Error("Could not load the directory.");

  const ids = result.data.map((profile) => profile.id);
  const reviews = ids.length ? await client.from("reviews").select("rating,tradesperson_id").in("tradesperson_id", ids).eq("visible", true) : null;
  const ratings = new Map<string, { total: number; count: number }>();
  for (const review of reviews?.data ?? []) {
    const feedback = ratings.get(review.tradesperson_id) ?? { total: 0, count: 0 };
    feedback.total += review.rating;
    feedback.count += 1;
    ratings.set(review.tradesperson_id, feedback);
  }

  const count = result.count ?? 0;
  const hasFilters = Boolean(q || trade || postcode);
  const from = directoryPath({ ...filters, page: page > 1 ? String(page) : "" });
  return <div className="market-surface"><div className="container page directory-page">
    <PageTitle title="Find a tradie" />
    <form action="/trades" method="get" className="panel directory-search" role="search" aria-label="Search for tradespeople">
      <label>Keyword<input name="q" type="search" defaultValue={q} placeholder="Trade or business name" maxLength={70} /></label>
      <label>Postcode<input name="postcode" inputMode="numeric" maxLength={4} defaultValue={postcode} placeholder="e.g. 1025" /></label>
      <label>Trade category<select name="trade" defaultValue={trade}><option value="">All trades</option>
        {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
      </select></label>
      <button className="button"><Search size={17} aria-hidden="true" /> Search</button>
    </form>
    <section aria-labelledby="directory-results-heading">
      <div className="section-head member-results-heading">
        <h2 id="directory-results-heading">{count} {count === 1 ? "tradesperson" : "tradespeople"}</h2>
        {hasFilters && <Link className="inline-link" href="/trades">Clear filters</Link>}
      </div>
      {result.data.length ? <div className="directory-results">
        {result.data.map((profile) => {
          const name = profile.business_name || profile.display_name;
          const feedback = ratings.get(profile.id);
          const chosen = new Set(profile.profile_trade_categories.map(({ category_slug }) => category_slug));
          const profileCategories = categories.filter(({ slug }) => chosen.has(slug));
          const href = "/trades/" + profile.id + (from === "/trades" ? "" : "?" + new URLSearchParams({ from }));
          return <article className="directory-result" key={profile.id}>
            <Link className="panel directory-card" href={href} aria-label={"View " + name}>
              <div className="directory-card-heading">
                <span className="trade-avatar" aria-hidden="true">{tradeInitials(name)}</span>
                <div><h3>{name}</h3>
                  {profileCategories.length > 0 && <div className="chips">
                    {profileCategories.map(({ slug, name }) => <Tag key={slug} value={name} />)}
                  </div>}
                </div>
                <ArrowRight size={17} aria-hidden="true" />
              </div>
              {profile.bio && <p className="clamp">{profile.bio}</p>}
              <div className="chips">
                {!!profile.postcode && <span className="location"><MapPin size={15} aria-hidden="true" /> {profile.postcode}</span>}
                {feedback && <span className="rating">
                  <Star size={15} aria-hidden="true" />
                  {(feedback.total / feedback.count).toFixed(1)} ({feedback.count} {feedback.count === 1 ? "review" : "reviews"})
                </span>}
              </div>
            </Link>
          </article>;
        })}
      </div> : <Empty title={hasFilters ? "No matching tradespeople" : "No tradespeople listed yet"}>
        {hasFilters ? "Try another postcode, keyword or trade category." : "Check back when more businesses have joined."}
      </Empty>}
    </section>
    <Pagination page={page} total={count} size={size} path="/trades" params={filters} />
  </div></div>;
}
