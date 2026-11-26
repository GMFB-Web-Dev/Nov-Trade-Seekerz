import { addTradeDocument, removeOwnDocument } from "@/app/actions/documents";
import { shortDate } from "@/lib/format";
import { db } from "@/lib/supabase";
import { Tag, TaskForm } from "./ui";

export async function TradeDocuments({ owner }: { owner: string }) {
  const client = await db();
  const { data } = await client.from("trade_documents").select("id,title,status,staff_note,created_at")
    .eq("owner_id", owner).order("created_at", { ascending: false }).limit(25);

  return <section id="documents" className="panel stack member-section">
    <h2>Trade documents</h2>
    <p>Submit licences or proof of insurance for review. Only you and administrators can see the files.</p>
    {data?.length ? <ul className="member-activity-list">
      {data.map((item) => <li key={item.id}>
        <div className="member-activity-copy"><strong>{item.title}</strong>
          <time dateTime={item.created_at}>Submitted {shortDate(item.created_at)}</time>
          {item.staff_note && <p>{item.staff_note}</p>}
        </div>
        <div className="buttons">
          <Tag value={item.status} tone={item.status === "approved" ? "good" : item.status === "declined" ? "neutral" : undefined} />
          <TaskForm action={removeOwnDocument} id={item.id}><button className="button secondary small">Remove</button></TaskForm>
        </div>
      </li>)}
    </ul> : <p className="field-note">No documents submitted yet.</p>}
    <form action={addTradeDocument} className="stack member-section-form">
      <h3>Upload a document</h3>
      <div className="form-row">
        <label>Document name<input name="title" required minLength={3} maxLength={85} placeholder="e.g. Public liability insurance" /></label>
        <div className="field">
          <label>File<input type="file" name="document" accept=".pdf,.jpg,.jpeg,.png,.webp" aria-describedby="document-formats" required /></label>
          <small className="field-note" id="document-formats">PDF, JPG, PNG or WebP up to 5 MB.</small>
        </div>
      </div>
      <button className="button">Submit document</button>
    </form>
  </section>;
}
