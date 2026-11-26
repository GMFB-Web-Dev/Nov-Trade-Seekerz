import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { ProjectCard } from "@/components/project-card";
import { Empty, Notice, PageTitle, Pagination } from "@/components/ui";
import { param, type Query } from "@/lib/format";
import { loadCategories, projectImage } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export const metadata = { title: "Find Jobs" };
const pageSize = 12;
const sorting = [
  { value: "newest", label: "Newest first" },
  { value: "budget", label: "Highest budget" },
] as const;

function jobsHref(params: Record<string, string>) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  return search ? "/jobs?" + search : "/jobs";
}

export default async function Jobs({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const q = param(query.q).replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 70);
  const area = param(query.area).replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 50);
  const trade = param(query.trade).replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const minimum = Math.min(10000000, Math.max(0, Math.floor(Number(param(query.minimum)) || 0)));
  const sort = param(query.sort) === "budget" ? "budget" : "newest";
  const page = Math.max(1, Math.min(200, Math.floor(Number(param(query.page)) || 1)));
  const search = { q, area, minimum: minimum ? String(minimum) : "", sort: sort === "budget" ? sort : "" };
  const pageParam = page > 1 ? String(page) : "";
  const { user } = await member("tradesperson", jobsHref({ ...search, trade, page: pageParam }));
  const [client, categories] = await Promise.all([db(), loadCategories()]);
  const selected = categories.some(({ slug }) => slug === trade) ? trade : "";
  const filters = Object.fromEntries(Object.entries({ ...search, trade: selected }).filter(([, value]) => value));
  const returnTo = jobsHref({ ...filters, page: pageParam });
  let request = client.from("projects").select("*", { count: "exact" }).eq("status", "open");
  if (q) request = request.or("title.ilike.%" + q + "%,description.ilike.%" + q + "%");
  if (area) request = request.or("suburb.ilike.%" + area + "%,postcode.ilike.%" + area + "%");
  if (selected) request = request.eq("category_slug", selected);
  if (minimum) request = request.gte("budget_max", minimum);
  if (sort === "budget") request = request.order("budget_max", { ascending: false });
  const result = await request.order("created_at", { ascending: false }).order("id").range((page - 1) * pageSize, page * pageSize - 1);
  if (page > 1 && (result.error?.code === "PGRST103" || result.data?.length === 0)) redirect(jobsHref(filters));
  if (result.error) throw new Error("Could not load jobs.");
  const projects = result.data;
  const [photos, applications] = await Promise.all([
    Promise.all(projects.map(projectImage)),
    projects.length ? client.from("applications").select("project_id,status").eq("tradesperson_id", user.id)
      .in("project_id", projects.map(({ id }) => id)) : null,
  ]);
  const applied = new Map(applications?.data?.map(({ project_id, status }) => [project_id, status]));
  const count = result.count ?? 0;
  const hasFilters = Boolean(q || area || selected || minimum);

  return <div className="market-surface"><div className="container page">
    <PageTitle title="Find jobs" />
    <Notice query={query} />
    <form action="/jobs" method="get" className="panel job-search" role="search" aria-label="Search jobs">
      {sort === "budget" && <input type="hidden" name="sort" value={sort} />}
      <div className="job-search-fields">
        <label>Keyword<input name="q" type="search" placeholder="e.g. Fence repair" defaultValue={q} maxLength={70} /></label>
        <label>Location<input name="area" placeholder="Suburb or postcode" defaultValue={area} maxLength={50} /></label>
        <button className="button" type="submit" name="trade" value={selected}><Search size={17} aria-hidden /> Search jobs</button>
      </div>
      <fieldset className="job-search-categories">
        <legend>Trade category</legend>
        <div className="job-search-pills">
          {[{ slug: "", name: "All trades" }, ...categories].map(({ slug, name }) => <button
            type="submit" name="trade" value={slug} key={slug} aria-pressed={slug === selected}>
            {slug === selected && <Check size={14} aria-hidden />}{name}
          </button>)}
        </div>
      </fieldset>
      <div className="job-search-options">
        <details open={minimum > 0}>
          <summary><SlidersHorizontal size={16} aria-hidden /> Budget filter <ChevronDown size={15} aria-hidden /></summary>
          <div>
            <label>Minimum budget (NZD)<input type="number" name="minimum" min={0} max={10000000} defaultValue={minimum || ""} /></label>
            <button className="button secondary" type="submit" name="trade" value={selected}>Apply filter</button>
          </div>
        </details>
        {hasFilters && projects.length > 0 && <Link className="inline-link" href="/jobs">Clear filters</Link>}
      </div>
    </form>
    <section aria-labelledby="job-results-heading">
      <div className="workspace-bar">
        <h2 id="job-results-heading">{count} {count === 1 ? "open job" : "open jobs"}</h2>
        {count > 0 && <nav className="job-search-sort" aria-label="Sort jobs">
          {sorting.map(({ value, label }) => <Link key={value} href={jobsHref({ ...filters, sort: value === "budget" ? value : "" })}
            aria-current={sort === value ? "true" : undefined}>{label}</Link>)}
        </nav>}
      </div>
      {projects.length ? <div className="project-list">{projects.map((project, index) =>
        <ProjectCard key={project.id} project={project} photo={photos[index]} applicationStatus={applied.get(project.id)}
          href={"/projects/" + project.id + "?" + new URLSearchParams({ from: returnTo })} />)}</div>
        : <Empty title={hasFilters ? "No matching jobs" : "No open jobs"}
          action={hasFilters && <Link className="button secondary" href="/jobs">Clear filters</Link>}>
          {hasFilters ? "Try a different trade, location, or keyword." : "Check back for new listings."}
        </Empty>}
      <Pagination page={page} total={count} size={pageSize} path="/jobs" params={filters} />
    </section>
  </div></div>;
}
