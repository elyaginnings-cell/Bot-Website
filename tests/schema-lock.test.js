import test from "node:test";
import assert from "node:assert/strict";
import { withSchemaLock } from "../lib/schemaLock.js";

test("schema setup is protected by an advisory lock and always unlocks", async () => {
  const calls = [];
  const client = { query: async (sql) => { calls.push(sql); } };
  const result = await withSchemaLock(client, async () => { calls.push("SCHEMA"); return "ready"; });
  assert.equal(result, "ready");
  assert.deepEqual(calls, [
    "SELECT pg_advisory_lock(681243, 1)",
    "SCHEMA",
    "SELECT pg_advisory_unlock(681243, 1)"
  ]);
});

test("schema lock is released when schema setup fails", async () => {
  const calls = [];
  const client = { query: async (sql) => { calls.push(sql); } };
  await assert.rejects(() => withSchemaLock(client, async () => { throw new Error("ddl failed"); }), /ddl failed/);
  assert.deepEqual(calls, [
    "SELECT pg_advisory_lock(681243, 1)",
    "SELECT pg_advisory_unlock(681243, 1)"
  ]);
});
