import assert from "node:assert/strict";
import { test } from "node:test";
import { action, anonymous, fixture, ok, projectFields, service } from "./local.mjs";

test("database roles, application limit, private files, job lifecycle and moderation", async (t) => {
  const home = await fixture("Fixture homeowner", "homeowner");
  const stranger = await fixture("Fixture stranger", "homeowner");
  const first = await fixture("Fixture trade one", "tradesperson");
  const second = await fixture("Fixture trade two", "tradesperson");
  const admin = await fixture("Fixture admin", "homeowner", true);
  const everyone = [home, stranger, first, second, admin];
  let filePath;
  let report;
  t.after(async () => {
    if (filePath) await service.storage.from("project-photos").remove([filePath]);
    if (report) await service.from("reports").delete().eq("id", report);
    for (const account of everyone) {
      await service.from("audit_log").delete().eq("actor_id", account.id);
      await service.from("token_ledger").delete().eq("user_id", account.id);
      await service.auth.admin.deleteUser(account.id);
    }
  });

  const page = await action(home.client, "create_project", projectFields);
  const privateJob = await action(home.client, "create_project", { ...projectFields, invite: first.id });
  assert.equal((await anonymous().from("projects").select("id").eq("id", page)).error?.code, "42501");
  assert.deepEqual(ok(await stranger.client.from("projects").select("id").eq("id", page)), []);
  assert.deepEqual(ok(await second.client.from("projects").select("id").eq("id", privateJob)), []);
  assert.match((await second.client.rpc("market_action", {
    command: "apply", args: { project_id: privateJob, introduction: "Can help with the whole fence and take the old timber away." },
  })).error?.message || "", /unavailable/);

  filePath = page + "/fixture.png";
  const photo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jYmQAAAAASUVORK5CYII=", "base64");
  ok(await home.client.storage.from("project-photos").upload(filePath, photo, { contentType: "image/png" }));
  await action(home.client, "set_photo", { project_id: page, path: filePath });
  assert.ok(ok(await first.client.storage.from("project-photos").createSignedUrl(filePath, 30)).signedUrl);
  assert.ok((await stranger.client.storage.from("project-photos").createSignedUrl(filePath, 30)).error);
  assert.ok((await first.client.storage.from("project-photos").upload(page + "/invalid.png", photo, { contentType:"image/png" })).error);

  const applying = { project_id: page, introduction: "I can replace the old fence and finish the work in one day." };
  const entry = { command: "apply", args: applying };
  const race = await Promise.all([first.client.rpc("market_action", entry), second.client.rpc("market_action", entry)]);
  assert.equal(race.filter((result) => !result.error).length, 1);
  const winner = race[0].error ? second : first;
  const loser = winner === first ? second : first;
  assert.match((race[0].error || race[1].error).message, /applicant limit/);
  assert.equal(Number(ok(await winner.client.rpc("token_balance"))), 2);
  assert.equal(Number(ok(await loser.client.rpc("token_balance"))), 3);
  assert.match((await winner.client.rpc("market_action", entry)).error?.message || "", /already applied/);
  const application = ok(await winner.client.from("applications").select("*").eq("project_id", page).single());

  await action(winner.client, "quote", { application_id: application.id, amount_cents: 135000, description: "Includes disposal, materials and labour." });
  await action(winner.client, "send_message", { application_id: application.id, body: "I can start on Friday." });
  assert.deepEqual(ok(await stranger.client.from("messages").select("id").eq("application_id", application.id)), []);
  assert.ok((await loser.client.rpc("market_action", { command: "send_message", args: { application_id: application.id, body: "Unrelated account" } })).error);
  await action(home.client, "award", { application_id: application.id, project_id: page });
  await action(home.client, "finish", { project_id: page });
  await action(home.client, "review", { project_id: page, rating: 5, body: "Excellent attention to detail and a tidy finish." });
  assert.equal(ok(await anonymous().from("reviews").select("rating").eq("project_id", page).single()).rating, 5);

  report = await action(home.client, "report", { subject_kind: "project", subject_id: page, reason: "Test report for independent moderation." });
  assert.deepEqual(ok(await stranger.client.from("reports").select("id").eq("id", report)), []);
  await action(admin.client, "admin_report", { report_id: report, status: "resolved", resolution: "Report audited." });
  assert.equal(ok(await admin.client.from("reports").select("status").eq("id", report).single()).status, "resolved");
  assert.ok((await stranger.client.rpc("list_accounts", { search_term: "", account_filter: "", first_row: 0, row_limit: 10 })).error);
  await action(admin.client, "admin_user", { user_id: winner.id, operation: "banned" });
  assert.deepEqual(ok(await winner.client.from("projects").select("id").eq("id", page)), []);
  assert.ok((await winner.client.rpc("market_action", { command: "send_message", args: { application_id: application.id, body: "Banned account" } })).error);
  await action(admin.client, "admin_user", { user_id: winner.id, operation: "active" });
  assert.equal(Number(ok(await winner.client.rpc("token_balance"))), 2);

  await action(admin.client, "admin_user", { user_id: stranger.id, operation: "grant" });
  await action(admin.client, "admin_user", { user_id: stranger.id, operation: "revoke" });
  assert.equal(ok(await service.auth.admin.getUserById(stranger.id)).user.id, stranger.id);
  await action(admin.client, "admin_user", { user_id: stranger.id, operation: "deactivated" });
  assert.ok((await admin.client.rpc("market_action", {
    command: "admin_user", args: { user_id: stranger.id, operation: "delete", confirm: "wrong" },
  })).error);
  await action(admin.client, "admin_user", { user_id: stranger.id, operation: "delete", confirm: "DELETE" });
  assert.ok((await service.auth.admin.getUserById(stranger.id)).error);
});

