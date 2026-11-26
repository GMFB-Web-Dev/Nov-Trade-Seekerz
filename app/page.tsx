import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ChevronDown, ClipboardPenLine, ListChecks, MessageSquareText, Search } from "lucide-react";
import { tradeImage, trades } from "@/lib/catalog";
import { loadCategories } from "@/lib/projects";
import { getViewer } from "@/lib/viewer";

const steps = [
  { title: "Post your job", description: "Tell tradies what you need done, where you are, and what you’re budgeting.", Icon: ClipboardPenLine },
  { title: "Compare quotes", description: "Review applications, ask questions, and compare quotes in one place.", Icon: MessageSquareText },
  { title: "Choose your tradie", description: "Award the job when you’re ready and leave a review once it’s complete.", Icon: ListChecks },
];

const questions = [
  ["Is it free to post a job?", "Yes. Creating a homeowner account and posting a job are free."],
  ["What kinds of work can I post?", "You can post building, landscaping, handyman, plumbing, flooring, roofing, electrical, and painting jobs."],
  ["How do I choose a tradesperson?", "Review their profile and completed-job reviews, ask about availability, and compare the scope and price of each quote."],
  ["Can I post an urgent job?", "Include the date you need the work done and confirm availability with applicants before accepting a quote."],
];

export default async function Home() {
  await connection();
  const [categories, viewer] = await Promise.all([
    loadCategories().catch(() => {
      console.warn("Could not load homepage trade categories. Using the bundled catalog.");
      return trades;
    }),
    getViewer(),
  ]);
  const profile = viewer?.profile;
  const role = profile?.status === "active" && profile.onboarded_at ? profile.role : undefined;
  const tradie = role === "tradesperson";

  return <>
    <section className="home-hero">
      <div className="container home-hero-grid">
        <div className="home-hero-content">
          <h1>{tradie ? "Find your next trade job" : "Find a tradie for your next job"}</h1>
          <p>{tradie
            ? "Find work that fits your trade and service area. Manage your applications, quotes, and messages in one place."
            : "Post your job, compare quotes, and hire local tradespeople across Aotearoa New Zealand."}</p>
          <div className="buttons">
            <Link className="button" href={tradie ? "/jobs" : "/projects/new"}>
              {tradie ? "Find jobs" : "Post a job"} <ArrowRight size={17} aria-hidden="true" />
            </Link>
            {tradie && <Link className="button secondary" href="/dashboard">My applications</Link>}
            {!role && <Link className="button secondary" href="/jobs">Find jobs as a tradie</Link>}
          </div>
        </div>
        <div className="home-hero-photo">
          <Image src="/images/hero.webp" fill priority sizes="(max-width: 720px) calc(100vw - 32px), 50vw" alt="Tradesperson wearing a tool belt on a job site" />
        </div>
        <form action={tradie ? "/jobs" : "/trades"} className="panel home-search" role="search" aria-label={tradie ? "Search jobs" : "Find a local tradie"}>
          <h2>{tradie ? "Search jobs" : "Find a local tradie"}</h2>
          <label>{tradie ? "Keyword" : "Trade or business"}<input type="search" name="q" maxLength={70} placeholder={tradie ? "e.g. Fence repair" : "e.g. Plumbing"} /></label>
          {tradie
            ? <label>Location<input name="area" maxLength={50} placeholder="Suburb or postcode" /></label>
            : <label>Postcode<input name="postcode" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="e.g. 1025" /></label>}
          <button className="button" type="submit"><Search size={17} aria-hidden="true" /> Search</button>
        </form>
      </div>
    </section>

    {categories.length > 0 && <section className="container home-section" aria-labelledby="categories-title">
      <div className="section-head home-section-head">
        <h2 id="categories-title">Browse by trade</h2>
        <Link className="inline-link" href={tradie ? "/jobs" : "/trades"}>{tradie ? "View all jobs" : "View all trades"}</Link>
      </div>
      <div className="category-grid">
        {categories.map(({ slug, name }) => <Link className="category-card" key={slug} href={(tradie ? "/jobs" : "/trades") + "?trade=" + encodeURIComponent(slug)}>
          <div><Image src={tradeImage(slug)} alt="" fill sizes="(max-width: 620px) 46vw, (max-width: 900px) 30vw, 25vw" /></div>
          <span>{name}<ArrowRight size={17} aria-hidden="true" /></span>
        </Link>)}
      </div>
    </section>}

    {!tradie && <section className="home-process" aria-labelledby="process-title">
      <div className="container">
        <div className="section-head home-section-head">
          <h2 id="process-title">How posting a job works</h2>
          <Link className="inline-link" href="/how-it-works">Marketplace guide</Link>
        </div>
        <ol className="home-process-grid">
          {steps.map(({ title, description, Icon }) => <li className="panel" key={title}>
            <span className="feature-icon"><Icon size={23} aria-hidden="true" /></span>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>)}
        </ol>
      </div>
    </section>}

    <section className="container home-section home-faq" aria-labelledby="faq-title">
      <div className="stack">
        <h2 id="faq-title">Frequently asked questions</h2>
        <p>Have a question about your account or a job?</p>
        <div><Link href="/contact" className="button secondary">Contact us</Link></div>
      </div>
      <div className="accordion">
        {questions.map(([question, answer]) => <details key={question}>
          <summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary>
          <p>{answer}</p>
        </details>)}
      </div>
    </section>
  </>;
}
