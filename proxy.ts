import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

export async function proxy(request: NextRequest) {
  if (!request.cookies.getAll().some(({ name }) => name.startsWith("sb-"))) {
    return NextResponse.next({ request });
  }
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(patches) {
        for (const { name, value } of patches) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of patches) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/|images/|fonts/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|woff2)$).*)"],
};
