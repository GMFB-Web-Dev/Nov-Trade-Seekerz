import Image from "next/image";
import Link from "next/link";
import { Cover } from "@/components/marketing";

export const metadata = { title: "About Us" };

export default function About() {
  return <><Cover title="Connecting Tradies and Homeowners" image="/images/about-cover.webp" />
    <div className="container marketing-content">
      <section className="marketing-split"><div><h2>Where Kiwis find tradespeople</h2><p>Trade Seekerz brings homeowners and local tradespeople together around the work that needs doing. Homeowners can post a job, compare quotes, and choose a tradesperson. Tradespeople can find jobs that fit their skills and service area.</p><Link className="button" href="/trades">Find a trade</Link></div>
      <Image src="/images/how-it-works-tradies-cover.webp" alt="Tradespeople working together" width={720} height={597} /></section>
    </div></>;
}
