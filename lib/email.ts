import "server-only";
import nodemailer from "nodemailer";
import { appUrl, isLoopback, liveIntegrationsEnabled, supabaseEnv } from "./env";
import { serviceDb } from "./supabase";

export async function deliverNotifications() {
  const local = isLoopback(supabaseEnv().url) && isLoopback(appUrl());
  const apiKey = liveIntegrationsEnabled() ? process.env.RESEND_API_KEY : undefined;
  if (!local && !apiKey) return;

  const client = serviceDb();
  const due = await client.from("email_outbox")
    .select("id,notifications(subject,project_id),recipient_id,attempts,next_attempt_at")
    .is("sent_at", null).lt("attempts", 6).lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at").limit(15);
  if (due.error) {
    console.error("notification-read", { code: due.error.code });
    return;
  }

  const port = Number(process.env.MAILPIT_SMTP_PORT || "55425");
  const mailbox = local ? nodemailer.createTransport({
    host: "127.0.0.1", port, secure: false, ignoreTLS: true,
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000,
  }) : null;

  for (const row of due.data) {
    const nextAttempt = new Date(Date.now() + 2 ** (row.attempts + 1) * 60_000).toISOString();
    const claim = await client.from("email_outbox").update({ attempts: row.attempts + 1, next_attempt_at: nextAttempt })
      .eq("id", row.id).eq("next_attempt_at", row.next_attempt_at).is("sent_at", null).select("id").maybeSingle();
    if (!claim.data) continue;

    try {
      const recipient = await client.auth.admin.getUserById(row.recipient_id);
      if (recipient.error || !recipient.data.user.email || !row.notifications) throw new Error("Recipient lookup failed");
      const note = row.notifications;
      const content = {
        from: local ? "Trade Seekerz <notifications@tradeseekerz.test>" : process.env.EMAIL_FROM,
        to: recipient.data.user.email,
        subject: note.subject,
        text: note.subject + "\n\nView the job: " + appUrl() + "/projects/" + note.project_id,
      };
      if (!content.from) throw new Error("Sender is missing");
      if (mailbox) {
        await mailbox.sendMail({ ...content, messageId: "<" + row.id + "@tradeseekerz.test>" });
      } else {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST", signal: AbortSignal.timeout(8000),
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
            "Idempotency-Key": "market-notification/" + row.id,
          },
          body: JSON.stringify(content),
        });
        if (!response.ok) throw new Error("Delivery provider returned " + response.status);
      }
      const marked = await client.from("email_outbox").update({ sent_at: new Date().toISOString(), last_error: null }).eq("id", row.id);
      if (marked.error) throw new Error("Delivery could not be recorded");
    } catch {
      console.error("notification-delivery", { outboxId: row.id, attempt: row.attempts + 1 });
      await client.from("email_outbox").update({ last_error: "Delivery attempt failed" }).eq("id", row.id);
    }
  }
}
