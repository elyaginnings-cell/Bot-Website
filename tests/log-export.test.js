import test from "node:test";
import assert from "node:assert/strict";
import { buildLogCsv } from "../lib/logExport.js";

test("exports quoted CSV fields and serializes metadata", () => {
  const csv = buildLogCsv([{
    id: "log-1",
    event_type: "message.edit",
    actor_name: 'Bee, "B"',
    reason: "first line\nsecond line",
    metadata: { source: "discord", count: 2 }
  }]);
  assert.match(csv, /"Bee, ""B"""/);
  assert.match(csv, /"first line\nsecond line"/);
  assert.match(csv, /"\{""source"":""discord"",""count"":2\}"/);
  assert.ok(csv.includes("\r\n"));
});

test("neutralizes spreadsheet formula prefixes in exported cells", () => {
  const csv = buildLogCsv([
    { id: "=1+1" },
    { id: "+SUM(A1:A2)" },
    { id: "-cmd" },
    { id: "@value" },
    { id: "\tformula" },
    { id: "\rformula" }
  ]);
  for (const value of ["'=1+1", "'+SUM(A1:A2)", "'-cmd", "'@value", "'\tformula", "'\rformula"]) {
    assert.ok(csv.includes('"' + value.replace(/"/g, '""') + '"'));
  }
});
