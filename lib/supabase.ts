import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { serviceKey, supabaseEnv } from "./env";

export async function db() {
  const jar = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(patches) {
        try {
          for (const { name, value, options } of patches) jar.set(name, value, options);
        } catch {
          // The proxy refreshes cookies during Server Component requests.
        }
      },
    },
  });
}

export function serviceDb() {
  return createClient<Database>(supabaseEnv().url, serviceKey(), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
