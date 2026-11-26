import Link from "next/link";
import { manageCategory, moderateProject, moderateReview } from "@/app/actions/admin";
import { Tag, TaskForm } from "@/components/ui";
import type { AdminFilter } from "@/lib/admin";
import { dollars, shortDate } from "@/lib/format";
import { db } from "@/lib/supabase";
import { AdminTable, FilterBar, readAdminPage } from "./table";

export async function Projects({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const states = ["open", "awarded", "completed", "cancelled"] as const;
  const selected = states.find((state) => state === filter.state);
  let request = client.from("projects").select("*,profiles!projects_homeowner_id_fkey(display_name)", { count: "exact" });
  if (filter.q) request = request.ilike("title", "%" + filter.q + "%");
  if (selected) request = request.eq("status", selected);
  const { data, count } = await readAdminPage(request.order("created_at", { ascending: false }), filter, "Could not load jobs.");
  return <>
    <FilterBar path="/admin/projects" filter={filter} search="Job title" states={[...states]} />
    <AdminTable total={count} path="/admin/projects" filter={filter} rows={data.map((job) => ({
      id: job.id,
      cells: {
        Job: <><Link className="inline-link" href={"/projects/" + job.id}>{job.title}</Link><small>{job.suburb} · {shortDate(job.created_at)}</small></>,
        Owner: job.profiles?.display_name || "Homeowner",
        Status: <Tag value={job.status} />,
        Actions: <TaskForm action={moderateProject} id={job.id} className="stack">
          {job.photo_path && <button name="operation" value="clear_photo" className="button secondary small">Remove photo</button>}
          {["open", "awarded"].includes(job.status) && <details><summary>Cancel job</summary>
            <button name="operation" value="cancel" className="button danger small">Confirm cancellation</button>
          </details>}
        </TaskForm>,
      },
    }))} />
  </>;
}

export async function Applications({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const states = ["pending","awarded","declined","withdrawn","completed"] as const;
  const selected = states.find((state) => state === filter.state);
  let request = client.from("applications").select(
    "*,projects!inner(title),profiles!applications_tradesperson_id_fkey(display_name,business_name),quotes(amount_cents)", { count: "exact" });
  if (filter.q) request = request.ilike("projects.title", "%" + filter.q + "%");
  if (selected) request = request.eq("status", selected);
  const { data, count } = await readAdminPage(request.order("created_at", { ascending: false }), filter, "Could not load applications.");
  return <>
    <FilterBar path="/admin/applications" filter={filter} search="Job title" states={[...states]} />
    <AdminTable total={count} path="/admin/applications" filter={filter} rows={data.map((entry) => ({
      id: entry.id,
      cells: {
        Job: <Link className="inline-link" href={"/projects/" + entry.project_id}>{entry.projects.title}</Link>,
        Applicant: <><strong>{entry.profiles?.business_name || entry.profiles?.display_name || "Tradesperson"}</strong>
          <details><summary>Introduction</summary><p className="detail-copy">{entry.introduction}</p></details></>,
        Status: <Tag value={entry.status} />,
        Quote: entry.quotes ? dollars(entry.quotes.amount_cents) : "—",
        Submitted: shortDate(entry.created_at),
      },
    }))} />
  </>;
}

export async function Quotes({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const query = client.from("quotes").select("*,applications(project_id,status,projects(title))", { count: "exact" })
    .order("updated_at", { ascending: false });
  const { data, count } = await readAdminPage(query, filter, "Could not load quotes.");
  return <AdminTable total={count} path="/admin/quotes" filter={filter} rows={data.map((quote) => ({
    id: quote.application_id,
    cells: {
      Job: <Link className="inline-link" href={"/projects/" + quote.applications.project_id}>{quote.applications.projects.title}</Link>,
      "Quote and scope": <><strong>{dollars(quote.amount_cents)} NZD</strong><p className="detail-copy">{quote.description}</p></>,
      Application: <Tag value={quote.applications.status} />,
      Updated: shortDate(quote.updated_at),
    },
  }))} />;
}

export async function Categories() {
  const client = await db();
  const { data, error } = await client.from("categories").select("*").order("sort_order").order("name");
  if (error) throw new Error("Could not load categories.");
  return <div className="stack">
    <form action={manageCategory} className="panel stack">
      <h2>Add a category</h2><div className="form-row">
        <label>Slug<input name="slug" placeholder="e.g. masonry" required pattern="[a-z0-9\-]{2,60}" title="Use 2–60 lowercase letters, numbers, or hyphens." /></label>
        <label>Display name<input name="name" required minLength={2} maxLength={60} /></label>
      </div><input type="hidden" name="active" value="true" /><button className="button small">Add category</button>
    </form>
    <section className="panel stack">
      <h2>Existing categories</h2>
      {data.map((category) => <form action={manageCategory} className="category-admin-form" key={category.slug}>
        <input type="hidden" name="slug" value={category.slug} />
        <label>{category.slug}<input name="name" defaultValue={category.name} minLength={2} maxLength={60} required /></label>
        <label>Visibility<select name="active" defaultValue={String(category.active)}><option value="true">Active</option><option value="false">Hidden</option></select></label>
        <button className="button secondary small">Save</button>
      </form>)}
    </section>
  </div>;
}

export async function Reviews({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const query = client.from("reviews").select("*,profiles!reviews_tradesperson_id_fkey(display_name,business_name)", { count: "exact" })
    .order("created_at", { ascending: false });
  const { data, count } = await readAdminPage(query, filter, "Could not load reviews.");
  return <AdminTable total={count} path="/admin/reviews" filter={filter} rows={data.map((review) => ({
    id: review.id,
    cells: {
      Tradesperson: <Link className="inline-link" href={"/trades/" + review.tradesperson_id}>{review.profiles?.business_name || review.profiles?.display_name || "Profile"}</Link>,
      Review: <><strong>{review.rating} / 5</strong><p className="detail-copy">{review.body}</p></>,
      Status: <><Tag value={review.visible ? "Published" : "Hidden"} /><small>{shortDate(review.created_at)}</small></>,
      Actions: <TaskForm action={moderateReview} id={review.id}>
        <button className="button secondary small" name="visible" value={String(!review.visible)}>{review.visible ? "Hide review" : "Publish review"}</button>
      </TaskForm>,
    },
  }))} />;
}
