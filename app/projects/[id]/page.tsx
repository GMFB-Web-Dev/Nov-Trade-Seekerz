import Image from "next/image";
import Link from "next/link";
import { Pencil, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { applyToProject, changeProject, leaveReview } from "@/app/actions/market";
import { ApplicationCard } from "@/components/project-applications";
import { ReportForm } from "@/components/report-form";
import { Back, Empty, Notice, PageTitle, Tag, TaskForm } from "@/components/ui";
import { tradeLabel } from "@/lib/catalog";
import { budget, param, shortDate, type Query } from "@/lib/format";
import { jobJourney } from "@/lib/job-journey";
import { projectImage, uuid } from "@/lib/projects";
import { db } from "@/lib/supabase";
import { member } from "@/lib/viewer";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const { user, profile, admin } = await member();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();
  const client = await db();
  const { data: project } = await client.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) notFound();

  const owner = project.homeowner_id === user.id && profile.role === "homeowner";
  const tradesperson = profile.role === "tradesperson";
  const [photo, list, review, balance] = await Promise.all([
    projectImage(project),
    client.from("applications").select("*, tradesperson:profiles!applications_tradesperson_id_fkey(display_name,business_name)")
      .eq("project_id", id).order("created_at"),
    project.status === "completed" ? client.from("reviews").select("*").eq("project_id", id).maybeSingle() : null,
    tradesperson ? client.rpc("token_balance") : null,
  ]);
  if (list.error) throw new Error("Applications could not be loaded.");
  const ids = list.data.map((application) => application.id);
  const [quotes, messages] = ids.length ? await Promise.all([
    client.from("quotes").select("*").in("application_id", ids),
    client.from("messages").select("*").in("application_id", ids)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(250),
  ]) : [null, null];
  const canApply = tradesperson && ids.length === 0 && project.status === "open"
    && (!project.invited_tradesperson_id || project.invited_tradesperson_id === user.id);
  const canComplete = owner && project.status === "awarded";
  const canReview = owner && project.status === "completed" && !review?.data && Boolean(project.awarded_to);
  const journey = jobJourney(param(query.from));
  const results = tradesperson && journey?.role === "tradesperson" ? journey.href : null;
  const hasApplication = list.data.some((application) => application.tradesperson_id === user.id);
  const location = project.suburb + " " + project.postcode;

  return <div className="market-surface"><div className="container page job-detail-page">
    {tradesperson
      ? <Back to={results ?? (hasApplication ? "/dashboard" : "/jobs")}>{results ? "Back to results" : hasApplication ? "My applications" : "Find jobs"}</Back>
      : <Back to={admin && !owner ? "/admin/projects" : "/dashboard"}>{admin && !owner ? "Manage jobs" : "My jobs"}</Back>}
    <PageTitle title={project.title} description={location}
      action={owner && project.status === "open"
        ? <Link className="button secondary" href={"/projects/" + id + "/edit"}><Pencil size={16} aria-hidden="true" /> Edit job</Link>
        : canApply && <Link className="button apply-shortcut" href="#apply">Apply for this job</Link>} />
    <Notice query={query} />
    <div className="job-detail-grid">
      <section className="panel stack job-overview">
        <div className="chips">
          <Tag value={tradeLabel(project.category_slug)} tone="neutral" />
          <Tag value={project.status} />
          {project.invited_tradesperson_id && <Tag value="Direct request" tone="neutral" />}
        </div>
        <dl className="job-facts">
          <div><dt>Budget (NZD)</dt><dd>{budget(project.budget_min, project.budget_max)}</dd></div>
          <div><dt>Posted</dt><dd><time dateTime={project.created_at}>{shortDate(project.created_at)}</time></dd></div>
          <div><dt>Applicant limit</dt><dd>{project.applicant_limit}</dd></div>
        </dl>
        <div className="stack job-description"><h2>About the job</h2><p className="detail-copy">{project.description}</p></div>
      </section>
      {canApply && <aside className="job-primary-action" id="apply">
        <TaskForm action={applyToProject} id={id} className="panel stack">
          {results && <input type="hidden" name="from" value={results} />}
          <h2>Apply for this job</h2>
          <p>Applying uses one token. You have <strong>{balance?.data ?? 0}</strong> available.</p>
          {(balance?.data ?? 0) > 0 ? <>
            <label>Introduce yourself<textarea name="introduction" rows={4} required minLength={10} maxLength={2000} placeholder="Tell the homeowner how you can help." /></label>
            <button className="button">Apply for 1 token</button>
          </> : <Link href="/billing" className="button">Get tokens</Link>}
        </TaskForm>
      </aside>}
      {canComplete && <aside className="job-primary-action">
        <TaskForm action={changeProject} id={id} className="panel stack">
          <h2>Is the work finished?</h2>
          <p>Mark the job complete to leave a review.</p>
          <button className="button" name="operation" value="finish">Mark as complete</button>
        </TaskForm>
      </aside>}
      <div className="job-detail-content">
        {(owner || ids.length > 0 || admin) && <section className="panel">
          <h2>{owner || admin ? "Applications and quotes" : "Your application"}</h2>
          {ids.length ? list.data.map((application) => <ApplicationCard key={application.id} application={application}
            project={project} me={user.id} owner={owner} staff={admin && !owner && application.tradesperson_id !== user.id}
            results={results}
            quote={quotes?.data?.find((quote) => quote.application_id === application.id)}
            messages={(messages?.data ?? []).filter((message) => message.application_id === application.id).reverse()} />)
            : <Empty title="No applications yet">Applicant messages and quotes will appear here.</Empty>}
        </section>}
        {canReview && <TaskForm action={leaveReview} id={id} className="panel stack">
          <h2>Review your tradesperson</h2>
          <label>Rating<select name="rating" defaultValue="5"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label>
          <label>Review<textarea name="body" rows={4} required minLength={12} maxLength={1200}/></label>
          <button className="button">Publish review</button>
        </TaskForm>}
        {review?.data && <section className="panel stack">
          <h2>Job review</h2>
          <span className="rating"><Star size={17} aria-hidden="true" /> {review.data.rating} / 5</span>
          <p className="detail-copy">{review.data.body}</p>
        </section>}
        {photo && <section className="panel stack job-photo">
          <h2>Job photo</h2>
          <Image src={photo} width={880} height={580} alt="Photo supplied for this job" unoptimized />
        </section>}
      </div>
    </div>
    <div className="job-support panel stack">
      <h2>Job options</h2>
      {owner && project.status === "open" && <details className="report-box">
        <summary>Cancel this job</summary>
        <TaskForm action={changeProject} id={id} className="stack">
          <p>This closes the listing and declines pending applications.</p>
          <button className="button danger small" name="operation" value="cancel">Confirm cancellation</button>
        </TaskForm>
      </details>}
      <ReportForm routeId={id} subjectId={id} kind="project" title="Report this job" results={results} />
      <Link className="inline-link" href="/contact">Contact support</Link>
    </div>
  </div></div>;
}
