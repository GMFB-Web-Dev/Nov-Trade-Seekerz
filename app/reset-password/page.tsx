import { resetPassword } from "@/app/actions/auth";
import { AuthPanel } from "@/components/auth-panel";
import { Notice } from "@/components/ui";
import type { Query } from "@/lib/format";
import { signedIn } from "@/lib/viewer";

export const metadata = { title: "Reset Password" };

export default async function ResetPassword({ searchParams }: { searchParams: Promise<Query> }) {
  await signedIn();
  return <AuthPanel title="Set a new password">
    <Notice query={await searchParams} />
    <form action={resetPassword} className="stack">
      <label>New password<input type="password" name="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
      <label>Confirm password<input type="password" name="confirm" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
      <button className="button" type="submit">Update password</button>
    </form>
  </AuthPanel>;
}
