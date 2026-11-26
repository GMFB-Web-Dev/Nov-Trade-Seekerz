import { sendMessage } from "@/app/actions/market";
import { Send } from "lucide-react";
import { shortDate } from "@/lib/format";
import type { Message } from "@/lib/projects";
import { ReportForm } from "./report-form";

export function Conversation({ projectId, applicationId, me, messages, open, inboxPage, results }: {
  projectId: string; applicationId: string; me: string; messages: Message[]; open: boolean; inboxPage?: number;
  results?: string | null;
}) {
  return <div className="conversation">
    {!messages.length ? <p className="conversation-empty">{open ? "Start the conversation with a message about the job." : "There are no messages in this conversation yet."}</p>
      : <ol className="message-history" aria-label="Message history">
        {messages.map((message) => <li className={"message-bubble" + (message.sender_id === me ? " mine" : "")} key={message.id}>
          <p>{message.body}</p><time dateTime={message.created_at}>{message.sender_id === me ? "You · " : ""}{shortDate(message.created_at)}</time>
          {message.sender_id !== me && <ReportForm routeId={projectId} subjectId={message.id} kind="message" title="Report message"
            inbox={inboxPage ? { applicationId, page: inboxPage } : undefined} results={results} />}
        </li>)}
      </ol>}
    {open && <form action={sendMessage} className="message-compose">
      <input type="hidden" name="id" value={projectId} /><input type="hidden" name="application_id" value={applicationId} />
      {inboxPage && <>
        <input type="hidden" name="inbox" value="1" />
        <input type="hidden" name="inbox_page" value={inboxPage} />
      </>}
      {results && <input type="hidden" name="from" value={results} />}
      <label>Message<textarea name="body" rows={2} required maxLength={3000} placeholder="Write a message…" /></label>
      <button className="button" type="submit"><Send size={16} aria-hidden="true" /> Send message</button>
    </form>}
  </div>;
}
