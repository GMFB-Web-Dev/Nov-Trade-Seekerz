import Link from "next/link";
import { FileText, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { deactivateAccount, logout, saveProfile } from "@/app/actions/auth";
import { TradeDocuments } from "@/components/trade-documents";
import { ProfileFields } from "@/components/profile-fields";
import { Notice, PageTitle, Tag } from "@/components/ui";
import { type Query } from "@/lib/format";
import { db } from "@/lib/supabase";
import { signedIn } from "@/lib/viewer";

export const metadata = { title: "Account" };

export default async function Account({ searchParams }: { searchParams: Promise<Query> }) {
  const [{ user, profile, admin }, query] = await Promise.all([signedIn(), searchParams]);
  const trade = profile?.role === "tradesperson";
  const client = trade && profile.status === "active" && profile.onboarded_at ? await db() : null;
  const [categories, selections] = client ? await Promise.all([
    client.from("categories").select("slug,name").eq("active", true).order("sort_order").order("name"),
    client.from("profile_trade_categories").select("category_slug").eq("profile_id", user.id),
  ]) : [null, null];
  if (categories?.error || selections?.error) throw new Error("Could not load your trade categories.");
  const selectedCategories = selections?.data.map(({ category_slug }) => category_slug);

  return <div className="market-surface"><div className="container page account-page">
    <PageTitle title="Your account" description={user.email} action={<form action={logout}>
      <button className="button secondary"><LogOut size={16} aria-hidden="true" /> Sign out</button>
    </form>} />
    <Notice query={query} />
    {profile?.status !== "active" ? <section className="panel stack">
      <div><Tag value={profile?.status || "unavailable"} tone="neutral" /></div>
      <h2>Account access is restricted</h2>
      <p>Contact support for help restoring access.</p>
      <div className="buttons"><Link href="/contact" className="button">Contact support</Link></div>
    </section> : !profile.onboarded_at ? <section className="panel stack">
      <h2>Finish setting up your profile</h2>
      <div className="buttons">
        <Link href="/onboarding" className="button">Complete setup</Link>
        {admin && <Link href="/admin" className="button secondary">Open admin</Link>}
      </div>
    </section> : <div className="account-layout">
      <nav className="panel account-navigation side-links" aria-label="Account sections">
        <a href="#profile"><UserRound size={16} aria-hidden="true" /> Profile</a>
        {trade && <a href="#documents"><FileText size={16} aria-hidden="true" /> Trade documents</a>}
        <a href="#security"><LockKeyhole size={16} aria-hidden="true" /> Security</a>
      </nav>
      <div className="member-section-stack">
        <form id="profile" action={saveProfile} className="panel stack member-section">
          <div className="section-head">
            <h2>Profile details</h2>
            {trade && <Link className="inline-link" href={"/trades/" + user.id}>View public profile</Link>}
          </div>
          <ProfileFields categories={categories?.data ?? []} profile={profile} selectedCategories={selectedCategories} />
          <button className="button">Save profile</button>
        </form>
        {trade && <TradeDocuments owner={user.id} />}
        <section id="security" className="panel stack member-section account-controls">
          <h2>Security</h2>
          <div className="account-security-row">
            <div><h3>Password</h3><p>Request a reset link to change your password.</p></div>
            <Link className="button secondary small" href="/forgot-password">Change password</Link>
          </div>
          {!admin && <details><summary>Deactivate account</summary>
            <form className="stack" action={deactivateAccount}>
              <p>Deactivating signs you out and hides your public profile. Contact support to reactivate.</p>
              <label>Type DEACTIVATE to continue<input name="confirm" required pattern="DEACTIVATE" autoComplete="off" /></label>
              <button type="submit" className="button danger">Deactivate account</button>
            </form>
          </details>}
        </section>
      </div>
    </div>}
  </div></div>;
}
