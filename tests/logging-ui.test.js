import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../features-logging.js", import.meta.url), "utf8");

test("logging dashboard exposes per-event delivery and routing controls", () => {
  for (const marker of [
    "data-log-event-db",
    "data-log-event-discord",
    "data-log-event-channel",
    "replaceEvents: true"
  ]) assert.ok(source.includes(marker), "missing per-event control: " + marker);
});

test("logging dashboard exposes Quark-style ignore filters", () => {
  for (const marker of [
    "log-ignore-actors",
    "log-ignore-targets",
    "log-ignore-roles",
    "log-ignore-channels",
    "log-ignore-messages",
    "log-ignore-bots"
  ]) assert.ok(source.includes(marker), "missing ignore control: " + marker);
});

test("log history supports pagination, CSV export, and full event details", () => {
  for (const marker of [
    "log-load-more",
    "log-export",
    "Change snapshots",
    "log-attachment-list",
    "log-embed-snapshot"
  ]) assert.ok(source.includes(marker), "missing log viewer feature: " + marker);
});
