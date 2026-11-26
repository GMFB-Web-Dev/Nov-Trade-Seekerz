import { db } from "@/lib/supabase";
import { getViewer } from "@/lib/viewer";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const viewer = await getViewer();
  if (viewer?.profile?.status !== "active" || !viewer.profile.onboarded_at) {
    return Response.json({ userId: null, messages: false, jobs: false }, { headers });
  }

  const client = await db();
  const userId = viewer.user.id;
  const [messages, jobs] = await Promise.all([
    client.from("messages").select("id").eq("recipient_id", userId).is("read_at", null).limit(1),
    client.from("notifications").select("id").eq("user_id", userId).is("read_at", null).limit(1),
  ]);
  if (messages.error || jobs.error) {
    return Response.json({ error: "Could not load unread activity." }, { status: 503, headers });
  }

  return Response.json({ userId, messages: messages.data.length > 0, jobs: jobs.data.length > 0 }, { headers });
}
