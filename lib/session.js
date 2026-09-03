import crypto from "crypto";

export const SESSION_COOKIE = "app_session";
export const DISCORD_COOKIE = "discord_session";

export function encrypt(text, secret) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(secret).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}.${encrypted}`;
}

export function decrypt(data, secret) {
  const parts = String(data || "").split(".");
  if (parts.length !== 2) throw new Error("Invalid session format");
  const iv = Buffer.from(parts[0], "hex");
  const key = crypto.createHash("sha256").update(secret).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(parts[1], "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
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
