import Link from "next/link";
import { register } from "@/app/actions/auth";
import { AuthPanel } from "@/components/auth-panel";
import { Notice } from "@/components/ui";
import { param, type Query } from "@/lib/format";

export const metadata = { title: "Create Account" };

export default async function Register({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  return <AuthPanel title="Create an account" description="Find a tradesperson or grow your trade business.">
    <Notice query={query} />
    <form action={register} className="stack">
      <label>Account type<select name="role" defaultValue={param(query.role) === "tradesperson" ? "tradesperson" : "homeowner"}>
        <option value="homeowner">Homeowner</option><option value="tradesperson">Tradesperson</option>
      </select></label>
      <label>Email address<input name="email" type="email" required autoComplete="email" maxLength={254} /></label>
      <div className="field"><label>Password<input name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" aria-describedby="password-rules" /></label>
        <small className="field-note" id="password-rules">Use at least 8 characters.</small></div>
      <label className="checkbox"><input name="terms" type="checkbox" required /> <span>I accept the <Link href="/terms">Marketplace Terms</Link>.</span></label>
      <button className="button" type="submit">Create account</button>
    </form>
    <p className="form-note">Already a member? <Link href="/login">Sign in</Link></p>
  </AuthPanel>;
}
