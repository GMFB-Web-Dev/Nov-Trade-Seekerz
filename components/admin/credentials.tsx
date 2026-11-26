import { removeStaffDocument, reviewTradeDocument } from "@/app/actions/documents";
import { Tag, TaskForm } from "@/components/ui";
import type { AdminFilter } from "@/lib/admin";
import { shortDate } from "@/lib/format";
import { db } from "@/lib/supabase";
import { AdminTable, FilterBar, readAdminPage } from "./table";

export async function Credentials({ filter }: { filter: AdminFilter }) {
  const path = "/admin/credentials";
  const client = await db();
  const states = ["pending", "approved", "declined"];
  let request = client.from("trade_documents").select(
    "*,profiles!trade_documents_owner_id_fkey(display_name,business_name)", { count: "exact" });
  if (filter.q) request = request.ilike("title", "%" + filter.q + "%");
  if (states.includes(filter.state)) request = request.eq("status", filter.state);
  const result = await readAdminPage(request.order("created_at", { ascending: false }), filter, "Could not load trade documents.");
  const files = await Promise.all(result.data.map((row) => client.storage.from("trade-documents").createSignedUrl(row.object_path, 120, { download: true })));
  return <>
    <FilterBar path={path} filter={filter} search="Document name" states={states} />
    <AdminTable total={result.count} filter={filter} path={path} rows={result.data.map((item, index) => ({
      id: item.id,
      cells: {
        Document: <><strong>{item.title}</strong><small>{shortDate(item.created_at)}</small>
          {files[index].data && <a className="inline-link" href={files[index].data.signedUrl}>Download document</a>}</>,
        "Submitted by": item.profiles?.business_name || item.profiles?.display_name || "Tradesperson",
        Status: <><Tag value={item.status} />{item.staff_note && <small>{item.staff_note}</small>}</>,
        Actions: <details><summary>Review document</summary>
          <TaskForm action={reviewTradeDocument} id={item.id} className="stack">
            <label>Staff note<textarea name="reason" rows={3} maxLength={500} defaultValue={item.staff_note || ""} /></label>
            <div className="buttons"><button className="button small" name="decision" value="approved">Approve</button>
              <button className="button secondary small" name="decision" value="declined">Decline</button></div>
          </TaskForm>
          <TaskForm action={removeStaffDocument} id={item.id} className="admin-detail"><button className="button danger small">Remove file</button></TaskForm>
        </details>,
      },
    }))} />
  </>;
}
