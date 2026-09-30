import crypto from "crypto";

export const SESSION_COOKIE = "app_session";
export const DISCORD_COOKIE = "discord_session";
export const OAUTH_STATE_COOKIE = "oauth_state";

function keyFromSecret(secret) {
  if (!secret) throw new Error("Missing SESSION_SECRET");
  return crypto.createHash("sha256").update(String(secret)).digest();
}

/**
 * Authenticated session encryption.
 *
 * AES-GCM provides confidentiality + integrity. The old CBC format is no
 * longer accepted so existing sessions are invalidated after this upgrade.
 */
export function encrypt(text, secret) {
  const iv = crypto.randomBytes(12);
  const key = keyFromSecret(secret);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "v2." + iv.toString("hex") + "." + tag.toString("hex") + "." + encrypted.toString("hex");
}

export function decrypt(data, secret) {
  const parts = String(data || "").split(".");
  if (parts.length !== 4 || parts[0] !== "v2") {
    throw new Error("Invalid authenticated session format");
  }

  const iv = Buffer.from(parts[1], "hex");
  const tag = Buffer.from(parts[2], "hex");
  const ciphertext = Buffer.from(parts[3], "hex");

  if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid authenticated session payload");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function getCookie(req, name) {
  const header = req.headers?.cookie || "";
  for (const cookie of header.split(";")) {
    const index = cookie.indexOf("=");
    if (index === -1) continue;
    const key = cookie.slice(0, index).trim();
    const value = cookie.slice(index + 1).trim();
    if (key === name) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

function cookieFlags(name, value, maxAge) {
  const flags = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") flags.push("Secure");
  return flags.join("; ");
}

export function setSessionCookies(res, payload, discordToken) {
  const secret = process.env.SESSION_SECRET;
  const cookies = [
    cookieFlags(
      SESSION_COOKIE,
      encodeURIComponent(encrypt(JSON.stringify(payload), secret)),
      604800
    ),
  ];
  if (discordToken) {
    cookies.push(
      cookieFlags(
        DISCORD_COOKIE,
        encodeURIComponent(encrypt(discordToken, secret)),
        604800
      )
    );
  }
  res.setHeader("Set-Cookie", cookies);
}

export function clearSessionCookies(res) {
  res.setHeader("Set-Cookie", [
    cookieFlags(SESSION_COOKIE, "", 0),
    cookieFlags(DISCORD_COOKIE, "", 0),
  ]);
}

export function setOAuthStateCookie(res, state, purpose) {
  if (!state || !purpose) throw new Error("OAuth state requires state and purpose");
  const value = encodeURIComponent(String(purpose) + ":" + String(state));
  res.setHeader("Set-Cookie", cookieFlags(OAUTH_STATE_COOKIE, value, 600));
}

export function clearOAuthStateCookie(res) {
  res.setHeader("Set-Cookie", cookieFlags(OAUTH_STATE_COOKIE, "", 0));
}

export function consumeOAuthState(req, res, state, expectedPurpose) {
  const raw = getCookie(req, OAUTH_STATE_COOKIE);
  if (!raw || !state || !expectedPurpose) return false;

  const separator = raw.indexOf(":");
  if (separator <= 0) return false;

  const purpose = raw.slice(0, separator);
  const storedState = raw.slice(separator + 1);
  if (purpose !== expectedPurpose) return false;

  const expected = Buffer.from(storedState, "utf8");
  const actual = Buffer.from(String(state), "utf8");
  const valid =
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual);

  if (valid) clearOAuthStateCookie(res);
  return valid;
}

export function readSession(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Missing SESSION_SECRET");

  let payload = null;
  const appCookie = getCookie(req, SESSION_COOKIE);
  if (appCookie) {
    try {
      const parsed = JSON.parse(decrypt(appCookie, secret));
      if (parsed?.accountId) payload = parsed;
    } catch {
      // ignore bad app session
    }
  }

  let discordToken = null;
  const discordCookie = getCookie(req, DISCORD_COOKIE);
  if (discordCookie) {
    try {
      discordToken = decrypt(discordCookie, secret);
    } catch {
      // ignore bad discord session
    }
  }

  if (payload) {
    return {
      ...payload,
      discordToken: discordToken || payload.discordToken || null,
    };
  }

  if (discordToken) {
    return {
      v: 1,
      accountId: null,
      method: "discord",
      discordId: null,
      discordToken,
    };
  }

  return null;
}
