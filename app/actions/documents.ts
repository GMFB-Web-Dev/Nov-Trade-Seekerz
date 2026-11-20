"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { failure, idSchema, parse, text } from "@/lib/forms";
import { withNotice } from "@/lib/format";
import { db } from "@/lib/supabase";
import { fileExtension } from "@/lib/upload";
import { administrator, member } from "@/lib/viewer";

const accountPath = "/account";
const adminPath = "/admin/credentials";

export async function addTradeDocument(form: FormData) {
  const { user } = await member("tradesperson");
  const { title } = parse(z.object({ title: text(3, 85) }), form, accountPath);
  const file = form.get("document");
  const extension = file instanceof File ? await fileExtension(file, true) : null;
  if (!(file instanceof File) || !extension) failure(accountPath, "Choose a PDF, JPG, PNG or WebP under 5 MB.");
  const client = await db();
  const files = client.storage.from("trade-documents");
  const object_path = user.id + "/" + crypto.randomUUID() + "." + extension;
  const uploaded = await files.upload(object_path, file, { contentType: file.type, upsert: false });
  if (uploaded.error) failure(accountPath, "Could not upload the document.");
  const record = await client.from("trade_documents").insert({ title, object_path });
  if (record.error) {
    await files.remove([object_path]);
    failure(accountPath, "Could not save the document.");
  }
  redirect(withNotice(accountPath, "success", "Document submitted for review."));
}

async function removeTradeDocument(form: FormData, path: string, owner?: string) {
  const { id } = parse(z.object({ id: idSchema }), form, path);
  const client = await db();
  let request = client.from("trade_documents").select("object_path").eq("id", id);
  if (owner) request = request.eq("owner_id", owner);
  const { data } = await request.maybeSingle();
  if (!data) failure(path, "Document is unavailable.");
  const file = await client.storage.from("trade-documents").remove([data.object_path]);
  if (file.error) failure(path, "Could not remove the file.");
  const removed = await client.from("trade_documents").delete().eq("id", id);
  if (removed.error) failure(path, "The file was removed, but the record could not be cleared. Try again.");
  redirect(withNotice(path, "success", "Document removed."));
}

export async function removeOwnDocument(form: FormData) {
  const { user } = await member("tradesperson");
  await removeTradeDocument(form, accountPath, user.id);
}

export async function removeStaffDocument(form: FormData) {
  await administrator();
  await removeTradeDocument(form, adminPath);
}

export async function reviewTradeDocument(form: FormData) {
  await administrator();
  const { id, decision, reason } = parse(z.object({
    id: idSchema, decision: z.enum(["approved", "declined"]), reason: text(0, 500),
  }), form, adminPath);
  const client = await db();
  const { error } = await client.rpc("review_trade_document", { document_key: id, decision, reason });
  if (error) failure(adminPath, error.code === "P0001" ? error.message : "Could not save the decision.");
  redirect(withNotice(adminPath, "success", "Document review saved."));
}
