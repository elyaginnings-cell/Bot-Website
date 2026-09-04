import { readSession } from "./session.js";

/**
 * Authentication for dashboard routes.
 *
 * The session itself contains staff: true, which can only be
 * created by the server after the account passes the high-staff
 * authorization check.
 */
export function requireAnySession(req) {
  let session;

  try {
    session = readSession(req);
  } catch {
    const err = new Error("Invalid session");
    err.status = 401;
    throw err;
  }

  if (!session) {
    const err = new Error("Not authenticated");
    err.status = 401;
    throw err;
  }

  if (session.staff !== true) {
    const err = new Error(
      "You are not authorized to access this dashboard."
    );
    err.status = 403;
    err.code = "STAFF_REQUIRED";
    throw err;
  }

  return session;
}

/**
 * Kept for compatibility with any code that may still use it.
 *
 * This is NO LONGER required for normal dashboard access.
 */
export function requireDiscordSession(req) {
  const session = requireAnySession(req);

  const discordToken = session.discordToken || null;

  if (!discordToken) {
    const err = new Error(
      "Discord OAuth is not connected in this browser."
    );
    err.status = 401;
    err.code = "DISCORD_NOT_LINKED";
    throw err;
  }

  return {
    session,
    discordToken,
  };
}