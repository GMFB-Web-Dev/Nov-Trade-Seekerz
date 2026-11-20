import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthPanel } from "@/components/auth-panel";
import { Notice } from "@/components/ui";
import { param, type Query } from "@/lib/format";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Sign In" };

export default async function Login({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  if (await getViewer()) redirect("/dashboard");
  return <AuthPanel title="Welcome back" description="Sign in to your Trade Seekerz account.">
    <Notice query={query} />
    <form action={login} className="stack">
      <input type="hidden" name="next" value={param(query.next)} />
      <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
      <Link className="inline-link" href="/forgot-password">Forgot password?</Link>
      <button className="button" type="submit">Sign in</button>
    </form>
    <p className="form-note">New here? <Link href="/register">Create an account</Link></p>
  </AuthPanel>;
}
