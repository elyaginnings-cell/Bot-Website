import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../features-ai-chat.js", import.meta.url), "utf8");

test("AI Chat exposes the Member/Staff mode and independent monitoring controls", () => {
  assert.match(source, /id="aichat-mode"/);
  assert.match(source, /id="aichat-monitoring"/);
  assert.match(source, /id="aichat-full-ai"/);
  assert.match(source, /fullAiEvaluation:.*aichat-full-ai/);
  assert.match(source, /Hybrid is the default/);
  assert.match(source, /id="aichat-excluded-channel-pick"/);
  assert.match(source, /excludedChannelIds: excludedChannels\.slice\(\)/);
  assert.match(source, /enabledChannels: enabledChannels\.slice\(\)/);
});

test("AI Chat exposes configurable routine moderation and fixed kick/ban approval", () => {
  assert.match(source, /id="aichat-exempt-staff"/);
  assert.match(source, /id="aichat-auto-warn"/);
  assert.match(source, /id="aichat-auto-delete"/);
  assert.match(source, /id="aichat-auto-timeout"/);
  assert.match(source, /id="aichat-timeout-duration"/);
  assert.match(source, /id="aichat-review-channel"/);
  assert.match(source, /id="aichat-highstaff-role"/);
  assert.match(source, /id="aichat-approval-expiry"/);
  assert.match(source, /Kicks and bans always require human approval/);
  assert.match(source, /autonomousActions:/);
  assert.doesNotMatch(source, /autonomousActions:\s*\{[^}]*kick\s*:/s);
  assert.doesNotMatch(source, /autonomousActions:\s*\{[^}]*ban\s*:/s);
});
