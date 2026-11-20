import Link from "next/link";
import { forgotPassword } from "@/app/actions/auth";
import { AuthPanel } from "@/components/auth-panel";
import { Notice } from "@/components/ui";
import type { Query } from "@/lib/format";

export const metadata = { title: "Forgot Password" };

export default async function ForgotPassword({ searchParams }: { searchParams: Promise<Query> }) {
  return <AuthPanel title="Forgot your password?" description="We’ll email you a link to set a new one.">
    <Notice query={await searchParams} />
    <form action={forgotPassword} className="stack">
      <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
      <button className="button" type="submit">Send reset link</button>
      <Link href="/login">Back to sign in</Link>
    </form>
  </AuthPanel>;
}
