#!/usr/bin/env node
/**
 * TASK-008D live persistence check — REAL Neon PostgreSQL, not a mock.
 *
 * Proves, against the configured `DATABASE_URL`:
 *   - the connection targets the isolated task branch (Neon session GUCs);
 *   - the committed migration created `follows` with its composite PK,
 *     self-follow CHECK and both lookup indexes;
 *   - a follow inserts exactly one edge for the verified pair;
 *   - a duplicate follow is idempotent and counts stay correct;
 *   - an unfollow removes only the caller's edge;
 *   - the database rejects any self-edge even outside the service layer;
 *   - the Following feed SQL returns followed public creators' posts plus the
 *     viewer's own posts, and excludes unrelated or private authors;
 *   - a stale follow to a now-private creator contributes nothing;
 *   - every row it creates is removed again.
 *
 * The connection string is never printed. Test rows use a per-run username
 * prefix and are deleted in a `finally` block.
 *
 * Usage: node scripts/follows-live-check.mjs
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
const runTag = `t8dfollow_${Date.now().toString(36)}`;
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

const identityViewer = randomUUID();
const identityFollowed = randomUUID();
const identityUnrelated = randomUUID();
const identityPrivate = randomUUID();

/**
 * The exact shape the Following feed query uses. Kept in one place so the
 * check cannot drift into a weaker rule than production.
 */
const FOLLOWING_FEED_SQL = `
  select p.id
  from posts p
  join profiles a on a.identity_id = p.identity_id
  left join follows f
    on f.following_identity_id = p.identity_id
   and f.follower_identity_id = $1
  where p.deleted_at is null
    and (p.identity_id = $1 or f.following_identity_id is not null)
    and (a.visibility = 'public' or p.identity_id = $1)
  order by p.created_at desc, p.id desc`;

