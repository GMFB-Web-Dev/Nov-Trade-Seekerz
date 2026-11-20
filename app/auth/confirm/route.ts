import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { db } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (!tokenHash || !["email", "recovery"].includes(type || "")) {
    return NextResponse.redirect(new URL("/login?error=That+link+is+missing+or+invalid.", appUrl()));
  }
  const client = await db();
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: type === "recovery" ? "recovery" : "email" });
  if (error) return NextResponse.redirect(new URL("/login?error=That+link+expired.+Request+a+new+one.", appUrl()));
  return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : "/onboarding", appUrl()));
}
