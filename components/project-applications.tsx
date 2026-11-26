import Link from "next/link";
import { changeProject, quoteProject, withdrawApplication } from "@/app/actions/market";
import { dollars } from "@/lib/format";
import type { Application, Project, Quote, Message } from "@/lib/projects";
import { Conversation } from "./conversation";
import { Tag, TaskForm } from "./ui";

type ApplicationData = Application & {
  tradesperson: { display_name: string; business_name: string } | null;
};

export function ApplicationCard({ project, application, quote, messages, me, owner, staff, results }: {
  project: Project; application: ApplicationData; quote?: Quote; messages: Message[]; me: string; owner: boolean; staff: boolean; results: string | null;
}) {
  const pending = project.status === "open" && application.status === "pending";
  const name = application.tradesperson?.business_name || application.tradesperson?.display_name || "Tradesperson";
  return <article className="application-card">
    <div className="section-head application-heading"><h3>{owner || staff ? <Link href={"/trades/" + application.tradesperson_id}>{name}</Link> : "Application details"}</h3>
      <Tag value={application.status} /></div>
    <p className="detail-copy">{application.introduction}</p>
    {quote && <div className="quote-box">
      <div className="section-head"><span>Quote</span><strong>{dollars(quote.amount_cents)} NZD</strong></div>
      <p className="detail-copy">{quote.description}</p>
    </div>}
    {owner && pending && quote && <TaskForm action={changeProject} id={project.id}>
      <input type="hidden" name="application_id" value={application.id} />
      <button className="button small" name="operation" value="award">Accept quote and award job</button>
    </TaskForm>}
    {!staff && !owner && pending && <>
      <details><summary>{quote ? "Edit your quote" : "Submit a quote"}</summary>
        <TaskForm action={quoteProject} id={project.id} className="stack">
          <input type="hidden" name="application_id" value={application.id} />
          {results && <input type="hidden" name="from" value={results} />}
          <label>Quote amount (NZD)<input name="amount" type="number" step="0.01" min="1" max="10000000" defaultValue={quote ? quote.amount_cents / 100 : ""} required /></label>
          <label>Scope of work<textarea name="description" rows={3} required minLength={10} maxLength={2000} defaultValue={quote?.description}/></label>
          <button className="button small">Share quote</button>
        </TaskForm>
      </details>
      <TaskForm action={withdrawApplication} id={project.id}>
        <input type="hidden" name="application_id" value={application.id} />
        {results && <input type="hidden" name="from" value={results} />}
        <button className="button secondary small">Withdraw application</button>
      </TaskForm>
    </>}
    <details>
      <summary>Messages ({messages.length})</summary>
      <Conversation projectId={project.id} applicationId={application.id} me={me} messages={messages}
        open={!staff && ["pending", "awarded"].includes(application.status) && project.status !== "cancelled"} results={results} />
    </details>
  </article>;
}
