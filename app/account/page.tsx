import Link from "next/link";
import { deactivateAccount, logout, saveProfile } from "@/app/actions/auth";
import { TradeDocuments } from "@/components/trade-documents";
import { ProfileFields } from "@/components/profile-fields";
import { Notice, PageTitle, Tag } from "@/components/ui";
import { type Query } from "@/lib/format";
import { db } from "@/lib/supabase";
import { signedIn } from "@/lib/viewer";

export const metadata = { title: "Account" };

export default async function Account({ searchParams }: { searchParams: Promise<Query> }) {
  const { user, profile, admin } = await signedIn();
  const client = await db();
  const { data: categories } = await client.from("categories").select("slug,name").eq("active", true).order("sort_order");
  return <div className="container narrow page">
    <PageTitle title="Your account" description={user.email} action={<form action={logout}><button className="button secondary">Sign out</button></form>} />
    <Notice query={await searchParams} />
    {profile?.status !== "active" ? <div className="panel"><Tag value={profile?.status || "unavailable"} /><h2>Account access is restricted</h2><p>Contact support for help restoring access.</p><Link href="/contact" className="button">Contact support</Link></div>
      : !profile.onboarded_at ? <div className="panel"><h2>Finish setting up your profile</h2><Link href="/onboarding" className="button">Complete setup</Link>{admin && <Link href="/admin" className="button secondary">Open admin</Link>}</div>
      : <>
        <form action={saveProfile} className="panel stack">
          <h2>Profile details</h2>
          <ProfileFields categories={categories ?? []} profile={profile} />
          <button className="button">Save profile</button>
        </form>
        {profile.role === "tradesperson" && <TradeDocuments owner={user.id} />}
        <div className="panel account-controls">
          <h2>Account controls</h2>
          <Link className="inline-link" href="/forgot-password">Change your password</Link>
          {!admin && <details><summary>Deactivate account</summary>
            <form className="stack" action={deactivateAccount}>
              <p>Deactivating signs you out and hides your public profile. Contact support to reactivate.</p>
              <label>Type DEACTIVATE to continue<input name="confirm" required pattern="DEACTIVATE" autoComplete="off" /></label>
              <button type="submit" className="button danger">Deactivate account</button>
            </form>
          </details>}
        </div>
      </>}
  </div>;
}
