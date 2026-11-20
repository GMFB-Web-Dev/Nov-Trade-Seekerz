import { Mail, MessageSquareText } from "lucide-react";
import { submitContact } from "@/app/actions/market";
import { Cover } from "@/components/marketing";
import { Notice } from "@/components/ui";
import type { Query } from "@/lib/format";

export const metadata = { title: "Contact Us" };

export default async function Contact({ searchParams }: { searchParams: Promise<Query> }) {
  return <><Cover title="Contact Trade Seekerz" image="/images/contact-cover.webp" />
    <div className="container marketing-content contact-grid">
      <div className="contact-info"><Mail size={34} /><h2>How can we help?</h2><p>Send us a note about your account, a job, or a marketplace question. Include the job title if you’re asking about a specific listing.</p></div>
      <form action={submitContact} className="stack panel">
        <h2><MessageSquareText size={21} /> Send a message</h2>
        <Notice query={await searchParams} />
        <div className="form-row"><label>Your name<input name="name" required minLength={2} maxLength={100}/></label>
        <label>Email address<input type="email" name="email" required maxLength={254}/></label></div>
        <label>Message<textarea name="message" rows={5} required minLength={12} maxLength={2000}/></label>
        <label className="trap" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
        <button className="button" type="submit">Send message</button>
      </form>
    </div></>;
}
