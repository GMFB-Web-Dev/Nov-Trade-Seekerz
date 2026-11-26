"use server";

import { idSchema } from "@/lib/forms";
import { db } from "@/lib/supabase";

export async function markMessageThreadRead(lastMessageId: string) {
  const parsed = idSchema.safeParse(lastMessageId);
  if (!parsed.success) return false;
  const client = await db();
  const { error } = await client.rpc("mark_message_thread_read", { last_message_id: parsed.data });
  return !error;
}
