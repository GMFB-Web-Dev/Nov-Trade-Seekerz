import Link from "next/link";
import { Conversation } from "@/components/conversation";
import { Empty, Notice, PageTitle, Tag } from "@/components/ui";
import { param, type Query } from "@/lib/format";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export const metadata = { title: "Messages" };

export default async function Messages({ searchParams }: { searchParams: Promise<Query> }) {
  const { user, profile } = await member();
  const client = await db();
  const query = await searchParams;
  const selected = param(query.application);
  const list = await client.from("applications")
    .select("id,status,tradesperson_id,projects!inner(id,title,status,homeowner_id),tradesperson:profiles!applications_tradesperson_id_fkey(business_name,display_name)")
    .eq(profile.role === "tradesperson" ? "tradesperson_id" : "projects.homeowner_id", user.id)
    .order("created_at", { ascending: false }).limit(60);
  if (list.error) throw new Error("Could not load conversations.");
  const active = list.data.find((item) => item.id === selected) || list.data[0];
  const journal = active ? await client.from("messages").select("*").eq("application_id", active.id)
    .order("created_at", { ascending: false }).limit(100) : null;
  return <div className="market-surface"><div className="container page">
    <PageTitle title="Messages" description="Talk through job details with homeowners and tradespeople." />
    <Notice query={query} />
    {active ? <div className="inbox-layout">
      <nav className="panel stack" aria-label="Conversations">
        {list.data.map((item) => <Link className="thread-link" aria-current={active.id === item.id ? "page" : undefined} key={item.id} href={"/messages?application=" + item.id}>
          <strong>{item.projects.title}</strong><span>{profile.role === "tradesperson" ? "Homeowner" : item.tradesperson?.business_name || "Tradesperson"}</span>
        </Link>)}
      </nav>
      <section className="panel stack">
        <div className="section-head"><h2>{active.projects.title}</h2><Tag value={active.status} /></div>
        <Link className="inline-link" href={"/projects/" + active.projects.id}>View job</Link>
        <Conversation inbox projectId={active.projects.id} applicationId={active.id} me={user.id}
          messages={(journal?.data ?? []).slice().reverse()} open={["pending","awarded"].includes(active.status) && active.projects.status !== "cancelled"} />
      </section>
    </div> : <Empty title="No conversations yet">A conversation becomes available after a tradesperson applies for a job.</Empty>}
  </div></div>;
}
