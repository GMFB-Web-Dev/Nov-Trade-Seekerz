"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deliverNotifications } from "@/lib/email";
import { email, failure, idSchema, int, marketCommand, mutate, parse, postcode, slugSchema, text } from "@/lib/forms";
import { inboxPath, withNotice } from "@/lib/format";
import { jobJourney } from "@/lib/job-journey";
import { db } from "@/lib/supabase";
import { fileExtension } from "@/lib/upload";
import { member } from "@/lib/viewer";

const projectFields = z.object({
  title: text(6, 100), description: text(20, 3000), suburb: text(2, 100), postcode,
  category_slug: slugSchema, budget_min: int(0, 10000000), budget_max: int(0, 10000000),
  applicant_limit: int(1, 10),
}).refine((fields) => fields.budget_max >= fields.budget_min);

async function projectPhoto(id: string, file: FormDataEntryValue | null, previous?: string | null) {
  if (!(file instanceof File) || !file.size) return true;
  const extension = await fileExtension(file);
  if (!extension) return false;
  const client = await db();
  const bucket = client.storage.from("project-photos");
  const path = id + "/" + crypto.randomUUID() + "." + extension;
  const upload = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) return false;
  const saved = await client.rpc("market_action", { command: "set_photo", args: { path, project_id: id } });
  if (saved.error) {
    await bucket.remove([path]);
    return false;
  }
  if (previous) await bucket.remove([previous]);
  return true;
}

function notify() {
  after(deliverNotifications);
}

function projectPath(id: string) {
  return "/projects/" + id;
}

function projectReturnPath(id: string, from: FormDataEntryValue | null) {
  const journey = jobJourney(from);
  return projectPath(id) + (journey?.role === "tradesperson" ? "?" + new URLSearchParams({ from: journey.href }) : "");
}

export async function createProject(_previousError: string | null, form: FormData) {
  await member("homeowner");
  const fields = projectFields.safeParse(Object.fromEntries(form.entries()));
  const invite = z.union([idSchema, z.literal("")]).safeParse(form.get("invite") ?? "");
  if (!fields.success || !invite.success) return "Check your job and listing details, then try again.";
  const result = await marketCommand("create_project", { ...fields.data, invite: invite.data });
  if (result.error !== null) return result.error;
  const photoAdded = await projectPhoto(result.data, form.get("photo"));
  notify();
  redirect(withNotice(projectPath(result.data), photoAdded ? "success" : "error",
    photoAdded ? "Job posted." : "Job posted. Upload a JPG, PNG, or WebP under 5 MB to add a photo."));
}

export async function editProject(form: FormData) {
  await member("homeowner");
  const { id } = parse(z.object({ id: idSchema }), form, "/dashboard");
  const back = projectPath(id) + "/edit";
  const fields = parse(projectFields, form, back);
  const client = await db();
  const { data: project } = await client.from("projects").select("photo_path").eq("id", id).maybeSingle();
  await mutate("edit_project", { ...fields, project_id: id }, back);
  const photoAdded = await projectPhoto(id, form.get("photo"), project?.photo_path);
  redirect(withNotice(projectPath(id), photoAdded ? "success" : "error",
    photoAdded ? "Job updated." : "Job updated. Please choose a valid photo under 5 MB."));
}

export async function applyToProject(form: FormData) {
  await member("tradesperson");
  const { id } = parse(z.object({ id: idSchema }), form, "/jobs");
  const back = projectReturnPath(id, form.get("from"));
  const { introduction } = parse(z.object({ introduction: text(10, 2000) }), form, back);
  await mutate("apply", { project_id: id, introduction }, back);
  notify();
  redirect(withNotice(back, "success", "Application sent. You can now submit a quote."));
}

