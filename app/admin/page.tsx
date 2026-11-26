import Link from "next/link";
import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, ClipboardList, CreditCard, Flag, Users, Wallet } from "lucide-react";
import { PageTitle } from "@/components/ui";
import { db } from "@/lib/supabase";
import { administrator } from "@/lib/viewer";

export default async function Overview() {
  await administrator();
  const client = await db();
  const [reports, documents, users, jobs, applications, subscriptions, orders] = await Promise.all([
    client.from("reports").select("id", { count: "exact", head: true }).in("status", ["open", "in_review"]),
    client.from("trade_documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
    client.from("profiles").select("id", { count: "exact", head: true }),
    client.from("projects").select("id", { count: "exact", head: true }).eq("status", "open"),
    client.from("applications").select("id", { count: "exact", head: true }),
    client.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    client.from("billing_orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
  ]);
  const groups = [
    { name: "Review queues", cards: [
      { label: "Reports awaiting review", count: reports.count, href: "/admin/reports?state=needs_review", Icon: Flag },
      { label: "Trade documents awaiting review", count: documents.count, href: "/admin/credentials?state=pending", Icon: BadgeCheck },
    ] },
    { name: "Marketplace activity", cards: [
      { label: "User accounts", count: users.count, href: "/admin/users", Icon: Users },
      { label: "Open jobs", count: jobs.count, href: "/admin/projects?state=open", Icon: BriefcaseBusiness },
      { label: "Applications", count: applications.count, href: "/admin/applications", Icon: ClipboardList },
      { label: "Active subscriptions", count: subscriptions.count, href: "/admin/subscriptions?state=active", Icon: CreditCard },
      { label: "Paid orders", count: orders.count, href: "/admin/billing?state=paid", Icon: Wallet },
    ] },
  ];
  return <><PageTitle title="Admin dashboard" />
    <div className="admin-overview">
      {groups.map(({ name, cards }) => <section className="admin-overview-section" key={name}>
        <h2>{name}</h2>
        <div className="admin-metrics">
          {cards.map(({ label, count, href, Icon }) => <Link className="panel admin-metric" prefetch={false} href={href} key={href}>
            <span className="admin-metric-icon"><Icon size={19} aria-hidden="true" /></span>
            <div><strong>{count?.toLocaleString("en-NZ") ?? "—"}</strong><span>{label}</span></div>
            <ArrowUpRight className="admin-metric-arrow" size={17} aria-hidden="true" />
          </Link>)}
        </div>
      </section>)}
    </div>
  </>;
}
