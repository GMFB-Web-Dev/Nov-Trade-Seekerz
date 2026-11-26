import Link from "next/link";
import { Bell, BriefcaseBusiness, CircleCheck, ClipboardList, Coins, FolderOpen, Plus } from "lucide-react";
import { markNotificationsRead } from "@/app/actions/market";
import { ProjectCard } from "@/components/project-card";
import { SyncNavigationUnread } from "@/components/sync-navigation-unread";
import { Empty, Notice, PageTitle, Pagination } from "@/components/ui";
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
  const status = param(query.status);
  const group = ["open", "awarded", "history"].includes(status) ? status : "";
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
    client.from("notifications").select("*", { count: "exact" }).is("read_at", null).order("created_at", { ascending: false }).limit(8),
    countOpen, countAwarded,
  ]);
  const rows = isTrade
    ? (applied?.data ?? []).map((application) => ({ project: application.projects, application }))
    : (own?.data ?? []).map((project) => ({ project, application: undefined }));
  const photos = await Promise.all(rows.map(({ project }) => projectImage(project)));
  const total = own?.count ?? applied?.count ?? 0;
  const activity = notifications.data ?? [];
  const title = isTrade ? "My applications" : "My jobs";
  const openLabel = isTrade ? "Pending applications" : "Open jobs";
  const actionHref = isTrade ? "/jobs" : "/projects/new";
  const actionLabel = isTrade ? "Find jobs" : "Post a job";
  const stats = [
    { label: openLabel, value: totalOpen.count ?? 0, Icon: isTrade ? ClipboardList : FolderOpen },
    { label: "Awarded jobs", value: totalAwarded.count ?? 0, Icon: CircleCheck },
    isTrade
      ? { label: "Available tokens", value: balance?.data ?? 0, Icon: Coins }
      : { label: "Unread notifications", value: notifications.count ?? 0, Icon: Bell },
  ];
  const filters = [
    { value: "", name: "All" },
    { value: "open", name: isTrade ? "Pending" : "Open" },
    { value: "awarded", name: "Awarded" },
    { value: "history", name: "History" },
  ];

  return <div className="market-surface"><div className="container page">
    <SyncNavigationUnread jobCount={notifications.count ?? 0} />
    <PageTitle title={title} description={isTrade ? "Track your applications and quotes." : "Manage your listings, applications, and quotes."}
      action={<Link className="button" href={actionHref}>{isTrade ? <BriefcaseBusiness size={17} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}{actionLabel}</Link>} />
    <Notice query={query} />
    <dl className="workspace-stats">
      {stats.map(({ label, value, Icon }) => <div className="panel workspace-stat" key={label}>
        <dt><Icon size={19} aria-hidden="true" />{label}</dt>
        <dd>{value}</dd>
      </div>)}
    </dl>
    <div className="workspace-dashboard">
      <section aria-labelledby="workspace-results">
        <div className="workspace-bar">
          <nav className="workspace-tabs" aria-label={isTrade ? "Application status" : "Job status"}>
            {filters.map(({ value, name }) => <Link key={name} href={value ? "/dashboard?status=" + value : "/dashboard"} aria-current={group === value ? "page" : undefined}>{name}</Link>)}
          </nav>
          <h2 id="workspace-results">{total} {isTrade ? (total === 1 ? "application" : "applications") : (total === 1 ? "job" : "jobs")}</h2>
        </div>
        {rows.length ? <div className="project-list">
          {rows.map(({ project, application }, index) => <ProjectCard key={project.id} project={project} photo={photos[index]}
            applicationStatus={application?.status} appliedAt={application?.created_at} />)}
        </div> : <Empty title={isTrade ? "No applications here" : "No jobs here"}
          action={<Link className="button secondary" href={group ? "/dashboard" : actionHref}>{group ? "View all" : actionLabel}</Link>}>
          {group ? "There are no results for this status." : isTrade ? "Find a job that fits your trade and apply to get started." : "Post a job to receive applications and quotes from local tradespeople."}
        </Empty>}
        <Pagination page={page} total={total} size={size} path="/dashboard" params={group ? { status: group } : {}} />
      </section>
      {activity.length > 0 && <aside className="panel workspace-notifications" aria-labelledby="workspace-notifications">
        <div className="section-head"><h2 id="workspace-notifications">Notifications</h2><Bell size={17} aria-hidden="true" /></div>
        <ul className="notification-list">{activity.map((note) =>
          <li key={note.id}><Link href={"/projects/" + note.project_id}>{note.subject}<time dateTime={note.created_at}>{shortDate(note.created_at)}</time></Link></li>)}</ul>
        <form action={markNotificationsRead}><button className="button secondary small">Mark all as read</button></form>
      </aside>}
    </div>
  </div></div>;
}
