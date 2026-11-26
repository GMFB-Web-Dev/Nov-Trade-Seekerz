import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, ChevronRight, MessageSquare } from "lucide-react";
import { Conversation } from "@/components/conversation";
import { Back, Empty, Notice, PageTitle, Pagination, Tag } from "@/components/ui";
import { inboxPath, param, type Query } from "@/lib/format";
import { uuid } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export const metadata = { title: "Messages" };
const pageSize = 60;

export default async function Messages({ searchParams }: { searchParams: Promise<Query> }) {
  const { user, profile } = await member();
  const client = await db();
  const query = await searchParams;
  const selected = uuid.safeParse(param(query.application)).data;
  const page = Math.max(1, Math.min(200, Math.floor(Number(param(query.page)) || 1)));
  const isTrade = profile.role === "tradesperson";
  const threads = (count?: "exact") => client.from("applications")
    .select("id,status,tradesperson_id,projects!inner(id,title,status,homeowner_id),tradesperson:profiles!applications_tradesperson_id_fkey(business_name,display_name)", { count })
    .eq(isTrade ? "tradesperson_id" : "projects.homeowner_id", user.id);
  const list = await threads("exact").order("created_at", { ascending: false }).order("id")
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (page > 1 && (list.error?.code === "PGRST103" || list.data?.length === 0)) redirect(inboxPath(selected));
  if (list.error) throw new Error("Could not load conversations.");
  const match = list.data.find((item) => item.id === selected);
  const older = selected && !match ? await threads().eq("id", selected).maybeSingle() : null;
  if (older?.error) throw new Error("Could not load the selected conversation.");
  const requested = match ?? older?.data;
  const active = requested ?? list.data[0];
  const visibleThreads = older?.data ? [older.data, ...list.data] : list.data;
  const journal = active ? await client.from("messages").select("*").eq("application_id", active.id)
    .order("created_at", { ascending: false }).limit(100) : null;
  if (journal?.error) throw new Error("Could not load messages.");
  const participant = (item: typeof active) => isTrade
    ? "Homeowner"
    : item.tradesperson?.business_name || item.tradesperson?.display_name || "Tradesperson";
  const canSend = Boolean(active && ["pending", "awarded"].includes(active.status) && active.projects.status !== "cancelled");

  return <div className="market-surface"><div className="container page">
    <PageTitle title="Messages" />
    <Notice query={selected && !requested ? { ...query, error: "This conversation is unavailable." } : query} />
    {active ? <div className="inbox-workspace" data-view={requested ? "conversation" : "list"}>
      <aside className="panel inbox-directory">
        <nav aria-labelledby="inbox-directory-heading">
          <h2 id="inbox-directory-heading">Conversations</h2>
          <ul>
            {visibleThreads.map((item) => <li key={item.id}><Link className="inbox-thread-link"
              aria-current={active.id === item.id ? "page" : undefined} href={inboxPath(item.id, page)}>
              <span className="inbox-thread-icon"><MessageSquare size={18} aria-hidden="true" /></span>
              <span><strong>{item.projects.title}</strong><small>{participant(item)}</small></span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link></li>)}
          </ul>
        </nav>
        <Pagination page={page} total={list.count ?? 0} size={pageSize} path="/messages" />
      </aside>
      <div className="inbox-workspace-main">
        <div className="inbox-mobile-back"><Back to={inboxPath(undefined, page)}>All conversations</Back></div>
        <section className="panel inbox-conversation" aria-labelledby="inbox-conversation-heading">
          <header className="inbox-conversation-header">
            <div>
              <h2 id="inbox-conversation-heading">{active.projects.title}</h2>
              <div className="inbox-conversation-meta"><span>{participant(active)}</span><Tag value={active.status} /></div>
            </div>
            <Link className="button secondary small" href={"/projects/" + active.projects.id}>View job <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </header>
          <Conversation inboxPage={page} projectId={active.projects.id} applicationId={active.id} me={user.id}
            messages={(journal?.data ?? []).slice().reverse()} open={canSend} />
          {!canSend && <p className="inbox-closed">This conversation is closed.</p>}
        </section>
      </div>
    </div> : <Empty title="No conversations yet"
      action={<Link className="button secondary" href={isTrade ? "/jobs" : "/dashboard"}>{isTrade ? "Find jobs" : "View my jobs"}</Link>}>
      {isTrade ? "Your conversations with homeowners appear here after you apply for a job." : "Talk with tradespeople here when they apply to work on your job."}
    </Empty>}
  </div></div>;
}
