#!/usr/bin/env node
/**
 * TASK-007 live persistence check — REAL Neon PostgreSQL, not a mock.
 *
 * Proves, against the configured `DATABASE_URL`:
 *   - the connection targets the isolated TASK-007 branch (Neon session GUCs);
 *   - the committed migration actually created `public.profiles`;
 *   - onboarding is idempotent per identity;
 *   - the UNIQUE handle index holds under concurrent inserts;
 *   - a write survives a brand-new connection (real persistence, not a cache);
 *   - the CHECK constraints reject a non-canonical handle and an unknown
 *     visibility value;
 *   - every row it creates is removed again.
 *
 * The connection string is never printed. Test rows use a per-run username
 * prefix and are deleted in a `finally` block, so a failed assertion does not
 * leave data behind.
 *
 * Usage: node scripts/profile-live-check.mjs
 */

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not configured; live check not run.");
  process.exit(2);
}

const EXPECTED_BRANCH = "br-steep-field-b3nti5ov";
const EXPECTED_PROJECT = "ancient-band-38052550";
const EXPECTED_DATABASE = "neondb";

const runTag = `t7check_${Date.now().toString(36)}`;
const results = [];

function check(name, passed, detail = "") {
  results.push({ name, passed });
  console.log(
    `${passed ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`,
  );
}

