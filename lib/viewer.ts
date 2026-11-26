import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { jobJourneyLink } from "./job-journey";
import { db } from "./supabase";

export const getViewer = cache(async () => {
  const client = await db();
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  const [profile, grant] = await Promise.all([
    client.from("profiles").select("*").eq("id", data.user.id).maybeSingle(),
    client.from("admin_grants").select("user_id").eq("user_id", data.user.id).maybeSingle(),
  ]);
  if (profile.error || grant.error) throw new Error("Unable to load your account.");
  return { user: data.user, profile: profile.data, admin: Boolean(grant.data && profile.data?.status === "active") };
});

export async function signedIn(next?: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(jobJourneyLink("/login", next));
  return viewer;
}

export async function member(role?: "homeowner" | "tradesperson", next?: string) {
  const viewer = await signedIn(next);
  if (viewer.profile?.status !== "active") redirect("/account");
  if (!viewer.profile?.onboarded_at) redirect(jobJourneyLink("/onboarding", next));
  if (role && viewer.profile.role !== role) redirect("/dashboard?error=This+page+is+for+the+other+account+type.");
  return { ...viewer, profile: viewer.profile };
}

export async function administrator() {
  const viewer = await signedIn();
  if (!viewer.admin) redirect("/dashboard?error=Administration+access+is+required.");
  return viewer;
}
