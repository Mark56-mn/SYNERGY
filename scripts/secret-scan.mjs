#!/usr/bin/env node
/**
 * SYNERGY secret scan (ADR-0008 §6): a deliberate, repeatable grep across
 * tracked files for credential-shaped values. Exit code 1 on any hit — any
 * hit is a stop-and-report incident, not a "pass with notes".
 *
 * Runs against files tracked by git (committed + staged), so untracked junk
 * never masks a leak and deleted files cannot hide. Descriptive words
 * ("connection string", "DATABASE_URL=") do not match by design — this scan
 * looks for the VALUE SHAPE of real credentials.
 */
import { execFileSync } from "node:child_process";

const PATTERNS = [
  { name: "AWS access key id", re: /AKIA[0-9A-Z]{16,}/ },
  { name: "Stripe live secret", re: /sk_live_[0-9a-zA-Z]{20,}/ },
  { name: "Stripe publishable live", re: /pk_live_[0-9a-zA-Z]{20,}/ },
  {
    name: "Supabase service-role-ish JWT",
    re: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    filter: /sbp_|service_role/,
  },
  { name: "OpenAI-style secret", re: /sk-[A-Za-z0-9]{20,}/ },
  { name: "npm token", re: /npm_[A-Za-z0-9]{30,}/ },
  { name: "GitHub personal access token", re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
  { name: "Slack token", re: /xox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: "SendGrid key", re: /SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  {
    name: "Bitbucket/Google key-ish hex",
    re: /(0x)?[0-9a-f]{64}/,
    filter: /sha256|sha3|keccak|commit|hmac/i,
  },
  {
    name: "Postgres connection string with credentials",
    re: /postgres(?:ql)?:\/\/[^\s"']+:[^\s"'@]+@/,
  },
  {
    name: "MySQL connection string with credentials",
    re: /mysql:\/\/[^\s"']+:[^\s"'@]+@/,
  },
  {
    name: "MongoDB connection string with credentials",
    re: /mongodb(?:\+srv)?:\/\/[^\s"']+:[^\s"'@]+@/,
  },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

let tracked;
try {
  tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
} catch (error) {
  console.error("secret-scan: could not list tracked files:", error.message);
  process.exit(2);
}

let hits = 0;
for (const file of tracked) {
  let content;
  try {
    content = execFileSync("git", ["show", `:${file}`], { encoding: "utf8" });
  } catch {
    continue; // file staged for deletion or binary.
  }
  for (const { name, re, filter } of PATTERNS) {
    if (!re.test(content)) {
      continue;
    }
    if (filter && filter.test(content)) {
      continue;
    }
    console.error(`secret-scan: possible ${name} in ${file}`);
    hits += 1;
  }
}

if (hits > 0) {
  console.error(
    `secret-scan: ${hits} hit(s). STOP. Do not commit; report and rotate if real.`,
  );
  process.exit(1);
}
console.log(`secret-scan: clean (${tracked.length} tracked files scanned).`);
