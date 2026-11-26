import { redirect } from "next/navigation";
import { completeProfile } from "@/app/actions/auth";
import { AuthPanel } from "@/components/auth-panel";
import { ProfileFields } from "@/components/profile-fields";
import { Notice } from "@/components/ui";
import { param, type Query } from "@/lib/format";
import { jobJourney } from "@/lib/job-journey";
import { db } from "@/lib/supabase";
import { signedIn } from "@/lib/viewer";

export const metadata = { title: "Set Up Profile" };

export default async function Onboarding({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const requestedJourney = jobJourney(param(query.next));
  const viewer = await signedIn(requestedJourney?.href);
  if (viewer.profile?.status !== "active") redirect("/account");
  if (viewer.profile?.onboarded_at) {
    redirect(requestedJourney?.role === viewer.profile.role ? requestedJourney.href : "/dashboard");
  }
  const client = await db();
  const { data: categories } = await client.from("categories").select("slug,name").eq("active", true).order("sort_order");
  const journey = requestedJourney ?? jobJourney(viewer.user.user_metadata.onboarding_return);
  const role = journey?.role ?? (viewer.user.user_metadata.onboarding_choice === "tradesperson" ? "tradesperson" : "homeowner");
  return <AuthPanel title="Set up your profile" description="Add your details to start using Trade Seekerz.">
    <Notice query={query} />
    <form action={completeProfile} className="stack">
      <input type="hidden" name="next" value={journey?.href ?? ""} />
      <ProfileFields categories={categories ?? []} profile={{ role }} onboarding />
      <button className="button" type="submit">Finish setup</button>
    </form>
  </AuthPanel>;
}
