import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, ChevronDown, ClipboardPenLine, MapPin, MessageSquareText, Search, ThumbsUp, UserRound } from "lucide-react";
import { tradeImage, trades } from "@/lib/catalog";
import { loadCategories } from "@/lib/projects";

const steps = [
  { label: "Make an Account", content: "Sign up in just a few clicks. It’s quick and free to post jobs and get quotes from local tradespeople.", Icon: UserRound },
  { label: "Post a Job", content: "Tell us what you need done and where. Include a few details and a photo to help the right tradespeople respond.", Icon: ClipboardPenLine },
  { label: "Choose the Best Offer", content: "Compare quotes, read reviews, and talk to the people who applied. You choose who to work with.", Icon: ThumbsUp },
];

const faq = [
  ["How does Trade Seekerz work?", "Create a homeowner account, post a job, and compare quotes from local tradespeople. You can message applicants before deciding who to hire."],
  ["Is it free to post a job?", "Yes. Creating a homeowner account and posting a job are free."],
  ["What types of tradespeople can I find?", "Search for builders, landscapers, handymen, plumbers, flooring installers, roofers, electricians and painters."],
  ["How do I choose a tradesperson?", "Look through their profile and completed-job reviews, ask questions, and compare the scope and price of their quote."],
  ["Can I use Trade Seekerz for urgent jobs?", "Include the date you need the work done and ask applicants about their availability before accepting a quote."],
];

export default async function Home() {
  const categories = await loadCategories().catch(() => {
    console.warn("Could not load homepage trade categories. Using the bundled catalog.");
    return trades;
  });
  return <>
    <section className="home-hero">
      <Image className="hero-image" src="/images/hero.webp" width={1202} height={548} priority alt="Tradesperson with tools at a job site" />
      <div className="container hero-inner">
        <Link href="/trades" className="hero-shortcut"><MapPin size={24} /><span><strong>Find local tradespeople</strong><small>Search by trade and postcode</small></span><ArrowRight size={17} /></Link>
        <h1>Find the Right Tradie<br className="hero-break" /> Fast and Easy!</h1>
        <p>What service are you looking for?</p>
        <form action="/trades" className="hero-search">
          <label className="search-field"><Search size={19} aria-hidden /><input type="search" name="q" aria-label="Service" placeholder="e.g. Landscaping" /></label>
          <label className="search-field postcode"><MapPin size={19} aria-hidden /><input name="postcode" aria-label="Postcode" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="Postcode" /></label>
          <button className="button" type="submit">Search</button>
        </form>
      </div>
    </section>

    <section className="container how-steps" aria-label="Three steps for homeowners">
      <div className="step-list">
        {steps.map(({ label, content, Icon }, index) => <article className="step-row" key={label}>
          <span className="step-icon"><Icon size={41} strokeWidth={1.5} /></span>
          <div><h2>{index + 1}. {label}</h2><p>{content}</p></div>
        </article>)}
      </div>
      <div className="phone" aria-label="Example Trade Seekerz profile">
        <div className="phone-speaker" />
        <div className="phone-top"><Image src="/images/logo.png" alt="Trade Seekerz" width={104} height={33} /></div>
        <Image className="phone-avatar" src="/images/tradie.webp" alt="" width={129} height={129} />
        <strong>Tradesperson profile</strong>
        <span><BadgeCheck size={16} /> Business details</span>
        <span><MapPin size={16} /> Service area</span>
        <span><MessageSquareText size={16} /> Customer reviews</span>
        <Link href="/trades" className="button small">Browse profiles</Link>
      </div>
    </section>

    <section className="container benefit-grid" aria-label="Marketplace features">
      <article><ClipboardPenLine size={25} /><h3>One job listing</h3><p>Describe the work once and let local tradespeople respond.</p></article>
      <article><MessageSquareText size={25} /><h3>Quotes in one place</h3><p>Compare prices and keep your discussions with each applicant together.</p></article>
      <article><BadgeCheck size={25} /><h3>Reviews from real jobs</h3><p>Read reviews left by homeowners who completed a job on Trade Seekerz.</p></article>
    </section>

    <section className="container home-explainer">
      <div>
        <h2>How to Use Trade Seekerz to Get the Best Tradie</h2>
        <p>Post your job, hear from tradespeople near you, and decide who fits the work.</p>
        <ul className="check-list">
          <li><Check size={16} /><div><strong>Quickly connect with the right people</strong><p>Share your location, timeline, and scope in one place.</p></div></li>
          <li><Check size={16} /><div><strong>Compare quotes and make confident choices</strong><p>Review the details of each offer before awarding the job.</p></div></li>
        </ul>
      </div>
      <Link className="explainer-photo" href="/how-it-works"><Image src="/images/how-it-works-homeowner-cover.webp" fill alt="" sizes="(max-width: 700px) 100vw, 36vw" /><span>See how it works <ArrowRight size={17} /></span></Link>
    </section>

    <section className="container categories-home">
      <div className="section-center"><h2>Top Trade Categories Near You</h2><p>What type of job do you need done?</p></div>
      <div className="category-grid">
        {categories.map(({ slug, name }) => <Link className="category-card" key={slug} href={"/trades?trade=" + slug}>
          <div><Image src={tradeImage(slug)} alt="" fill sizes="(max-width: 700px) 46vw, 21vw" /></div>
          <span>{name}<ArrowRight size={17} /></span>
        </Link>)}
      </div>
    </section>

    <section className="container faq-home">
      <div className="section-center"><h2>Frequently Asked Questions</h2><p>Find out what to expect before you post a job.</p></div>
      <div className="faq-grid">
        <div className="accordion">
          {faq.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}
        </div>
        <aside className="faq-contact"><MessageSquareText size={43} strokeWidth={1.5} /><h3>Have more questions?</h3><p>Get in touch with the Trade Seekerz team.</p><Link href="/contact" className="button">Contact us</Link></aside>
      </div>
    </section>
  </>;
}
