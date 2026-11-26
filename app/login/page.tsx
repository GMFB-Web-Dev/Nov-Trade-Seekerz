import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthPanel } from "@/components/auth-panel";
import { Notice } from "@/components/ui";
import { param, type Query } from "@/lib/format";
import { jobJourney, jobJourneyLink } from "@/lib/job-journey";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Sign In" };

export default async function Login({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const next = param(query.next);
  const journey = jobJourney(next);
  if (await getViewer()) redirect(journey?.href ?? "/dashboard");
  const description = journey
    ? journey.role === "homeowner" ? "Sign in to post a job." : "Sign in to find jobs for your trade."
    : "Sign in to your Trade Seekerz account.";
  return <AuthPanel title="Welcome back" description={description}>
    <Notice query={query} />
    <form action={login} className="stack">
      <input type="hidden" name="next" value={next} />
      <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
      <Link className="inline-link" href="/forgot-password">Forgot password?</Link>
      <button className="button" type="submit">Sign in</button>
    </form>
    <p className="form-note">New here? <Link href={jobJourneyLink("/register", journey?.href)}>Create an account</Link></p>
  </AuthPanel>;
}
