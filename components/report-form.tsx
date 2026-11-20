import { reportContent } from "@/app/actions/market";

export function ReportForm({ routeId, subjectId, kind, title }: {
  routeId: string; subjectId: string; kind: "project" | "tradesperson" | "message" | "review"; title: string;
}) {
  return <details className="report-box">
    <summary>{title}</summary>
    <form className="stack" action={reportContent}>
      <input type="hidden" name="id" value={routeId} /><input type="hidden" name="subject_id" value={subjectId} />
      <input type="hidden" name="subject_kind" value={kind} />
      <label>Reason<textarea name="reason" rows={3} required minLength={12} maxLength={1500} /></label>
      <button className="button secondary small" type="submit">Send report</button>
    </form>
  </details>;
}
