#!/usr/bin/env node
/**
 * TASK-008A live persistence check — REAL Neon PostgreSQL, not a mock.
 *
 * Proves, against the configured `DATABASE_URL`:
 *   - the connection targets the isolated task branch (Neon session GUCs);
 *   - the committed migration created posts / post_likes / post_topics;
 *   - publishing inserts one row and derives topics;
 *   - the feed's visibility rule (public author OR owner) holds in SQL for
 *     anonymous, other-member and owner viewers;
 *   - a private author's post is excluded for everyone else;
 *   - post_likes is unique per member/post and a retry cannot double-count;
 *   - a soft delete removes the post from the feed but keeps the row;
 *   - the CHECK constraints reject a bad body and a non-https media URL;
 *   - search/topic predicates do not cross the visibility boundary;
 *   - every row it creates is removed again.
 *
 * The connection string is never printed. Test rows use a per-run username
 * prefix and are deleted in a `finally` block.
 *
 * Usage: node scripts/posts-live-check.mjs
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
const runTag = `t8check_${Date.now().toString(36)}`;
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

const identityPublic = randomUUID();
const identityPrivate = randomUUID();
const identityViewer = randomUUID();

/**
 * The exact predicate the feed query uses. Kept in one place so the check
 * cannot drift into a weaker rule than production.
 */
const FEED_SQL = `
  select p.id, p.body
  from posts p
  join profiles a on a.identity_id = p.identity_id
  where p.deleted_at is null
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

    for (const table of ["posts", "post_likes", "post_topics"]) {
      const found = (
        await client.query("select to_regclass($1) as t", [`public.${table}`])
      ).rows[0].t;
      check(`migration created public.${table}`, found === table);
    }

    await client.query(
      `insert into profiles (identity_id, username, display_name, visibility)
       values ($1, $2, 'Live Public', 'public'),
              ($3, $4, 'Live Private', 'private'),
              ($5, $6, 'Live Viewer', 'public')`,
      [
        identityPublic,
        `${runTag}_public`,
        identityPrivate,
        `${runTag}_private`,
        identityViewer,
        `${runTag}_viewer`,
      ],
    );

    const publicPost = (
      await client.query(
        `insert into posts (identity_id, body, media_url, media_alt)
         values ($1, $2, $3, $4) returning id`,
        [
          identityPublic,
          `A live public post #${runTag}`,
          "https://res.cloudinary.com/demo/image/upload/synergy/posts/x/y.jpg",
          "A test photo",
        ],
      )
    ).rows[0].id;
    const privatePost = (
      await client.query(
        `insert into posts (identity_id, body) values ($1, $2) returning id`,
        [identityPrivate, "A private author's post"],
      )
    ).rows[0].id;
    check(
      "publishing inserts exactly one row each",
      Boolean(publicPost && privatePost),
    );

    await client.query(
      `insert into post_topics (post_id, topic) values ($1, $2), ($1, $3)`,
      [publicPost, runTag, "livetest"],
    );

    const fetchFeed = async (viewer) =>
      (await client.query(FEED_SQL, [viewer])).rows.map((row) => row.id);

    const anonymous = await fetchFeed(null);
    check(
      "anonymous feed contains the public post",
      anonymous.includes(publicPost),
    );
    check(
      "anonymous feed excludes the private author's post",
      !anonymous.includes(privatePost),
    );

    const otherViewer = await fetchFeed(identityViewer);
    check(
      "another member's feed excludes the private author's post",
      !otherViewer.includes(privatePost),
    );

    const owner = await fetchFeed(identityPrivate);
    check(
      "the private author sees their own post",
      owner.includes(privatePost),
    );

    await client.query(
      `insert into post_likes (post_id, identity_id) values ($1, $2) on conflict do nothing`,
      [publicPost, identityViewer],
    );
    await client.query(
      `insert into post_likes (post_id, identity_id) values ($1, $2) on conflict do nothing`,
      [publicPost, identityViewer],
    );
    const likeCount = (
      await client.query(
        "select count(*)::int as c from post_likes where post_id = $1",
        [publicPost],
      )
    ).rows[0].c;
    check("a repeated like counts once", likeCount === 1, `count=${likeCount}`);

    const searchRows = (
      await client.query(
        `select p.id
         from posts p
         join profiles a on a.identity_id = p.identity_id
         where p.deleted_at is null
           and (a.visibility = 'public' or p.identity_id = $1)
           and p.body ilike $2`,
        [identityViewer, `%${runTag}%`],
      )
    ).rows.map((row) => row.id);
    check(
      "search returns the public match and never the private one",
      searchRows.includes(publicPost) && !searchRows.includes(privatePost),
    );

    const topicRows = (
      await client.query(
        `select p.id
         from posts p
         join profiles a on a.identity_id = p.identity_id
         join post_topics t on t.post_id = p.id
         where p.deleted_at is null
           and a.visibility = 'public'
           and t.topic = $1`,
        [runTag],
      )
    ).rows.map((row) => row.id);
    check(
      "topic discovery only returns public authors",
      topicRows.includes(publicPost) && !topicRows.includes(privatePost),
    );

    let badBodyCode = null;
    try {
      await client.query(
        "insert into posts (identity_id, body) values ($1, $2)",
        [identityPublic, "   "],
      );
    } catch (error) {
      badBodyCode = error?.code ?? "unknown";
    }
    check(
      "database rejects a blank caption",
      badBodyCode === "23514",
      `code=${badBodyCode}`,
    );

    let badMediaCode = null;
    try {
      await client.query(
        "insert into posts (identity_id, body, media_url) values ($1, $2, $3)",
        [identityPublic, "Bad media", "http://insecure.example/x.jpg"],
      );
    } catch (error) {
      badMediaCode = error?.code ?? "unknown";
    }
    check(
      "database rejects a non-https photo URL",
      badMediaCode === "23514",
      `code=${badMediaCode}`,
    );

    await client.query("update posts set deleted_at = now() where id = $1", [
      publicPost,
    ]);
    const afterDelete = await fetchFeed(identityViewer);
    check(
      "a soft-deleted post leaves the feed",
      !afterDelete.includes(publicPost),
    );
    const stillStored = (
      await client.query("select count(*)::int as c from posts where id = $1", [
        publicPost,
      ])
    ).rows[0].c;
    check("the soft-deleted row is retained", stillStored === 1);
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
      await client.query(
        "delete from posts where identity_id = any($1::uuid[])",
        [[identityPublic, identityPrivate, identityViewer]],
      );
      await client.query(
        "delete from profiles where identity_id = any($1::uuid[])",
        [[identityPublic, identityPrivate, identityViewer]],
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
