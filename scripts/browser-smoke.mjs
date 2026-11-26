import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { app, fixture, mailpit, ok, password, service, testEmail } from "../tests/local.mjs";

const browser = await chromium.launch();
const contexts = [];
const users = [];
const screenshots = ".local/visual";
await mkdir(screenshots, { recursive: true });

async function page() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  contexts.push(context);
  const current = await context.newPage();
  current.setDefaultTimeout(12000);
  return current;
}

async function visit(current, path) {
  await current.goto(app + path, { waitUntil: "networkidle", timeout: 60000 });
  await current.locator("main h1").first().waitFor({ state: "visible" });
}

async function text(current, name) {
  await current.getByText(name, { exact: true }).first().waitFor({ state: "visible" });
}

async function login(current, email, secret = password) {
  await visit(current, "/login");
  await current.getByLabel("Email address").fill(email);
  await current.getByLabel("Password", { exact: true }).fill(secret);
  await current.getByRole("button", { name: "Sign in", exact: true }).click();
  await current.waitForURL(/\/dashboard/, { timeout: 30000 });
}

async function mailFor(address, subjectPart) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const response = await fetch(mailpit + "/api/v1/messages");
    const data = await response.json();
    const note = (data.messages || []).find((item) =>
      item.Subject.includes(subjectPart) && item.To?.some((addressItem) => addressItem.Address === address));
    if (note) {
      const response = await fetch(mailpit + "/api/v1/message/" + note.ID);
      return response.json();
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("Expected local email did not arrive: " + subjectPart);
}

function linkIn(message) {
  const url = message.HTML?.match(/href="(http[^"]+)"/)?.[1].replaceAll("&amp;", "&");
  assert.ok(url && url.startsWith(app + "/auth/confirm?"), "Expected a local verification link");
  return url;
}

async function register(current, name, role) {
  const email = testEmail();
  users.push(email);
  await visit(current, "/register?role=" + role);
  await current.getByLabel("Email address").fill(email);
  await current.getByLabel("Password", { exact: true }).fill(password);
  await current.getByRole("checkbox").check();
  await current.getByRole("button", { name: "Create account", exact: true }).click();
  await text(current, "Check your email for a verification link. Then sign in to finish your profile.");
  const verification = await mailFor(email, "Verify your Trade Seekerz email");
  await current.goto(linkIn(verification));
  await current.getByRole("heading", { name: "Set up your profile", exact: true }).waitFor();
  await current.getByLabel("Full name").fill(name);
  await current.getByLabel("Postcode").fill("1025");
  if (role === "tradesperson") {
    await current.getByLabel("Business name").fill("Browser Smoke Building");
    await current.getByLabel("Trade category").selectOption("builders");
    await current.getByLabel("About your business").fill("Local building and fencing work.");
  }
  await current.getByRole("button", { name: "Finish setup", exact: true }).click();
  await text(current, "Your account is ready.");
  return email;
}

