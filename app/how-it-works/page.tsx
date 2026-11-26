import Link from "next/link";
import { Cover } from "@/components/marketing";

export const metadata = { title: "How It Works" };

export default function HowItWorks() {
  return <><Cover title="How Trade Seekerz works" image="/images/how-it-works-tradies-cover.webp" />
    <div className="container marketing-content marketing-split two-cards">
      <section className="panel" id="homeowners"><h2>For homeowners</h2><ol>
        <li>Set up a free homeowner account.</li><li>Describe your job, location, and budget.</li><li>Talk to applicants and compare their quotes.</li><li>Award the job and leave a review after completion.</li>
      </ol><Link className="button" href="/projects/new">Post a job</Link></section>
      <section className="panel" id="tradespeople"><h2>For tradespeople</h2><ol>
        <li>Add your business, trade, and service area.</li><li>Browse open jobs and use one token to apply.</li><li>Send a quote and agree the scope with the homeowner.</li><li>Manage your applications and token balance from your dashboard.</li>
      </ol><Link className="button" href="/jobs">Find jobs</Link></section>
    </div></>;
}
