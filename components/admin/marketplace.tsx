import Link from "next/link";
import { manageCategory, moderateProject, moderateReview } from "@/app/actions/admin";
import { Tag, TaskForm } from "@/components/ui";
import type { AdminFilter } from "@/lib/admin";
import { dollars, shortDate } from "@/lib/format";
import { db } from "@/lib/supabase";
import { AdminTable, FilterBar } from "./table";

export async function Projects({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const states = ["open", "awarded", "completed", "cancelled"] as const;
  const selected = states.find((state) => state === filter.state);
  let request = client.from("projects").select("*,profiles!projects_homeowner_id_fkey(display_name)", { count: "exact" });
  if (filter.q) request = request.ilike("title", "%" + filter.q + "%");
  if (selected) request = request.eq("status", selected);
  const { data, count, error } = await request.order("created_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load jobs.");
  return <>
    <FilterBar path="/admin/projects" filter={filter} search="Job title" states={[...states]} />
    <AdminTable columns={["Job", "Owner", "Status", "Actions"]} total={count} path="/admin/projects" filter={filter}>
      {data.map((job) => <tr key={job.id}>
        <td><Link className="inline-link" href={"/projects/" + job.id}>{job.title}</Link><small>{job.suburb} · {shortDate(job.created_at)}</small></td>
        <td>{job.profiles?.display_name || "Homeowner"}</td><td><Tag value={job.status} /></td>
        <td><TaskForm action={moderateProject} id={job.id} className="buttons">
          {job.photo_path && <button name="operation" value="clear_photo" className="button secondary small">Remove photo</button>}
          {["open","awarded"].includes(job.status) && <details><summary>Cancel job</summary>
            <button name="operation" value="cancel" className="button danger small">Confirm cancellation</button>
          </details>}
        </TaskForm></td>
      </tr>)}
    </AdminTable>
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
  const { data, count, error } = await request.order("created_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load applications.");
  return <>
    <FilterBar path="/admin/applications" filter={filter} search="Job title" states={[...states]} />
    <AdminTable columns={["Job", "Applicant", "Status", "Quote", "Submitted"]} total={count} path="/admin/applications" filter={filter}>
      {data.map((entry) => <tr key={entry.id}>
        <td><Link className="inline-link" href={"/projects/" + entry.project_id}>{entry.projects.title}</Link></td>
        <td><strong>{entry.profiles?.business_name || entry.profiles?.display_name || "Tradesperson"}</strong>
          <details><summary>Introduction</summary><p className="detail-copy">{entry.introduction}</p></details></td>
        <td><Tag value={entry.status} /></td><td>{entry.quotes ? dollars(entry.quotes.amount_cents) : "—"}</td><td>{shortDate(entry.created_at)}</td>
      </tr>)}
    </AdminTable>
  </>;
}

export async function Quotes({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const { data, count, error } = await client.from("quotes").select("*,applications(project_id,status,projects(title))", { count: "exact" })
    .order("updated_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load quotes.");
  return <AdminTable columns={["Job", "Quote and scope", "Application", "Updated"]} total={count} path="/admin/quotes" filter={filter}>
    {data.map((quote) => <tr key={quote.application_id}>
      <td><Link className="inline-link" href={"/projects/" + quote.applications.project_id}>{quote.applications.projects.title}</Link></td>
      <td><strong>{dollars(quote.amount_cents)} NZD</strong><p className="detail-copy">{quote.description}</p></td>
      <td><Tag value={quote.applications.status} /></td><td>{shortDate(quote.updated_at)}</td>
    </tr>)}
  </AdminTable>;
}

export async function Categories() {
  const client = await db();
  const { data, error } = await client.from("categories").select("*").order("sort_order").order("name");
  if (error) throw new Error("Could not load categories.");
  return <div className="stack">
    <form action={manageCategory} className="panel stack">
      <h2>Add a category</h2><div className="form-row">
        <label>Slug<input name="slug" placeholder="e.g. masonry" required pattern="[a-z0-9-]{2,60}" /></label>
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
  const { data, count, error } = await client.from("reviews").select("*,profiles!reviews_tradesperson_id_fkey(display_name,business_name)", { count: "exact" })
    .order("created_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load reviews.");
  return <AdminTable columns={["Tradesperson", "Review", "Status", "Actions"]} total={count} path="/admin/reviews" filter={filter}>
    {data.map((review) => <tr key={review.id}>
      <td><Link className="inline-link" href={"/trades/" + review.tradesperson_id}>{review.profiles?.business_name || review.profiles?.display_name || "Profile"}</Link></td>
      <td><strong>{review.rating} / 5</strong><p className="detail-copy">{review.body}</p></td>
      <td><Tag value={review.visible ? "Published" : "Hidden"} /><small>{shortDate(review.created_at)}</small></td>
      <td><TaskForm action={moderateReview} id={review.id}><button className="button secondary small" name="visible" value={String(!review.visible)}>{review.visible ? "Hide review" : "Publish review"}</button></TaskForm></td>
    </tr>)}
  </AdminTable>;
}