export async function quoteProject(form: FormData) {
  await member("tradesperson");
  const { id, application_id } = parse(z.object({ id: idSchema, application_id: idSchema }), form, "/dashboard");
  const back = projectReturnPath(id, form.get("from"));
  const input = parse(z.object({ amount: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/)
    .transform(Number).pipe(z.number().min(1).max(10000000)), description: text(10, 2000) }), form, back);
  await mutate("quote", { application_id, amount_cents: Math.round(input.amount * 100), description: input.description }, back);
  notify();
  redirect(withNotice(back, "success", "Quote shared with the homeowner."));
}

export async function changeProject(form: FormData) {
  await member("homeowner");
  const { id, operation, application_id } = parse(z.object({
    id: idSchema, operation: z.enum(["award", "finish", "cancel"]), application_id: idSchema.optional(),
  }), form, "/dashboard");
  const back = projectPath(id);
  if (operation === "award" && !application_id) failure(back);
  await mutate(operation, { project_id: id, application_id }, back);
  notify();
  redirect(withNotice(back, "success", { award: "Quote accepted and job awarded.", finish: "Job completed.", cancel: "Job cancelled." }[operation]));
}

export async function withdrawApplication(form: FormData) {
  await member("tradesperson");
  const { id, application_id } = parse(z.object({ id: idSchema, application_id: idSchema }), form, "/dashboard");
  const back = projectReturnPath(id, form.get("from"));
  await mutate("withdraw", { application_id }, back);
  redirect(withNotice(back, "success", "Application withdrawn."));
}

export async function sendMessage(form: FormData) {
  const client = await db();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/login");
  const { id, application_id, inbox, inbox_page } = parse(z.object({
    id: idSchema, application_id: idSchema, inbox: z.literal("1").optional(), inbox_page: int(1, 200).optional(),
  }), form, "/messages");
  const back = inbox ? inboxPath(application_id, inbox_page) : projectReturnPath(id, form.get("from"));
  const { body } = parse(z.object({ body: text(1, 3000) }), form, back);
  // The command verifies the account status, onboarding, and conversation membership.
  await mutate("send_message", { application_id, body }, back);
  redirect(withNotice(back, "success", "Message sent."));
}

export async function leaveReview(form: FormData) {
  await member("homeowner");
  const { id } = parse(z.object({ id: idSchema }), form, "/dashboard");
  const back = projectPath(id);
  const { rating, body } = parse(z.object({ rating: int(1, 5), body: text(12, 1200) }), form, back);
  await mutate("review", { project_id: id, rating, body }, back);
  notify();
  redirect(withNotice(back, "success", "Review published."));
}

export async function reportContent(form: FormData) {
  await member();
  const input = parse(z.object({
    id: idSchema, subject_id: idSchema, subject_kind: z.enum(["project", "tradesperson", "message", "review"]),
    inbox_application: idSchema.optional(), inbox_page: int(1, 200).optional(),
  }), form, "/dashboard");
  let back = projectReturnPath(input.id, form.get("from"));
  if (input.subject_kind === "message" && input.inbox_application) back = inboxPath(input.inbox_application, input.inbox_page);
  if (input.subject_kind === "tradesperson" || input.subject_kind === "review") back = "/trades/" + input.id;
  const { reason } = parse(z.object({ reason: text(12, 1500) }), form, back);
  await mutate("report", { subject_id: input.subject_id, subject_kind: input.subject_kind, reason }, back);
  redirect(withNotice(back, "success", "Report sent for review."));
}

export async function markNotificationsRead() {
  await member();
  await mutate("read_notifications", {}, "/dashboard");
  refresh();
  redirect("/dashboard");
}

export async function submitContact(form: FormData) {
  const path = "/contact";
  const result = withNotice(path, "success", "Your message has been sent.");
  if (form.get("website")) redirect(result);
  const input = parse(z.object({ name: text(2, 100), email, message: text(12, 2000) }), form, path);
  const client = await db();
  const { error } = await client.rpc("submit_contact", { sender_name: input.name, sender_email: input.email, body: input.message });
  if (error) failure(path, error.code === "P0001" ? error.message : "Could not send the message. Try again shortly.");
  redirect(result);
}
