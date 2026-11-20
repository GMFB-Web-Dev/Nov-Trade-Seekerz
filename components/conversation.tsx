import { sendMessage } from "@/app/actions/market";
import { shortDate } from "@/lib/format";
import type { Message } from "@/lib/projects";
import { ReportForm } from "./report-form";

export function Conversation({ projectId, applicationId, me, messages, open, inbox }: {
  projectId: string; applicationId: string; me: string; messages: Message[]; open: boolean; inbox?: boolean;
}) {
  return <div className="conversation">
    {!messages.length ? <p className="field-note">There are no messages in this conversation yet.</p>
      : <ol className="message-history" aria-label="Message history">
        {messages.map((message) => <li className={"message-bubble" + (message.sender_id === me ? " mine" : "")} key={message.id}>
          <p>{message.body}</p><time dateTime={message.created_at}>{message.sender_id === me ? "You · " : ""}{shortDate(message.created_at)}</time>
          {message.sender_id !== me && <ReportForm routeId={projectId} subjectId={message.id} kind="message" title="Report message" />}
        </li>)}
      </ol>}
    {open && <form action={sendMessage} className="message-compose">
      <input type="hidden" name="id" value={projectId} /><input type="hidden" name="application_id" value={applicationId} />
      {inbox && <input type="hidden" name="inbox" value="1" />}
      <label>Message<textarea name="body" rows={2} required maxLength={3000} placeholder="Write a message…" /></label>
      <button className="button small" type="submit">Send message</button>
    </form>}
  </div>;
}
