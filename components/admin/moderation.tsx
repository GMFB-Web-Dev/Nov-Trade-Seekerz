import Link from "next/link";
import { moderateReport } from "@/app/actions/admin";
import { Tag, TaskForm } from "@/components/ui";
import type { AdminFilter } from "@/lib/admin";
import { label, shortDate } from "@/lib/format";
import { db } from "@/lib/supabase";
import { AdminTable, FilterBar, readAdminPage } from "./table";

export async function Reports({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const states = ["open","in_review","resolved","dismissed"];
  let request = client.from("reports").select(
    "*,reporter:profiles!reports_reporter_id_fkey(display_name),handler:profiles!reports_handled_by_fkey(display_name),projects(title)", { count: "exact" });
  if (filter.q) request = request.ilike("reason", "%" + filter.q + "%");
  if (filter.state === "needs_review") request = request.in("status", ["open", "in_review"]);
  else if (states.includes(filter.state)) request = request.eq("status", filter.state);
  const { data, count } = await readAdminPage(request.order("created_at", { ascending: false }), filter, "Could not load reports.");
  return <>
    <FilterBar path="/admin/reports" filter={filter} search="Report reason" states={["needs_review", ...states]} />
    <AdminTable total={count} path="/admin/reports" filter={filter} rows={data.map((report) => ({
      id: report.id,
      cells: {
        Report: <><strong>{label(report.subject_kind)}</strong><p className="detail-copy">{report.reason}</p>
          {report.project_id ? <Link className="inline-link" href={"/projects/" + report.project_id}>{report.projects?.title || "Related job"}</Link>
            : report.subject_kind === "tradesperson" ? <Link href={"/trades/" + report.subject_id} className="inline-link">View profile</Link> : <small>{report.subject_id}</small>}</>,
        Reporter: <>{report.reporter?.display_name || "Account unavailable"}<small>{shortDate(report.created_at)}</small></>,
        Status: <><Tag value={report.status} />{report.resolved_at && <small>{shortDate(report.resolved_at)}</small>}
          {report.handler && <small>Handled by {report.handler.display_name}</small>}</>,
        Moderation: <details><summary>Review report</summary><TaskForm action={moderateReport} id={report.id} className="stack">
          <label>Status<select name="status" aria-label="Moderation status" defaultValue={report.status}>{states.map((state) => <option value={state} key={state}>{label(state)}</option>)}</select></label>
          <label>Resolution notes<textarea name="resolution" defaultValue={report.resolution ?? ""} rows={3} maxLength={1500}/></label>
          <button className="button small">Save decision</button>
        </TaskForm></details>,
      },
    }))} />
  </>;
}

export async function Support({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const query = client.from("feedback").select("*", { count: "exact" }).order("created_at", { ascending: false });
  const { data, count } = await readAdminPage(query, filter, "Could not load the support inbox.");
  return <AdminTable total={count} path="/admin/support" filter={filter} rows={data.map((item) => ({
    id: item.id,
    cells: {
      Sender: <><strong>{item.name}</strong><small>{item.email}</small></>,
      Message: <p className="detail-copy">{item.message}</p>,
      Received: shortDate(item.created_at),
    },
  }))} />;
}
