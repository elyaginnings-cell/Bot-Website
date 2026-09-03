import { readSession } from "./session.js";

/**
 * Returns { session, discordToken } or throws with .status = 401.
 * discordToken is required for any route that needs Discord guild access.
 */
export function requireDiscordSession(req) {
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

  const discordToken = session.discordToken || null;
  if (!discordToken) {
    const err = new Error(
      "Discord is not linked. Log in with Discord or link your Discord account."
    );
    err.status = 401;
    err.code = "DISCORD_NOT_LINKED";
    throw err;
  }

  return { session, discordToken };
}

/** Auth only — email session is enough (no Discord token required). */
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
  return session;
}
