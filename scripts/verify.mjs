#!/usr/bin/env node
/**
 * Aggregate local verification (TASK-005).
 *
 * Runs every REQUIRED gate in order and fails if any of them fails. Output is
 * streamed rather than buffered so a failure keeps its real diagnostics, and
 * exit codes are never piped away.
 *
 * `npm audit` is deliberately reported SEPARATELY: the repository has a
 * documented, owner-owned triage decision (B-5) for advisories that can only
 * be fixed by breaking upgrades (Vitest 5, Next 16, Expo SDK 58). The audit
 * result is printed in full and never hidden; pass `--strict-audit` to make it
 * a hard failure as well.
 */
import { spawnSync } from "node:child_process";
import process from "node:process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const strictAudit = process.argv.includes("--strict-audit");

const REQUIRED = [
  { name: "format", args: ["run", "format:check"] },
  { name: "lint", args: ["run", "lint"] },
  { name: "typecheck", args: ["run", "typecheck"] },
  { name: "tests", args: ["test"] },
  { name: "web build", args: ["run", "build"] },
  { name: "secret scan", args: ["run", "secret-scan"] },
  { name: "import boundaries", args: ["run", "check:boundaries"] },
];

const results = [];

for (const step of REQUIRED) {
  process.stdout.write(`\n=== ${step.name}: npm ${step.args.join(" ")} ===\n`);
  const started = Date.now();
  const result = spawnSync(npm, step.args, { stdio: "inherit" });
  results.push({
    name: step.name,
    code: result.status ?? 1,
    seconds: ((Date.now() - started) / 1000).toFixed(1),
  });
}

process.stdout.write("\n=== dependency audit (reported separately) ===\n");
const audit = spawnSync(npm, ["audit", "--audit-level=high"], {
  stdio: "inherit",
});
const auditCode = audit.status ?? 1;

const pad = (value, width) => String(value).padEnd(width);
process.stdout.write("\n=== verify summary ===\n");
for (const result of results) {
  process.stdout.write(
    `${result.code === 0 ? "PASS" : "FAIL"}  ${pad(result.name, 22)} ${result.seconds}s\n`,
  );
}
process.stdout.write(
  `${auditCode === 0 ? "PASS" : "ADVISORY"}  dependency audit` +
    ` (exit ${auditCode}; see handoff/TASK-005.md §dependency triage` +
    `${strictAudit ? "; --strict-audit" : ""})\n`,
);

const requiredFailed = results.filter((result) => result.code !== 0);
if (requiredFailed.length > 0) {
  process.stdout.write(
    `\nverify: ${requiredFailed.length} required gate(s) failed.\n`,
  );
  process.exit(1);
}
if (strictAudit && auditCode !== 0) {
  process.stdout.write(
    "\nverify: strict audit requested and advisories remain.\n",
  );
  process.exit(1);
}
process.stdout.write(
  `\nverify: all required gates passed; audit advisories are known and documented${
    strictAudit ? "" : " (not a pass)"
  }.\n`,
);
