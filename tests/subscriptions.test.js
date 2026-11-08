import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { calculateAnnualPriceCents } from "../lib/subscriptions.js";
import { verifyStripeSignature } from "../lib/stripe.js";

test("annual price applies the default 15 percent discount", () => {
  assert.equal(calculateAnnualPriceCents(1000), 10200);
});

test("annual price rounds to the nearest cent and accepts a configured discount", () => {
  assert.equal(calculateAnnualPriceCents(999, 10), 10789);
});

test("annual price rejects invalid amounts and discounts", () => {
  assert.throws(() => calculateAnnualPriceCents(-1), /non-negative integer/);
  assert.throws(() => calculateAnnualPriceCents(1000, 101), /between 0 and 100/);
});

test("Stripe signature verification accepts a valid recent signature", () => {
  const timestamp = 1_800_000_000;
  const payload = JSON.stringify({ id: "evt_test", type: "test.event" });
  const secret = "whsec_example";
  const signature = crypto.createHmac("sha256", secret)
    .update(timestamp + "." + payload)
    .digest("hex");
  assert.equal(
    verifyStripeSignature(payload, "t=" + timestamp + ",v1=" + signature, secret, timestamp),
    true
  );
});

test("Stripe signature verification rejects tampering and stale timestamps", () => {
  const timestamp = 1_800_000_000;
  const payload = '{"id":"evt_test"}';
  const secret = "whsec_example";
  const signature = crypto.createHmac("sha256", secret)
    .update(timestamp + "." + payload)
    .digest("hex");
  assert.equal(
    verifyStripeSignature(payload + " ", "t=" + timestamp + ",v1=" + signature, secret, timestamp),
    false
  );
  assert.equal(
    verifyStripeSignature(payload, "t=" + timestamp + ",v1=" + signature, secret, timestamp + 301),
    false
  );
});
