"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/env";
import { email, failure, mutate, parse, postcode, safePath, text } from "@/lib/forms";
import { withNotice } from "@/lib/format";
import { db } from "@/lib/supabase";

const credentials = z.object({ email, password: z.string().min(8).max(128) });
const role = z.enum(["homeowner", "tradesperson"]);
const profileSchema = z.object({
  display_name: text(2, 100),
  postcode,
  business_name: text(0, 120),
  category_slug: text(0, 60),
  bio: text(0, 1500),
});

export async function register(form: FormData) {
  const input = parse(credentials.extend({ role, terms: z.literal("on") }), form, "/register");
  const client = await db();
  const { error } = await client.auth.signUp({
    email: input.email, password: input.password,
    options: { emailRedirectTo: appUrl() + "/auth/confirm", data: { onboarding_choice: input.role } },
  });
  if (error) failure("/register", error.status === 429 ? "Wait a moment before trying again." : "Could not create an account. Use a valid email and a strong password.");
  redirect(withNotice("/login", "success", "Check your email for a verification link. Then sign in to finish your profile."));
}

export async function login(form: FormData) {
  const input = parse(credentials, form, "/login");
  const client = await db();
  const { error } = await client.auth.signInWithPassword(input);
  if (error) failure("/login", error.code === "email_not_confirmed"
    ? "Verify your email before signing in."
    : "Couldn’t sign in. Check your email and password.");
  redirect(safePath(form.get("next"), "/dashboard"));
}

export async function logout() {
  const client = await db();
  await client.auth.signOut({ scope: "local" });
  redirect("/");
}

export async function forgotPassword(form: FormData) {
  const input = parse(z.object({ email }), form, "/forgot-password");
  const client = await db();
  await client.auth.resetPasswordForEmail(input.email, { redirectTo: appUrl() + "/auth/confirm" });
  redirect(withNotice("/forgot-password", "success", "If an account exists for that address, you’ll receive a password reset link."));
}

export async function resetPassword(form: FormData) {
  const input = parse(z.object({ password: z.string().min(8).max(128), confirm: z.string() })
    .refine((data) => data.password === data.confirm), form, "/reset-password");
  const client = await db();
  const result = await client.auth.updateUser({ password: input.password });
  if (result.error) failure("/reset-password", "The recovery session may have expired. Request a new link.");
  await client.auth.signOut({ scope: "global" });
  redirect(withNotice("/login", "success", "Password updated. Sign in with your new password."));
}

export async function completeProfile(form: FormData) {
  const input = parse(profileSchema.extend({ role }), form, "/onboarding");
  await mutate("onboard", input, "/onboarding");
  redirect(withNotice("/dashboard", "success", "Your account is ready."));
}

export async function saveProfile(form: FormData) {
  const input = parse(profileSchema, form, "/account");
  await mutate("profile", input, "/account");
  redirect(withNotice("/account", "success", "Profile saved."));
}

export async function deactivateAccount(form: FormData) {
  parse(z.object({ confirm: z.literal("DEACTIVATE") }), form, "/account");
  await mutate("leave", {}, "/account");
  const client = await db();
  await client.auth.signOut({ scope: "global" });
  redirect(withNotice("/login", "success", "Your account has been deactivated."));
}
