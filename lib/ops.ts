import "server-only";
import { serviceDb } from "./supabase";

export async function operationalError(scope: string, errorCode: string) {
  const code = errorCode.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 60) || "unknown";
  console.error(scope, { code });
  try {
    await serviceDb().from("system_errors").insert({ scope, code });
  } catch {
    // The process log remains available if the database is unreachable.
  }
}
