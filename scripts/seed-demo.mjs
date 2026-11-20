import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
if (!url || !["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)) {
  throw new Error("The demo seed requires an independent local Supabase project.");
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, process.env.SUPABASE_SERVICE_KEY, options);
const password = "TradeSeekerzLocal2026!";
const fixtures = [
  { email: "owner@tradeseekerz.test", name: "Mia Thompson", role: "homeowner" },
  { email: "trade@tradeseekerz.test", name: "Liam Taylor", business: "Westside Home & Build", trade: "builders", role: "tradesperson" },
  { email: "plumber@tradeseekerz.test", name: "Aroha Wilson", business: "Kauri Plumbing", trade: "plumbing", role: "tradesperson" },
  { email: "admin@tradeseekerz.test", name: "Trade Seekerz Admin", role: "homeowner", admin: true },
];

function checked(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

const existing = checked(await service.auth.admin.listUsers({ perPage: 1000 })).users;
for (const entry of fixtures) {
  let user = existing.find((item) => item.email === entry.email);
  if (!user) user = checked(await service.auth.admin.createUser({ email: entry.email, password, email_confirm: true })).user;
  const client = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, options);
  checked(await client.auth.signInWithPassword({ email: entry.email, password }));
  checked(await client.rpc("market_action", { command: "onboard", args: {
    display_name: entry.name, role: entry.role, postcode: "1025", business_name: entry.business || "",
    category_slug: entry.trade || "", bio: entry.business ? "Local Auckland tradespeople available for residential projects and repairs." : "",
  } }));
  if (entry.admin) checked(await service.from("admin_grants").upsert({ user_id: user.id }));
  if (entry.email !== fixtures[0].email) continue;

  const current = checked(await client.from("projects").select("title").eq("homeowner_id", user.id));
  const items = [
    { title: "Replace a weathered timber fence", description: "We need a new 12-metre boundary fence along the back garden. Please include removal of the existing fence and an estimate for treated timber.", category_slug: "builders", suburb: "Sandringham", budget_min: 1600, budget_max: 2500 },
    { title: "Repair a leaking kitchen tap", description: "The kitchen mixer is dripping at the base. We’d like an assessment and a replacement if repair isn’t practical.", category_slug: "plumbing", suburb: "Mount Albert", budget_min: 180, budget_max: 350 },
    { title: "Repaint a two-bedroom unit", description: "We’re looking for interior painting of the living space, hallway, and two bedrooms. Please include preparation and two coats.", category_slug: "painting", suburb: "Mount Eden", budget_min: 1800, budget_max: 3400 },
  ];
  for (const item of items) {
    if (!current.some((row) => row.title === item.title)) {
      checked(await client.rpc("market_action", { command: "create_project", args: { ...item, postcode: "1025", applicant_limit: 5 } }));
    }
  }
}
console.log("Seeded local demo accounts and example jobs.");
for (const fixture of fixtures) console.log(fixture.email + " — " + (fixture.admin ? "admin" : fixture.role));
