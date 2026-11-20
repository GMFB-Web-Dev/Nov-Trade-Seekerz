import Link from "next/link";
import { moderateReport } from "@/app/actions/admin";
import { Tag, TaskForm } from "@/components/ui";
import type { AdminFilter } from "@/lib/admin";
import { label, shortDate } from "@/lib/format";
import { db } from "@/lib/supabase";
import { AdminTable, FilterBar } from "./table";

export async function Reports({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const states = ["open","in_review","resolved","dismissed"];
  let request = client.from("reports").select(
    "*,reporter:profiles!reports_reporter_id_fkey(display_name),handler:profiles!reports_handled_by_fkey(display_name),projects(title)", { count: "exact" });
  if (filter.q) request = request.ilike("reason", "%" + filter.q + "%");
  if (states.includes(filter.state)) request = request.eq("status", filter.state);
  const { data, count, error } = await request.order("created_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load reports.");
  return <>
    <FilterBar path="/admin/reports" filter={filter} search="Report reason" states={states} />
    <AdminTable columns={["Report", "Reporter", "Status", "Moderation"]} total={count} path="/admin/reports" filter={filter}>
      {data.map((report) => <tr key={report.id}>
        <td><strong>{label(report.subject_kind)}</strong><p className="detail-copy">{report.reason}</p>
          {report.project_id ? <Link className="inline-link" href={"/projects/" + report.project_id}>{report.projects?.title || "Related job"}</Link>
            : report.subject_kind === "tradesperson" ? <Link href={"/trades/" + report.subject_id} className="inline-link">View profile</Link> : <small>{report.subject_id}</small>}</td>
        <td>{report.reporter?.display_name || "Account unavailable"}<small>{shortDate(report.created_at)}</small></td>
        <td><Tag value={report.status} />{report.resolved_at && <small>{shortDate(report.resolved_at)}</small>}
          {report.handler && <small>Handled by {report.handler.display_name}</small>}</td>
        <td><details><summary>Review report</summary><TaskForm action={moderateReport} id={report.id} className="stack">
          <label>Status<select name="status" aria-label="Moderation status" defaultValue={report.status}>{states.map((state) => <option value={state} key={state}>{label(state)}</option>)}</select></label>
          <label>Resolution notes<textarea name="resolution" defaultValue={report.resolution ?? ""} rows={3} maxLength={1500}/></label>
          <button className="button small">Save decision</button>
        </TaskForm></details></td>
      </tr>)}
    </AdminTable>
  </>;
}

export async function Support({ filter }: { filter: AdminFilter }) {
  const client = await db();
  const { data, count, error } = await client.from("feedback").select("*", { count: "exact" })
    .order("created_at", { ascending: false }).range(filter.first, filter.last);
  if (error) throw new Error("Could not load the support inbox.");
  return <AdminTable columns={["Sender", "Message", "Received"]} total={count} path="/admin/support" filter={filter}>
    {data.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.email}</small></td>
      <td><p className="detail-copy">{item.message}</p></td><td>{shortDate(item.created_at)}</td></tr>)}
  </AdminTable>;
}
