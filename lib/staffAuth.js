import { normalizeEmail } from "./accounts.js";

/*
 * High-staff authorization
 *
 * Configure one or both of these environment variables in Vercel:
 *
 * STAFF_EMAILS=person1@example.com,person2@example.com
 * STAFF_DISCORD_IDS=123456789012345678,987654321098765432
 *
 * Emails and Discord IDs are compared exactly.
 */

function getStaffEmails() {
  return String(process.env.STAFF_EMAILS || "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

function getStaffDiscordIds() {
  return String(process.env.STAFF_DISCORD_IDS || "")
    .split(",")
    .map((id) => String(id).trim())
    .filter(Boolean);
}

export function isStaffEmail(email) {
  if (!email) return false;

  const normalized = normalizeEmail(email);
  return getStaffEmails().includes(normalized);
}

export function isStaffDiscordId(discordId) {
  if (!discordId) return false;

  return getStaffDiscordIds().includes(String(discordId).trim());
}

export function isStaffUser({ email, discordId } = {}) {
  return isStaffEmail(email) || isStaffDiscordId(discordId);
}

export function requireStaffConfiguration() {
  const hasEmails = getStaffEmails().length > 0;
  const hasDiscordIds = getStaffDiscordIds().length > 0;

  if (!hasEmails && !hasDiscordIds) {
    const error = new Error(
      "No high-staff accounts are configured. Set STAFF_EMAILS and/or STAFF_DISCORD_IDS."
    );
    error.status = 500;
    error.code = "STAFF_NOT_CONFIGURED";
    throw error;
  }
}