test("billing events are transactional and cannot double-credit purchases", async (t) => {
  const trade = await fixture("Fixture billing", "tradesperson");
  const order = await action(trade.client, "new_order", { product: "credits-20", provider: "local" });
  const ref = "fixture-payment:" + order;
  const events = [];
  const payload = {
    order_key: order, payment_ref: ref, billing_provider: "local",
    event_kind: "paid", total_cents: 2000, currency_code: "nzd",
  };
  const event = async (suffix, changes = {}) => {
    const key = "fixture:" + order + ":" + suffix;
    events.push(key);
    return service.rpc("record_billing_event", { ...payload, event_key: key, ...changes });
  };
  t.after(async () => {
    await service.from("stripe_webhook_events").delete().in("id", events);
    await service.from("billing_payments").delete().eq("order_id", order);
    await service.from("token_ledger").delete().eq("user_id", trade.id);
    await service.from("billing_orders").delete().eq("id", order);
    await service.auth.admin.deleteUser(trade.id);
  });

  assert.ok((await trade.client.rpc("record_billing_event", { ...payload, event_key: "forbidden:" + order })).error);
  assert.ok((await event("paid", { currency_code: "usd" })).error);
  assert.equal(Number(ok(await trade.client.rpc("token_balance"))), 3);

  const results = await Promise.all([event("paid"), event("paid"), event("second")]);
  assert.equal(results.map(ok).filter(Boolean).length, 1);
  assert.equal(Number(ok(await trade.client.rpc("token_balance"))), 23);
  assert.equal(ok(await event("partial", { event_kind: "refunded", total_cents: 750 })), true);
  assert.equal(Number(ok(await trade.client.rpc("token_balance"))), 16);
  assert.equal(ok(await event("dispute", { event_kind: "disputed", total_cents: 2000 })), true);
  assert.equal(Number(ok(await trade.client.rpc("token_balance"))), 3);
  assert.equal(ok(await event("won", { event_kind: "dispute_won", total_cents: 750 })), true);
  assert.equal(Number(ok(await trade.client.rpc("token_balance"))), 16);
  assert.equal(ok(await event("refund", { event_kind: "refunded", total_cents: 2000 })), true);
  assert.equal(ok(await event("refund", { event_kind: "refunded", total_cents: 2000 })), false);
  assert.equal(Number(ok(await trade.client.rpc("token_balance"))), 3);
});

test("tradies can replace their category selections while legacy profiles keep their trade", async (t) => {
  const trade = await fixture("Fixture multi-trade", "tradesperson");
  t.after(async () => {
    await service.from("token_ledger").delete().eq("user_id", trade.id);
    ok(await service.auth.admin.deleteUser(trade.id));
  });
  const homeowner = await fixture("Fixture categories homeowner", "homeowner");
  t.after(async () => {
    ok(await service.auth.admin.deleteUser(homeowner.id));
  });

  const categorySlugs = async (client, id) =>
    ok(await client.from("profile_trade_categories").select("category_slug").eq("profile_id", id).order("category_slug"))
      .map(({ category_slug }) => category_slug);
  const publicClient = anonymous();
  const profile = { display_name: "Fixture multi-trade", business_name: "Fixture Building", postcode: "1025" };
  assert.deepEqual(await categorySlugs(publicClient, trade.id), ["builders"]);

  await action(trade.client, "profile", { ...profile, category_slugs: ["plumbing", "builders"] });
  assert.deepEqual(await categorySlugs(publicClient, trade.id), ["builders", "plumbing"]);
  assert.equal(ok(await publicClient.from("profiles").select("category_slug").eq("id", trade.id).single()).category_slug, "builders");

  for (const category_slugs of [[], ["builders", "missing-trade"], ["builders", "builders"]]) {
    const result = await trade.client.rpc("market_action", { command: "profile", args: { ...profile, category_slugs } });
    assert.ok(result.error, "Invalid selections should be rejected");
  }
  assert.deepEqual(await categorySlugs(publicClient, trade.id), ["builders", "plumbing"]);

  await action(trade.client, "profile", { ...profile, category_slugs: ["roofing"] });
  assert.deepEqual(await categorySlugs(publicClient, trade.id), ["roofing"]);
  assert.equal(ok(await publicClient.from("profiles").select("category_slug").eq("id", trade.id).single()).category_slug, "roofing");
  assert.ok((await trade.client.from("profile_trade_categories").insert({
    profile_id: trade.id, category_slug: "painting",
  })).error, "Category edits require profile validation");

  await action(homeowner.client, "profile", { ...profile, role: "tradesperson", category_slugs: ["builders"] });
  assert.deepEqual(await categorySlugs(homeowner.client, homeowner.id), []);
  assert.equal(ok(await homeowner.client.from("profiles").select("role").eq("id", homeowner.id).single()).role, "homeowner");
});
