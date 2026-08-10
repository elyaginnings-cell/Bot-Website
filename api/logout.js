import { clearSessionCookie } from "./session.js";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", [
    clearSessionCookie(),
    "oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" +
      (process.env.NODE_ENV === "production" ? "; Secure" : ""),
  ]);

  return res.redirect(302, "/");
}