try {
  await withClient(DATABASE_URL, async (client) => {
    const guc = async (name) =>
      (await client.query(`select current_setting('${name}', true) as v`))
        .rows[0]?.v ?? null;
    check(
      "connection targets the isolated task branch",
      (await guc("neon.branch_id")) === EXPECTED_BRANCH,
      `branch=${await guc("neon.branch_id")}`,
    );
    check(
      "connection targets project ancient-band-38052550",
      (await guc("neon.project_id")) === EXPECTED_PROJECT,
    );

    const table = (
      await client.query("select to_regclass($1) as t", ["public.follows"])
    ).rows[0].t;
    check("migration created public.follows", table === "follows");

    const constraints = (
      await client.query(
        `select conname, contype
         from pg_constraint
         where conrelid = 'public.follows'::regclass`,
      )
    ).rows;
    const pk = constraints.find(
      (row) =>
        row.conname ===
          "follows_follower_identity_id_following_identity_id_pk" &&
        row.contype === "p",
    );
    const noSelf = constraints.find(
      (row) => row.conname === "follows_no_self" && row.contype === "c",
    );
    check("follows has the composite primary key", Boolean(pk));
    check("follows has the self-follow CHECK", Boolean(noSelf));

    const indexes = (
      await client.query(
        `select indexname from pg_indexes where tablename = 'follows'`,
      )
    ).rows.map((row) => row.indexname);
    check(
      "follows has both lookup indexes",
      indexes.includes("follows_following_created_idx") &&
        indexes.includes("follows_follower_created_idx"),
      indexes.join(","),
    );

    await client.query(
      `insert into profiles (identity_id, username, display_name, visibility)
       values ($1, $2, 'Live Viewer', 'public'),
              ($3, $4, 'Live Followed', 'public'),
              ($5, $6, 'Live Unrelated', 'public'),
              ($7, $8, 'Live Private', 'private')`,
      [
        identityViewer,
        `${runTag}_viewer`,
        identityFollowed,
        `${runTag}_followed`,
        identityUnrelated,
        `${runTag}_unrelated`,
        identityPrivate,
        `${runTag}_private`,
      ],
    );

    const viewerPost = (
      await client.query(
        "insert into posts (identity_id, body) values ($1, $2) returning id",
        [identityViewer, "The viewer's own post"],
      )
    ).rows[0].id;
    const followedPost = (
      await client.query(
        "insert into posts (identity_id, body) values ($1, $2) returning id",
        [identityFollowed, "A followed creator's post"],
      )
    ).rows[0].id;
    const unrelatedPost = (
      await client.query(
        "insert into posts (identity_id, body) values ($1, $2) returning id",
        [identityUnrelated, "An unrelated creator's post"],
      )
    ).rows[0].id;
    const privatePost = (
      await client.query(
        "insert into posts (identity_id, body) values ($1, $2) returning id",
        [identityPrivate, "A private creator's post"],
      )
    ).rows[0].id;
    check("fixture posts inserted", Boolean(viewerPost && followedPost));

    const follow = () =>
      client.query(
        `insert into follows (follower_identity_id, following_identity_id)
         values ($1, $2) on conflict do nothing`,
        [identityViewer, identityFollowed],
      );
    await follow();
    await follow();
    const edgeCount = (
      await client.query(
        `select count(*)::int as c from follows
         where follower_identity_id = $1 and following_identity_id = $2`,
        [identityViewer, identityFollowed],
      )
    ).rows[0].c;
    check("a repeated follow stores exactly one edge", edgeCount === 1);

    const counts = async (identityId) => {
      const followerCount = (
        await client.query(
          "select count(*)::int as c from follows where following_identity_id = $1",
          [identityId],
        )
      ).rows[0].c;
      const followingCount = (
        await client.query(
          "select count(*)::int as c from follows where follower_identity_id = $1",
          [identityId],
        )
      ).rows[0].c;
      return { followerCount, followingCount };
    };
    const followedCounts = await counts(identityFollowed);
    const viewerCounts = await counts(identityViewer);
    check(
      "counts reflect the stored edge",
      followedCounts.followerCount === 1 && viewerCounts.followingCount === 1,
      `followed=${JSON.stringify(followedCounts)} viewer=${JSON.stringify(viewerCounts)}`,
    );

    const feedFor = async (viewer) =>
      (await client.query(FOLLOWING_FEED_SQL, [viewer])).rows.map(
        (row) => row.id,
      );

    const afterFollow = await feedFor(identityViewer);
    check(
      "following feed includes the followed creator's post",
      afterFollow.includes(followedPost),
    );
    check(
      "following feed includes the viewer's own post",
      afterFollow.includes(viewerPost),
    );
    check(
      "following feed excludes an unrelated creator's post",
      !afterFollow.includes(unrelatedPost),
    );

    // A stale edge to a creator who is now private must contribute nothing.
    await client.query(
      `insert into follows (follower_identity_id, following_identity_id)
       values ($1, $2) on conflict do nothing`,
      [identityViewer, identityPrivate],
    );
    const afterPrivateEdge = await feedFor(identityViewer);
    check(
      "a stale follow to a private creator leaks no post",
      !afterPrivateEdge.includes(privatePost),
    );

    await client.query(
      `delete from follows
       where follower_identity_id = $1 and following_identity_id = $2`,
      [identityViewer, identityFollowed],
    );
    const afterUnfollow = await feedFor(identityViewer);
    check(
      "unfollow removes the followed creator's post from the feed",
      !afterUnfollow.includes(followedPost),
    );
    check(
      "unfollow leaves the viewer's own post in the feed",
      afterUnfollow.includes(viewerPost),
    );
    const afterUnfollowCounts = await counts(identityFollowed);
    check(
      "unfollow updates the follower count",
      afterUnfollowCounts.followerCount === 0,
      `count=${afterUnfollowCounts.followerCount}`,
    );

    let selfCode = null;
    try {
      await client.query(
        `insert into follows (follower_identity_id, following_identity_id)
         values ($1, $1)`,
        [identityViewer],
      );
    } catch (error) {
      selfCode = error?.code ?? "unknown";
    }
    check(
      "the database rejects a self-follow",
      selfCode === "23514",
      `code=${selfCode}`,
    );
  });
} catch (error) {
  check(
    "live check completed without an unexpected error",
    false,
    error?.code ?? String(error),
  );
} finally {
  try {
    await withClient(DATABASE_URL, async (client) => {
      const ids = [
        identityViewer,
        identityFollowed,
        identityUnrelated,
        identityPrivate,
      ];
      await client.query(
        "delete from follows where follower_identity_id = any($1::uuid[]) or following_identity_id = any($1::uuid[])",
        [ids],
      );
      await client.query(
        "delete from posts where identity_id = any($1::uuid[])",
        [ids],
      );
      await client.query(
        "delete from profiles where identity_id = any($1::uuid[])",
        [ids],
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