async function responsive(current, path, title, filename) {
  await visit(current, path);
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await current.setViewportSize({ width, height: 900 });
    await current.evaluate(() => document.fonts.ready);
    const dimensions = await current.evaluate(() => ({
      width: window.innerWidth, scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(dimensions.scroll <= dimensions.width + 1, title + " overflows at " + width + "px");
    assert.equal((await current.locator("main h1").first().innerText()).replace(/\s+/g," ").trim(), title);
    if (width === 390 || width === 1440) await current.screenshot({ path: screenshots + "/" + filename + "-" + width + ".png" });
  }
}

try {
  const home = await page();
  const trades = await page();
  const admin = await page();
  const publicPage = await page();
  await visit(publicPage, "/admin");
  await publicPage.waitForURL(/\/login/);
  await publicPage.getByRole("heading", { name: "Welcome back", exact: true }).waitFor();

  const homeownerEmail = await register(home, "Browser Owner", "homeowner");
  const tradeEmail = await register(trades, "Browser Tradie", "tradesperson");
  console.log("Verified both registration and onboarding flows.");
  await visit(trades, "/account");
  await trades.getByLabel("Document name").fill("Browser smoke insurance");
  await trades.getByLabel("File", { exact: true }).setInputFiles("public/images/builders.webp");
  await trades.getByRole("button", { name: "Submit document", exact: true }).click();
  await text(trades, "Document submitted for review.");

  await visit(home, "/projects/new");
  await home.getByLabel("Job title").fill("Browser smoke timber fence");
  await home.getByLabel("Trade category").selectOption("builders");
  await home.getByLabel("Describe the work").fill("Replace our timber side fence, remove the old panels and allow for disposal.");
  await home.getByRole("button", { name: "Continue", exact: true }).click();
  await home.getByLabel("Suburb").fill("Sandringham");
  await home.getByLabel("Postcode").fill("1025");
  await home.getByLabel("Minimum budget").fill("1000");
  await home.getByLabel("Maximum budget").fill("1900");
  await home.getByLabel("Job photo").setInputFiles("public/images/builders.webp");
  await home.getByRole("button", { name: "Continue", exact: true }).click();
  await home.getByRole("button", { name: "Post job", exact: true }).click();
  await text(home, "Job posted.");
  const projectPath = new URL(home.url()).pathname;
  assert.match(projectPath, /^\/projects\/[a-f0-9-]+$/);
  const projectId = projectPath.split("/").at(-1);
  const photos = ok(await service.from("projects").select("photo_path").eq("id", projectId).single());
  assert.ok(photos.photo_path, "Job photo recorded in private storage");

  await responsive(trades, "/jobs?q=Browser+smoke", "Find jobs", "jobs");
  await trades.getByRole("link", { name: "Browser smoke timber fence", exact: true }).click();
  await trades.getByLabel("Introduce yourself").fill("I can supply the timber and replace the complete fence this week.");
  await trades.getByRole("button", { name: "Apply for 1 token", exact: true }).click();
  await text(trades, "Application sent. You can now submit a quote.");
  await trades.getByText("Submit a quote", { exact: true }).click();
  await trades.getByLabel("Quote amount").fill("1450");
  await trades.getByLabel("Scope of work").fill("Includes posts, panels, fasteners, labour and old material removal.");
  await trades.getByRole("button", { name: "Share quote", exact: true }).click();
  await text(trades, "Quote shared with the homeowner.");
  await mailFor(homeownerEmail, "A tradesperson sent a quote");
  console.log("Verified project posting, secure photo upload, search, tokens, quotes and transactional mail.");

  await visit(trades, "/messages");
  await trades.getByLabel("Message", { exact: true }).fill("We can start on Friday morning.");
  await trades.getByRole("button", { name: "Send message", exact: true }).click();
  await text(trades, "Message sent.");
  await responsive(home, "/messages", "Messages", "messages");
  await home.setViewportSize({ width: 390, height: 900 });
  const thread = home.getByRole("link", { name: /Browser smoke timber fence/ });
  await thread.click();
  await home.waitForURL((url) => url.pathname === "/messages" && url.searchParams.has("application"));
  const application = new URL(home.url()).searchParams.get("application");
  assert.ok(application, "The mobile conversation URL identifies the application");
  await text(home, "We can start on Friday morning.");
  await home.getByLabel("Message", { exact: true }).fill("   ");
  await home.getByRole("button", { name: "Send message", exact: true }).click();
  await text(home, "Check the form fields and try again.");
  assert.equal(new URL(home.url()).searchParams.get("application"), application, "Validation should keep the conversation open");
  await home.getByLabel("Message", { exact: true }).fill("Friday works for us. Please use the side gate.");
  await home.getByRole("button", { name: "Send message", exact: true }).click();
  await text(home, "Message sent.");
  await visit(trades, "/messages?application=" + application);
  await text(trades, "Friday works for us. Please use the side gate.");
  const messageReport = home.locator("details").filter({ has: home.getByText("Report message", { exact: true }) });
  await messageReport.getByText("Report message", { exact: true }).click();
  await messageReport.getByLabel("Reason", { exact: true }).fill("Inbox message report for local moderation verification.");
  await messageReport.getByRole("button", { name: "Send report", exact: true }).click();
  await text(home, "Report sent for review.");
  assert.equal(new URL(home.url()).pathname, "/messages", "Reporting from the inbox should keep the conversation open");
  assert.equal(new URL(home.url()).searchParams.get("application"), application);
  await home.getByRole("link", { name: "All conversations", exact: true }).click();
  await thread.waitFor();
  await home.setViewportSize({ width: 1440, height: 900 });

  await visit(home, projectPath);
  await home.getByRole("button", { name: "Accept quote and award job" }).click();
  await text(home, "Quote accepted and job awarded.");
  await home.getByRole("button", { name: "Mark as complete" }).click();
  await text(home, "Job completed.");
  await visit(trades, "/messages?application=" + application);
  await text(trades, "This conversation is closed.");
  assert.equal(await trades.getByRole("button", { name: "Send message", exact: true }).count(), 0);
  await home.getByLabel("Review", { exact: true }).fill("The fence looks great and the site was left tidy.");
  await home.getByRole("button", { name: "Publish review" }).click();
  await text(home, "Review published.");
  const reportBox = home.locator("details").filter({ has: home.getByText("Report this job", { exact: true }) });
  await reportBox.getByText("Report this job", { exact: true }).click();
  await reportBox.getByLabel("Reason", { exact: true }).fill("Browser smoke report for the admin moderation workflow.");
  await reportBox.getByRole("button", { name: "Send report", exact: true }).click();
  await text(home, "Report sent for review.");
  console.log("Verified messaging, quote award, job completion, review and reporting.");

  await visit(trades, "/billing");
  await trades.getByRole("button", { name: "Buy tokens", exact: true }).click();
  await trades.getByRole("button", { name: "Confirm test payment", exact: true }).click();
  await text(trades, "Test payment completed. Your tokens are ready.");
  assert.equal(await trades.locator(".kpi strong").textContent(), "22");
  await trades.getByRole("button", { name: "Choose Starter", exact: true }).click();
  await trades.getByRole("heading", { name: "Test checkout", exact: true }).waitFor();
  const monthly = new URL(trades.url()).pathname;
  await trades.getByRole("button", { name: "Simulate failed payment", exact: true }).click();
  await text(trades, "Test payment failed. No tokens were credited.");
  assert.equal(await trades.locator(".kpi strong").textContent(), "22");
  await visit(trades, monthly);
  await trades.getByRole("button", { name: "Confirm test payment", exact: true }).click();
  await text(trades, "Test payment completed. Your tokens are ready.");
  assert.equal(await trades.locator(".kpi strong").textContent(), "32");
  await trades.getByRole("button", { name: "Cancel membership", exact: true }).click();
  await text(trades, "Membership cancellation requested.");
  await text(trades, "Cancelled");

  const operations = await fixture("Browser Ops", "homeowner", true);
  users.push(operations.email);
  await login(admin, operations.email);
  await responsive(admin, "/admin", "Admin dashboard", "admin");
  await visit(admin, "/admin/credentials?q=Browser+smoke+insurance");
  const document = admin.getByRole("row").filter({ hasText: "Browser smoke insurance" });
  await document.getByText("Review document", { exact: true }).click();
  await document.getByRole("button", { name: "Approve", exact: true }).click();
  await text(admin, "Document review saved.");
  await visit(trades, "/account");
  await text(trades, "Approved");
  await responsive(admin, "/admin/applications", "Applications", "admin-applications");
  const reportReason = "Browser smoke report for the admin moderation workflow.";
  await visit(admin, "/admin/reports?q=Browser+smoke");
  const report = admin.getByRole("row").filter({ hasText: reportReason });
  await report.getByText("Review report", { exact: true }).click();
  await report.getByRole("combobox", { name: "Moderation status", exact: true }).selectOption("resolved");
  await report.getByLabel("Resolution notes").fill("Rules reviewed and decision recorded.");
  await report.getByRole("button", { name: "Save decision" }).click();
  await text(admin, "Moderation decision saved.");

  await visit(admin, "/admin/users?q=" + encodeURIComponent(tradeEmail));
  const tradeRow = admin.getByRole("row").filter({ hasText: tradeEmail });
  await tradeRow.getByText("Manage", { exact: true }).click();
  await tradeRow.getByRole("button", { name: "Ban user" }).click();
  await text(admin, "Account updated.");
  await visit(trades, "/jobs");
  await text(trades, "Account access is restricted");
  await visit(admin, "/admin/banned?q=" + encodeURIComponent(tradeEmail));
  const banned = admin.getByRole("row").filter({ hasText: tradeEmail });
  await banned.getByText("Manage", { exact: true }).click();
  await banned.getByRole("button", { name: "Unban user" }).click();
  await text(admin, "Account updated.");
  await visit(trades, "/jobs");
  await trades.getByRole("heading", { name: "Find jobs", exact: true }).waitFor();
  console.log("Verified local billing, admin moderation, ban enforcement and reactivation.");

  const pageTitles = {
    users:"Users", banned:"Banned users", admins:"Admin access", projects:"Jobs", applications:"Applications",
    quotes:"Quotes", credentials:"Trade documents", categories:"Categories", reviews:"Reviews", reports:"Reports", support:"Support inbox",
    subscriptions:"Subscriptions", billing:"Billing orders", errors:"Error logs", audit:"Audit history", settings:"Settings",
  };
  for (const [section, title] of Object.entries(pageTitles)) {
    await visit(admin, "/admin/" + section);
    await admin.getByRole("heading", { name: title, exact: true, level: 1 }).waitFor();
  }

  await responsive(publicPage, "/", "Find a tradie for your next job", "home");
  await visit(publicPage, "/forgot-password");
  await publicPage.getByLabel("Email address").fill(homeownerEmail);
  await publicPage.getByRole("button", { name: "Send reset link" }).click();
  await text(publicPage, "If an account exists for that address, you’ll receive a password reset link.");
  const reset = await mailFor(homeownerEmail, "Reset your Trade Seekerz password");
  await publicPage.goto(linkIn(reset));
  await publicPage.getByLabel("New password", { exact: true }).fill(password + "2");
  await publicPage.getByLabel("Confirm password", { exact: true }).fill(password + "2");
  await publicPage.getByRole("button", { name: "Update password" }).click();
  await text(publicPage, "Password updated. Sign in with your new password.");
  await login(publicPage, homeownerEmail, password + "2");
  console.log("Verified password recovery, every admin route, and layout checks at seven viewport widths.");
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  const accounts = ok(await service.auth.admin.listUsers({ perPage: 1000 })).users.filter((account) => users.includes(account.email));
  for (const account of accounts) {
    const projects = ok(await service.from("projects").select("id,photo_path").eq("homeowner_id", account.id));
    for (const project of projects) {
      if (project.photo_path) await service.storage.from("project-photos").remove([project.photo_path]);
    }
    const documents = ok(await service.from("trade_documents").select("object_path").eq("owner_id", account.id));
    for (const document of documents) await service.storage.from("trade-documents").remove([document.object_path]);
    await service.from("reports").delete().eq("reporter_id", account.id);
    const orders = ok(await service.from("billing_orders").select("id").eq("buyer_id", account.id));
    for (const order of orders) {
      await service.from("subscriptions").delete().eq("order_id", order.id);
      await service.from("billing_payments").delete().eq("order_id", order.id);
      await service.from("stripe_webhook_events").delete().like("id", "%:" + order.id);
      await service.from("billing_orders").delete().eq("id", order.id);
    }
    await service.from("token_ledger").delete().eq("user_id", account.id);
    await service.from("audit_log").delete().eq("actor_id", account.id);
    await service.auth.admin.deleteUser(account.id);
  }
}
