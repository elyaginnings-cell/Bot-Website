import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("existing public API aliases remain defined", async () => {
  const config = JSON.parse(await read("../../vercel.json"));
  const rewrites = new Map(config.rewrites.map((entry) => [entry.source, entry.destination]));
  assert.equal(rewrites.get("/api/signup"), "/api/auth-login?action=signup");
  assert.equal(rewrites.get("/api/login"), "/api/auth-login?action=login");
  assert.equal(rewrites.get("/api/logout"), "/api/auth-login?action=logout");
  assert.equal(rewrites.get("/api/roles"), "/api/channels?resource=roles");
  assert.equal(rewrites.get("/api/presence"), "/api/bot-status?resource=presence");
  assert.equal(rewrites.get("/api/guild-meta"), "/api/guilds?resource=meta");
  assert.equal(rewrites.get("/api/role-manage"), "/api/channel-manage?resource=roles");
  assert.equal(rewrites.get("/api/invite-bot"), "/api/guilds?resource=invite");
});

test("session cookie names and authenticated encryption version remain explicit", async () => {
  const session = await read("../../lib/session.js");
  assert.match(session, /SESSION_COOKIE\s*=\s*"app_session"/);
  assert.match(session, /DISCORD_COOKIE\s*=\s*"discord_session"/);
  assert.match(session, /OAUTH_STATE_COOKIE\s*=\s*"oauth_state"/);
  assert.match(session, /"v2\."/);
  assert.match(session, /aes-256-gcm/);
});

test("dashboard APIs continue to enforce staff authorization", async () => {
  const auth = await read("../../lib/requireAuth.js");
  assert.match(auth, /export function requireAnySession/);
  assert.match(auth, /session\.staff !== true/);
  const routes = await Promise.all([
    read("../../api/guilds.js"),
    read("../../api/channels.js"),
    read("../../api/config.js"),
    read("../../api/bot-status.js")
  ]);
  for (const route of routes) assert.match(route, /requireAnySession\(req\)/);
});

test("guild configuration retains its existing key convention", async () => {
  const config = await read("../../lib/guildConfig.js");
  assert.match(config, /return `guild_config:\$\{guildId\}`/);
});

test("new shell uses current read endpoints and does not save config on boot", async () => {
  const app = await read("../../dashboard-v2.js");
  assert.match(app, /requestJson\("\/api\/guilds"\)/);
  assert.doesNotMatch(app, /\/api\/bot-status/);
  assert.match(app, /mode=readonly/);
  assert.match(app, /mode=compat/);
  assert.doesNotMatch(app, /\/api\/dashboard-config/);
  assert.match(app, /credentials:\s*"same-origin"/);
});


test("new config route uses existing schema without automatic DDL", async () => {
  const db = await read("../../lib/db.js");
  const route = await read("../../api/config.js");
  assert.match(db, /export async function queryExistingSchema/);
  assert.match(route, /queryExistingSchema\(/);
  assert.doesNotMatch(route, /ensureSchema|CREATE TABLE|ALTER TABLE|TRUNCATE|DROP TABLE/);
  assert.match(route, /if \(req\.method === "GET"\)/);
  assert.match(route, /No saved configuration exists/);
  assert.match(route, /Refusing to create a replacement from empty defaults/);
});

test("dashboard navigation labels are unique and point to registered pages", async () => {
  const html = await read("../../dashboard-v2.html");
  const app = await read("../../dashboard-v2.js");
  const ids = [...html.matchAll(/data-page="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(ids.length > 0, "navigation should contain pages");
  assert.equal(new Set(ids).size, ids.length, "navigation page IDs should be unique");
  for (const id of ids) assert.ok(app.includes(`${id}: {`) || app.includes(`"${id}": {`), `missing page registry entry for ${id}`);
});
