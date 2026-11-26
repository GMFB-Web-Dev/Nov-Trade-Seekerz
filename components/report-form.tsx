import { reportContent } from "@/app/actions/market";

export function ReportForm({ routeId, subjectId, kind, title, inbox, results }: {
  routeId: string; subjectId: string; kind: "project" | "tradesperson" | "message" | "review"; title: string;
  inbox?: { applicationId: string; page: number }; results?: string | null;
}) {
  return <details className="report-box">
    <summary>{title}</summary>
    <form className="stack" action={reportContent}>
      <input type="hidden" name="id" value={routeId} /><input type="hidden" name="subject_id" value={subjectId} />
      <input type="hidden" name="subject_kind" value={kind} />
      {inbox && <>
        <input type="hidden" name="inbox_application" value={inbox.applicationId} />
        <input type="hidden" name="inbox_page" value={inbox.page} />
      </>}
      {results && <input type="hidden" name="from" value={results} />}
      <label>Reason<textarea name="reason" rows={3} required minLength={12} maxLength={1500} /></label>
      <button className="button secondary small" type="submit">Send report</button>
    </form>
  </details>;
}
