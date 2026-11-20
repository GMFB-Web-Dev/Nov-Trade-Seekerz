import Link from "next/link";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Terms and Conditions" };

export default function Terms() {
  return <div className="container narrow page"><PageTitle title="Terms and Conditions" />
    <div className="panel prose"><p>The Trade Seekerz Marketplace Terms and Conditions explain the marketplace, account obligations, and transactions between homeowners and tradespeople.</p>
      <Link href="/marketplace-terms.pdf" className="button">Read the Marketplace Terms (PDF)</Link></div>
  </div>;
}
