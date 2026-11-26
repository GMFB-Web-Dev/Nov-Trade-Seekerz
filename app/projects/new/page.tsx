import { createProject } from "@/app/actions/market";
import { NewProjectForm } from "@/components/project-form";
import { Back, Notice, PageTitle } from "@/components/ui";
import { param, type Query } from "@/lib/format";
import { loadCategories, uuid } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export const metadata = { title: "Post a Job" };

export default async function NewProject({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const trade = uuid.safeParse(param(query.invite));
  await member("homeowner", trade.success ? "/projects/new?invite=" + trade.data : "/projects/new");
  const client = await db();
  const [categories, invite] = await Promise.all([
    loadCategories(),
    trade.success ? client.from("profiles").select("id,business_name,profile_trade_categories(category_slug)")
      .eq("id", trade.data).eq("role", "tradesperson").eq("status", "active").not("onboarded_at", "is", null).maybeSingle() : null,
  ]);
  if (invite?.error) throw new Error("Could not load the requested tradesperson.");
  const requestedTradie = invite?.data;
  const activeSlugs = new Set(categories.map(({ slug }) => slug));
  const requestedCategories = requestedTradie?.profile_trade_categories.filter(({ category_slug }) => activeSlugs.has(category_slug)) ?? [];
  return <div className="market-surface"><div className="container narrow page">
    <Back to="/dashboard">My jobs</Back>
    <PageTitle title="Post a job" />
    <Notice query={query} />
    <NewProjectForm action={createProject} categories={categories} invite={requestedTradie ? {
      id: requestedTradie.id,
      business_name: requestedTradie.business_name,
      category_slug: requestedCategories.length === 1 ? requestedCategories[0].category_slug : null,
    } : undefined} />
  </div></div>;
}
