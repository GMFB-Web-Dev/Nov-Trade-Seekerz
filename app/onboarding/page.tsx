import { redirect } from "next/navigation";
import { completeProfile } from "@/app/actions/auth";
import { AuthPanel } from "@/components/auth-panel";
import { ProfileFields } from "@/components/profile-fields";
import { Notice } from "@/components/ui";
import type { Query } from "@/lib/format";
import { db } from "@/lib/supabase";
import { signedIn } from "@/lib/viewer";

export const metadata = { title: "Set Up Profile" };

export default async function Onboarding({ searchParams }: { searchParams: Promise<Query> }) {
  const viewer = await signedIn();
  if (viewer.profile?.status !== "active") redirect("/account");
  if (viewer.profile?.onboarded_at) redirect("/dashboard");
  const client = await db();
  const { data: categories } = await client.from("categories").select("slug,name").eq("active", true).order("sort_order");
  const role = viewer.user.user_metadata.onboarding_choice === "tradesperson" ? "tradesperson" : "homeowner";
  return <AuthPanel title="Set up your profile" description="Add your details to start using Trade Seekerz.">
    <Notice query={await searchParams} />
    <form action={completeProfile} className="stack">
      <ProfileFields categories={categories ?? []} profile={{ role }} onboarding />
      <button className="button" type="submit">Finish setup</button>
    </form>
  </AuthPanel>;
}
