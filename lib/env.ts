import "server-only";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Missing " + name + ". Run npm run db:start for local setup.");
  return value;
}

export function isLoopback(value: string) {
  return ["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname);
}

export function appUrl() {
  const url = new URL(process.env.APP_URL || "http://127.0.0.1:3000");
  if (url.protocol !== "https:" && (url.protocol !== "http:" || !isLoopback(url.href))) {
    throw new Error("APP_URL must use HTTPS or loopback HTTP.");
  }
  return url.origin;
}

export function supabaseEnv() {
  const url = required("SUPABASE_URL");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && (parsed.protocol !== "http:" || !isLoopback(url))) {
    throw new Error("SUPABASE_URL must use HTTPS or loopback HTTP.");
  }
  return { url: parsed.origin, key: required("SUPABASE_PUBLISHABLE_KEY") };
}

export function serviceKey() {
  return process.env.SUPABASE_SERVICE_KEY?.trim() || required("SUPABASE_SECRET_KEY");
}

export function sandboxEnabled() {
  return process.env.LOCAL_TEST_BILLING === "1" && isLoopback(appUrl()) && isLoopback(supabaseEnv().url);
}

export function liveIntegrationsEnabled() {
  return process.env.LIVE_INTEGRATIONS === "1" && !isLoopback(appUrl());
}
