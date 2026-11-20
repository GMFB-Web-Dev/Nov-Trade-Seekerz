import Link from "next/link";
import { Bell, BriefcaseBusiness, CircleCheck, ClipboardList, Coins, FolderOpen, LayoutGrid, MessageSquareText, Plus, Wallet } from "lucide-react";
import { markNotificationsRead } from "@/app/actions/market";
import { ProjectCard } from "@/components/project-card";
import { Empty, Notice, PageTitle, Pagination, Tag } from "@/components/ui";
import { param, shortDate, type Query } from "@/lib/format";
import { projectImage } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export const metadata = { title: "Dashboard" };
const size = 10;

export default async function Dashboard({ searchParams }: { searchParams: Promise<Query> }) {
  const { user, profile } = await member();
  const isTrade = profile.role === "tradesperson";
  const query = await searchParams;
  const group = param(query.status);
  const page = Math.max(1, Math.min(200, Math.floor(Number(param(query.page)) || 1)));
  const range = [(page - 1) * size, page * size - 1] as const;
  const client = await db();
  let listings = client.from("projects").select("*", { count: "exact" }).eq("homeowner_id", user.id);
  let applications = client.from("applications").select("*,projects!inner(*)", { count: "exact" }).eq("tradesperson_id", user.id);
  if (group === "open") {
    listings = listings.eq("status", "open");
    applications = applications.eq("status", "pending");
  } else if (group === "awarded") {
    listings = listings.eq("status", "awarded");
    applications = applications.eq("status", "awarded").eq("projects.status", "awarded");
  } else if (group === "history") {
    listings = listings.in("status", ["completed", "cancelled"]);
    applications = applications.in("status", ["declined", "withdrawn", "completed"]);
  }
  const countOpen = isTrade
    ? client.from("applications").select("id", { count: "exact", head: true }).eq("tradesperson_id", user.id).eq("status", "pending")
    : client.from("projects").select("id", { count: "exact", head: true }).eq("homeowner_id", user.id).eq("status", "open");
  const countAwarded = isTrade
    ? client.from("applications").select("id", { count: "exact", head: true }).eq("tradesperson_id", user.id).eq("status", "awarded")
    : client.from("projects").select("id", { count: "exact", head: true }).eq("homeowner_id", user.id).eq("status", "awarded");
  const [own, applied, balance, notifications, totalOpen, totalAwarded] = await Promise.all([
    isTrade ? null : listings.order("created_at", { ascending: false }).range(...range),
    isTrade ? applications.order("created_at", { ascending: false }).range(...range) : null,
    isTrade ? client.rpc("token_balance") : null,
    client.from("notifications").select("*").is("read_at", null).order("created_at", { ascending: false }).limit(8),
    countOpen, countAwarded,
  ]);
  const photos = await Promise.all((own?.data ?? []).map(projectImage));
  const filters = [
    { value: "", name: isTrade ? "All applications" : "All jobs", Icon: LayoutGrid },
    { value: "open", name: isTrade ? "Pending applications" : "Open jobs", Icon: ClipboardList },
    { value: "awarded", name: "Awarded jobs", Icon: CircleCheck },
    { value: "history", name: "History", Icon: FolderOpen },
  ];
  return <div className="market-surface"><div className="container page">
    <PageTitle title={"Welcome, " + profile.display_name.split(" ")[0]} description={isTrade ? "Manage applications, quotes and tokens." : "Manage your listings, applicants and quotes."}
      action={<Link className="button" href={isTrade ? "/jobs" : "/projects/new"}>{isTrade ? <BriefcaseBusiness size={17} /> : <Plus size={18} />}{isTrade ? "Browse jobs" : "Post a job"}</Link>} />
    <Notice query={query} />
    <div className="kpis">
      <div className="kpi"><FolderOpen size={18} /><strong>{totalOpen.count ?? 0}</strong><span>{isTrade ? "Pending applications" : "Open jobs"}</span></div>
      <div className="kpi"><CircleCheck size={18} /><strong>{totalAwarded.count ?? 0}</strong><span>Awarded jobs</span></div>
      <div className="kpi">{isTrade ? <Coins size={18} /> : <Bell size={18} />}<strong>{isTrade ? balance?.data ?? 0 : notifications.data?.length ?? 0}</strong><span>{isTrade ? "Available tokens" : "Recent unread alerts"}</span></div>
    </div>
    <div className="dashboard-layout">
      <aside className="sticky">
        <nav className="panel side-links" aria-label="Dashboard sections">
          {filters.map(({ value, name, Icon }) => <Link key={name} href={value ? "/dashboard?status=" + value : "/dashboard"} aria-current={group === value ? "page" : undefined}><Icon size={16} />{name}</Link>)}
          <Link href="/messages"><MessageSquareText size={16} />Messages</Link>
          {isTrade && <Link href="/billing"><Wallet size={16} />Tokens and membership</Link>}
        </nav>
        {!!notifications.data?.length && <section className="panel">
          <h3>Notifications</h3><ul className="notification-list">{notifications.data.map((note) =>
            <li className="unread" key={note.id}><Link href={"/projects/" + note.project_id}>{note.subject}<time>{shortDate(note.created_at)}</time></Link></li>)}</ul>
          <form action={markNotificationsRead}><button className="button secondary small">Mark all as read</button></form>
        </section>}
      </aside>
      <section>
        <div className="list-head"><strong>{filters.find((filter) => filter.value === group)?.name || (isTrade ? "Applications" : "Jobs")}</strong><span>{(own?.count ?? applied?.count) || 0} results</span></div>
        {isTrade ? (applied?.data?.length ? <div className="project-list">
          {applied.data.map((entry) => <article className="panel stack" key={entry.id}>
            <div className="section-head"><h3><Link href={"/projects/" + entry.project_id}>{entry.projects?.title || "Job unavailable"}</Link></h3><Tag value={entry.status} /></div>
            <p>{entry.projects?.suburb} · Applied {shortDate(entry.created_at)}</p>
            <Link className="inline-link" href={"/projects/" + entry.project_id}>View application</Link>
          </article>)}</div> : <Empty title="No applications here">Browse jobs and apply when you find one that fits.</Empty>)
          : (own?.data?.length ? <div className="project-list">{own.data.map((project, index) => <ProjectCard key={project.id} project={project} photo={photos[index]} />)}</div>
            : <Empty title="No jobs here">Post a job to receive applications and quotes.</Empty>)}
        <Pagination page={page} total={own?.count ?? applied?.count ?? 0} size={size} path="/dashboard" params={{ status: group }} />
      </section>
    </div>
  </div></div>;
}
