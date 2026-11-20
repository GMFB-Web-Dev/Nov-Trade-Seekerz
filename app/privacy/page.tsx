import Link from "next/link";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Privacy" };

export default function Privacy() {
  return <div className="container narrow page"><PageTitle title="Privacy Policy" />
    <div className="panel prose"><h2>Your account</h2><p>Trade Seekerz uses your sign-in details, business or homeowner profile, and marketplace activity to operate your account and help you manage jobs, quotes, and messages.</p>
      <h2>Who can see your information</h2><p>Tradespeople’s public profiles include their business details and published reviews. Job photos, quotes, and conversations are limited to authorised accounts. Staff may access records when providing support or reviewing reports.</p>
      <h2>Manage your information</h2><p>Use your account page to update details or deactivate your account. For questions about access, correction, or deletion, <Link href="/contact">contact Trade Seekerz</Link>.</p>
    </div>
  </div>;
}
