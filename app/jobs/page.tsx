import Link from "next/link";
import { Filter, Search } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { Empty, PageTitle, Pagination } from "@/components/ui";
import { param, type Query } from "@/lib/format";
import { loadCategories, projectImage } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export const metadata = { title: "Get Jobs" };
const pageSize = 12;

export default async function Jobs({ searchParams }: { searchParams: Promise<Query> }) {
  await member("tradesperson");
  const query = await searchParams;
  const q = param(query.q).replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 70);
  const area = param(query.area).replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 50);
  const trade = param(query.trade);
  const minimum = Math.min(10000000, Math.max(0, Number(param(query.minimum)) || 0));
  const sort = param(query.sort) === "budget" ? "budget" : "newest";
  const page = Math.max(1, Math.min(200, Math.floor(Number(param(query.page)) || 1)));
  const client = await db();
  const categories = await loadCategories();
  const selected = categories.some(({ slug }) => slug === trade) ? trade : "";
  let request = client.from("projects").select("*", { count: "exact" }).eq("status", "open");
  if (q) request = request.or("title.ilike.%" + q + "%,description.ilike.%" + q + "%");
  if (area) request = request.or("suburb.ilike.%" + area + "%,postcode.ilike.%" + area + "%");
  if (selected) request = request.eq("category_slug", selected);
  if (minimum) request = request.gte("budget_max", minimum);
  if (sort === "budget") request = request.order("budget_max", { ascending: false });
  const result = await request.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (result.error) throw new Error("Could not load jobs.");
  const photos = await Promise.all(result.data.map(projectImage));

  return <div className="market-surface"><div className="container page">
    <PageTitle title="Get jobs" description="Find open jobs that match your trade and service area." />
    <div className="job-layout">
      <form action="/jobs" className="panel stack filter-panel sticky">
        <h2 className="section-head"><span>Filters</span><Filter size={17} /></h2>
        <label>Keyword<input name="q" type="search" placeholder="e.g. fencing" defaultValue={q} maxLength={70}/></label>
        <label>Location<input name="area" placeholder="Suburb or postcode" defaultValue={area} maxLength={50}/></label>
        <label>Trade type<select name="trade" defaultValue={selected}><option value="">All categories</option>
          {categories.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label>
        <label>Minimum budget (NZD)<input type="number" name="minimum" min={0} max={10000000} defaultValue={minimum || ""} /></label>
        <label>Sort<select name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="budget">Highest budget</option></select></label>
        <div className="buttons"><button className="button"><Search size={16} /> Search jobs</button><Link className="button secondary" href="/jobs">Clear filters</Link></div>
      </form>
      <section>
        <div className="list-head"><strong>{result.count ?? 0} open jobs</strong><span>{sort === "budget" ? "Highest budget first" : "Newest first"}</span></div>
        {result.data.length ? <div className="project-list">{result.data.map((project, index) =>
          <ProjectCard key={project.id} project={project} photo={photos[index]} />)}</div>
          : <Empty title="No matching jobs">Try a different category, location or search term.</Empty>}
        <Pagination page={page} total={result.count ?? 0} size={pageSize} path="/jobs" params={{ q, area, trade: selected, minimum: String(minimum), sort }} />
      </section>
    </div>
  </div></div>;
}
