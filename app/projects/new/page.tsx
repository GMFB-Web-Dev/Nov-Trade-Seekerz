import { createProject } from "@/app/actions/market";
import { ProjectForm } from "@/components/project-form";
import { Back, Notice, PageTitle } from "@/components/ui";
import { param, type Query } from "@/lib/format";
import { loadCategories, uuid } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export const metadata = { title: "Post a Job" };

export default async function NewProject({ searchParams }: { searchParams: Promise<Query> }) {
  await member("homeowner");
  const query = await searchParams;
  const trade = uuid.safeParse(param(query.invite));
  const client = await db();
  const [categories, invite] = await Promise.all([
    loadCategories(),
    trade.success ? client.from("profiles").select("id,business_name,category_slug").eq("id", trade.data).eq("role", "tradesperson").eq("status","active").maybeSingle() : null,
  ]);
  return <div className="container narrow page">
    <Back to="/dashboard">Dashboard</Back>
    <PageTitle title="Post a job" description="Share the work you need done, your location, and your budget." />
    <Notice query={query} />
    <ProjectForm action={createProject} categories={categories} invite={invite?.data ?? undefined} />
  </div>;
}
