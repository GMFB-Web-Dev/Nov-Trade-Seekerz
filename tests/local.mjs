import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const url = process.env.SUPABASE_URL;
const site = process.env.APP_URL || "http://127.0.0.1:3000";

function protect(value) {
  if (!value || !["127.0.0.1", "localhost", "[::1]"].includes(new URL(value).hostname)) {
    throw new Error("Tests require loopback services. Run npm run db:start.");
  }
  return value;
}

export const app = protect(site);
export const mailpit = protect(process.env.MAILPIT_WEB_URL || "http://127.0.0.1:55424");
export const service = createClient(protect(url), process.env.SUPABASE_SERVICE_KEY, options);
export const anonymous = () => createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, options);
export const testEmail = () => "fixture-" + randomUUID().slice(0, 12) + "@tradeseekerz.test";
export const password = "FixtureReady26!A";

export function ok(response) {
  assert.equal(response.error, null, response.error?.message);
  return response.data;
}

export async function action(client, command, args = {}) {
  return ok(await client.rpc("market_action", { command, args }));
}

export async function fixture(name, role, staff = false) {
  const email = testEmail();
  const { user } = ok(await service.auth.admin.createUser({ email, password, email_confirm: true }));
  const client = anonymous();
  ok(await client.auth.signInWithPassword({ email, password }));
  await action(client, "onboard", {
    role, display_name: name, postcode: "1025",
    business_name: role === "tradesperson" ? name + " Trade Services" : "",
    category_slug: role === "tradesperson" ? "builders" : "",
  });
  if (staff) ok(await service.from("admin_grants").insert({ user_id: user.id }));
  return { id: user.id, email, client };
}

export const projectFields = {
  title: "Replace a timber side fence", description: "Remove the old timber and replace the boundary fence with treated materials.",
  suburb: "Sandringham", postcode: "1025", category_slug: "builders",
  budget_min: 1000, budget_max: 1900, applicant_limit: 1,
};
