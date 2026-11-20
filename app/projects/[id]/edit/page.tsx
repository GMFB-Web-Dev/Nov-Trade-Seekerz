import { notFound } from "next/navigation";
import { editProject } from "@/app/actions/market";
import { ProjectForm } from "@/components/project-form";
import { Back, Notice, PageTitle } from "@/components/ui";
import type { Query } from "@/lib/format";
import { loadCategories, uuid } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export const metadata = { title: "Edit Job" };

export default async function EditProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const { user } = await member("homeowner");
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const client = await db();
  const [result, categories] = await Promise.all([
    client.from("projects").select("*").eq("id", id).eq("homeowner_id", user.id).eq("status", "open").maybeSingle(),
    loadCategories(),
  ]);
  if (!result.data) notFound();
  return <div className="container narrow page">
    <Back to={"/projects/" + id}>Back to job</Back>
    <PageTitle title="Edit job" />
    <Notice query={await searchParams} />
    <ProjectForm action={editProject} categories={categories} project={result.data} />
  </div>;
}