async function withClient(connectionString, fn) {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const createdIdentities = [];

try {
  // 1. Target identity: never assume the URL points at the isolated branch.
  await withClient(DATABASE_URL, async (client) => {
    const guc = async (name) =>
      (await client.query(`select current_setting('${name}', true) as v`))
        .rows[0]?.v ?? null;
    const branch = await guc("neon.branch_id");
    const project = await guc("neon.project_id");
    const database = (await client.query("select current_database() as d"))
      .rows[0].d;
    const version = (await client.query("select version() as v")).rows[0].v;

    check(
      "connection targets the isolated TASK-007 branch",
      branch === EXPECTED_BRANCH,
      `branch=${branch}`,
    );
    check(
      "connection targets project ancient-band-38052550",
      project === EXPECTED_PROJECT,
    );
    check("database is neondb", database === EXPECTED_DATABASE);
    console.log(`      server: ${String(version).split(" on ")[0]}`);

    const table = (
      await client.query("select to_regclass('public.profiles') as t")
    ).rows[0].t;
    check("migration created public.profiles", table === "profiles");

    const visibilityType = (
      await client.query(
        "select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder) as labels from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typname = 'profile_visibility' group by t.typname",
      )
    ).rows[0];
    check(
      "visibility enum is public|private",
      visibilityType?.labels === "public,private",
      visibilityType ? visibilityType.labels : "missing",
    );
  });

  const identityA = randomUUID();
  const identityB = randomUUID();
  const identityConcurrent = Array.from({ length: 8 }, () => randomUUID());
  createdIdentities.push(identityA, identityB, ...identityConcurrent);

  // 2. Idempotent onboarding (the exact statement shape the repository uses).
  const insertOnboarding = (client, identityId, username) =>
    client
      .query(
        `insert into profiles (identity_id, username, display_name, visibility)
         values ($1, $2, $3, 'public')
         on conflict (identity_id) do nothing
         returning id`,
        [identityId, username, "Live Check"],
      )
      .then((result) => result.rows[0] ?? null);

  await withClient(DATABASE_URL, async (client) => {
    const first = await insertOnboarding(client, identityA, `${runTag}_a`);
    const retry = await insertOnboarding(
      client,
      identityA,
      `${runTag}_a_retry`,
    );
    const count = (
      await client.query(
        "select count(*)::int as c from profiles where identity_id = $1",
        [identityA],
      )
    ).rows[0].c;
    check(
      "onboarding inserts exactly one profile",
      first !== null && count === 1,
    );
    check(
      "a retried onboarding creates nothing",
      retry === null && count === 1,
    );
  });

  // 3. UNIQUE handle under concurrency: 8 identities race for one username.
  const contestedUsername = `${runTag}_race`;
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 8 });
  try {
    const attempts = await Promise.all(
      identityConcurrent.map(async (identityId, index) => {
        const client = await pool.connect();
        try {
          await client.query(
            `insert into profiles (identity_id, username, display_name, visibility)
             values ($1, $2, $3, 'public')`,
            [identityId, contestedUsername, `Racer ${index}`],
          );
          return "created";
        } catch (error) {
          return error?.code === "23505"
            ? "conflict"
            : `error:${error?.code ?? "unknown"}`;
        } finally {
          client.release();
        }
      }),
    );
    const created = attempts.filter((outcome) => outcome === "created").length;
    const conflicts = attempts.filter(
      (outcome) => outcome === "conflict",
    ).length;
    const other = attempts.filter(
      (outcome) => !["created", "conflict"].includes(outcome),
    );
    check(
      "concurrent onboarding yields exactly one handle owner",
      created === 1 &&
        conflicts === identityConcurrent.length - 1 &&
        other.length === 0,
      `${created} created / ${conflicts} unique-violations${other.length ? ` / ${other.join(",")}` : ""}`,
    );
  } finally {
    await pool.end();
  }

  // 4. Persistence across a fresh connection (no pooling/cache involved).
  await withClient(DATABASE_URL, async (client) => {
    await client.query(
      "update profiles set display_name = $2, bio = $3, visibility = 'private', updated_at = now() where identity_id = $1",
      [identityA, "Persisted Name", "Survives a reconnect"],
    );
  });
  await withClient(DATABASE_URL, async (client) => {
    const row = (
      await client.query(
        "select display_name, bio, visibility from profiles where identity_id = $1",
        [identityA],
      )
    ).rows[0];
    check(
      "update persists after opening a new connection",
      row?.display_name === "Persisted Name" &&
        row?.bio === "Survives a reconnect" &&
        row?.visibility === "private",
      row ? `${row.display_name} / ${row.visibility}` : "row missing",
    );
  });

  // 5. Constraints are real, not just application validation.
  await withClient(DATABASE_URL, async (client) => {
    let badHandleCode = null;
    try {
      await client.query(
        `insert into profiles (identity_id, username, display_name) values ($1, $2, 'Bad')`,
        [identityB, "Not A Handle"],
      );
    } catch (error) {
      badHandleCode = error?.code ?? "unknown";
    }
    check(
      "database rejects a non-canonical handle",
      badHandleCode === "23514",
      `code=${badHandleCode}`,
    );

    let badVisibilityCode = null;
    try {
      await client.query(
        `insert into profiles (identity_id, username, display_name, visibility) values ($1, $2, 'Bad', 'followers')`,
        [identityB, `${runTag}_b`],
      );
    } catch (error) {
      badVisibilityCode = error?.code ?? "unknown";
    }
    check(
      "database rejects unsupported visibility values",
      badVisibilityCode === "22P02" || badVisibilityCode === "22023",
      `code=${badVisibilityCode}`,
    );
  });
} catch (error) {
  check(
    "live check completed without an unexpected error",
    false,
    error?.code ?? String(error),
  );
} finally {
  // 6. Cleanup: remove every row this run created, then prove none remain.
  try {
    await withClient(DATABASE_URL, async (client) => {
      await client.query(
        "delete from profiles where identity_id = any($1::uuid[])",
        [createdIdentities],
      );
      const remaining = (
        await client.query(
          "select count(*)::int as c from profiles where username like $1",
          [`${runTag}%`],
        )
      ).rows[0].c;
      check("test rows removed", remaining === 0, `remaining=${remaining}`);
    });
  } catch (error) {
    check("test rows removed", false, error?.code ?? String(error));
  }
}

const failed = results.filter((result) => !result.passed);
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed`,
);
if (failed.length > 0) {
  console.error(`FAILED: ${failed.map((result) => result.name).join("; ")}`);
  process.exit(1);
}
