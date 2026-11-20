"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { failure, idSchema, mutate, parse, slugSchema, text } from "@/lib/forms";
import { withNotice } from "@/lib/format";
import { db } from "@/lib/supabase";
import { administrator } from "@/lib/viewer";
import { deliverNotifications } from "@/lib/email";

export async function changeUser(form: FormData) {
  await administrator();
  const { id, operation, confirm, section } = parse(z.object({
    id: idSchema,
    operation: z.enum(["active", "banned", "deactivated", "grant", "revoke", "delete"]),
    confirm: z.string().optional(),
    section: z.enum(["users", "banned", "admins"]).default("users"),
  }), form, "/admin/users");
  const path = "/admin/" + section;
  await mutate("admin_user", { user_id: id, operation, confirm }, path);
  redirect(withNotice(path, "success", "Account updated."));
}

export async function moderateReport(form: FormData) {
  await administrator();
  const path = "/admin/reports";
  const { id, status, resolution } = parse(z.object({
    id: idSchema, status: z.enum(["open","in_review","resolved","dismissed"]), resolution: text(0, 1500),
  }), form, path);
  await mutate("admin_report", { report_id: id, status, resolution }, path);
  redirect(withNotice(path, "success", "Moderation decision saved."));
}

export async function manageCategory(form: FormData) {
  await administrator();
  const path = "/admin/categories";
  const input = parse(z.object({ slug: slugSchema, name: text(2, 60), active: z.enum(["true","false"]) }), form, path);
  await mutate("admin_category", { ...input, active: input.active === "true" }, path);
  redirect(withNotice(path, "success", "Category saved."));
}

export async function moderateProject(form: FormData) {
  await administrator();
  const back = "/admin/projects";
  const { id, operation } = parse(z.object({ id: idSchema, operation: z.enum(["clear_photo","cancel"]) }), form, back);
  if (operation === "clear_photo") {
    const client = await db();
    const { data, error } = await client.from("projects").select("photo_path").eq("id", id).single();
    if (error) failure(back, "Job not found.");
    if (data.photo_path) {
      const removed = await client.storage.from("project-photos").remove([data.photo_path]);
      if (removed.error) failure(back, "Could not remove this photo.");
    }
  }
  await mutate("admin_project", { project_id: id, operation }, back);
  redirect(withNotice(back, "success", "Job updated."));
}

export async function moderateReview(form: FormData) {
  await administrator();
  const path = "/admin/reviews";
  const { id, visible } = parse(z.object({ id: idSchema, visible: z.enum(["true","false"]) }), form, path);
  await mutate("admin_review", { review_id: id, visible: visible === "true" }, path);
  redirect(withNotice(path, "success", "Review visibility updated."));
}

export async function retryNotifications() {
  await administrator();
  await deliverNotifications();
  redirect(withNotice("/admin/settings", "success", "Due notifications processed."));
}
