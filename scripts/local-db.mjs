import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import ts from "typescript";

const cli = "supabase";
const omitted = "realtime,imgproxy,edge-runtime,logflare,vector,supavisor";
const command = process.argv[2];

function run(args, stdio = "inherit") {
  return execFileSync(cli, [...args, "--workdir", process.cwd(), "--agent", "no"], {
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
    stdio,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function writeEnv() {
  const status = JSON.parse(run(["status", "-o", "json"], ["ignore", "pipe", "ignore"]));
  const apiUrl = status.API_URL;
  if (!apiUrl || !["127.0.0.1", "localhost"].includes(new URL(apiUrl).hostname)) {
    throw new Error("Expected the local Supabase API.");
  }
  const publ = status.PUBLISHABLE_KEY || status.ANON_KEY;
  const secret = status.SECRET_KEY || status.SERVICE_ROLE_KEY;
  if (!publ || !secret) throw new Error("The local Supabase keys are missing.");
  writeFileSync(".env.local", [
    "APP_URL=http://127.0.0.1:3000",
    "SUPABASE_URL=" + apiUrl,
    "SUPABASE_PUBLISHABLE_KEY=" + publ,
    "SUPABASE_SERVICE_KEY=" + secret,
    "LOCAL_TEST_BILLING=1",
    "MAILPIT_WEB_URL=http://127.0.0.1:55424",
    "MAILPIT_SMTP_PORT=55425",
    "",
  ].join("\n"), { mode: 0o600, flag: "wx" });
  console.log("Created .env.local with this local stack’s keys.");
}

switch (command) {
  case "start":
    run(["start", "--exclude", omitted], ["ignore", "ignore", "inherit"]);
    console.log("Local Supabase is available on 127.0.0.1:55421.");
    try { writeEnv(); } catch (error) {
      if (error.code !== "EEXIST") throw error;
      console.log("  Using existing .env.local.");
    }
    break;
  case "stop":
    run(["stop"]);
    break;
  case "types": {
    const code = run(["gen", "types", "typescript", "--local", "--schema", "public"], ["ignore", "pipe", "inherit"]);
    const source = ts.createSourceFile("database.types.ts", code, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    writeFileSync("lib/database.types.ts", ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(source));
    break;
  }
  default:
    throw new Error("Choose start, stop, or types.");
}
