import Link from "next/link";
import { BriefcaseBusiness, ClipboardList, CreditCard, Flag, Users, Wallet } from "lucide-react";
import { PageTitle } from "@/components/ui";
import { db } from "@/lib/supabase";
import { administrator } from "@/lib/viewer";

export default async function Overview() {
  await administrator();
  const client = await db();
  const cards = [
    { label: "User accounts", table: "profiles", href: "/admin/users", Icon: Users },
    { label: "Open jobs", table: "projects", href: "/admin/projects?state=open", Icon: BriefcaseBusiness },
    { label: "Applications", table: "applications", href: "/admin/applications", Icon: ClipboardList },
    { label: "Reports awaiting review", table: "reports", href: "/admin/reports?state=open", Icon: Flag },
    { label: "Active subscriptions", table: "subscriptions", href: "/admin/subscriptions?state=active", Icon: CreditCard },
    { label: "Paid orders", table: "billing_orders", href: "/admin/billing?state=paid", Icon: Wallet },
  ] as const;
  const totals = await Promise.all([
    client.from("profiles").select("id", { count: "exact", head: true }),
    client.from("projects").select("id", { count: "exact", head: true }).eq("status", "open"),
    client.from("applications").select("id", { count: "exact", head: true }),
    client.from("reports").select("id", { count: "exact", head: true }).in("status", ["open","in_review"]),
    client.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    client.from("billing_orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
  ]);
  return <><PageTitle title="Admin dashboard" description="Review marketplace activity, manage access, and resolve reports." />
    <div className="admin-overview">
      {cards.map(({ label, href, Icon }, index) => <Link className="kpi" href={href} key={href}><Icon size={20} /><strong>{totals[index].count ?? 0}</strong><span>{label}</span></Link>)}
    </div>
  </>;
}
