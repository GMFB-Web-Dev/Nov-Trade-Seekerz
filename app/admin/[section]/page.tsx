import { notFound } from "next/navigation";
import { Credentials } from "@/components/admin/credentials";
import { Accounts } from "@/components/admin/accounts";
import { Applications, Categories, Projects, Quotes, Reviews } from "@/components/admin/marketplace";
import { Reports, Support } from "@/components/admin/moderation";
import { Audit, BillingOrders, Errors, Settings, Subscriptions } from "@/components/admin/operations";
import { Notice, PageTitle } from "@/components/ui";
import { adminFilter, sections } from "@/lib/admin";
import type { Query } from "@/lib/format";
import { administrator } from "@/lib/viewer";

export default async function Section({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<Query> }) {
  const { user } = await administrator();
  const { section } = await params;
  const current = sections.find(({ slug }) => slug === section);
  if (!current) notFound();
  const query = await searchParams;
  const filter = adminFilter(query);
  const render = () => {
    switch (current.slug) {
      case "users": case "banned": case "admins": return <Accounts filter={filter} kind={current.slug} actor={user.id} />;
      case "projects": return <Projects filter={filter} />;
      case "applications": return <Applications filter={filter} />;
      case "quotes": return <Quotes filter={filter} />;
      case "credentials": return <Credentials filter={filter} />;
      case "categories": return <Categories />;
      case "reviews": return <Reviews filter={filter} />;
      case "reports": return <Reports filter={filter} />;
      case "support": return <Support filter={filter} />;
      case "subscriptions": return <Subscriptions filter={filter} />;
      case "billing": return <BillingOrders filter={filter} />;
      case "settings": return <Settings />;
      case "errors": return <Errors filter={filter} />;
      case "audit": return <Audit filter={filter} />;
      default: notFound();
    }
  };
  return <><PageTitle title={current.name} /><Notice query={query} />{render()}</>;
}
