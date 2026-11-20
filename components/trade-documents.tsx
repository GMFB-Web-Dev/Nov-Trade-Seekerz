import { addTradeDocument, removeOwnDocument } from "@/app/actions/documents";
import { db } from "@/lib/supabase";
import { Tag, TaskForm } from "./ui";

export async function TradeDocuments({ owner }: { owner: string }) {
  const client = await db();
  const { data } = await client.from("trade_documents").select("*").eq("owner_id", owner).order("created_at", { ascending: false }).limit(25);
  return <section className="panel stack">
    <h2>Trade documents</h2>
    <p>Submit licences or proof of insurance for staff review. The files are visible to you and administrators.</p>
    {!!data?.length && <ul className="ledger-list">
      {data.map((item) => <li key={item.id}>
        <div><strong>{item.title}</strong>{item.staff_note && <p>{item.staff_note}</p>}</div>
        <div className="buttons"><Tag value={item.status} /><TaskForm action={removeOwnDocument} id={item.id}><button className="button secondary small">Remove</button></TaskForm></div>
      </li>)}
    </ul>}
    <form action={addTradeDocument} className="stack">
      <div className="form-row">
        <label>Document name<input name="title" required minLength={3} maxLength={85} placeholder="e.g. Public liability insurance" /></label>
        <label>File<input type="file" name="document" accept=".pdf,.jpg,.jpeg,.png,.webp" required /></label>
      </div>
      <button className="button">Submit document</button>
    </form>
  </section>;
}
