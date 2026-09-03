import { clearSessionCookies } from "../lib/session.js";

export default function handler(req, res) {
  clearSessionCookies(res);
  return res.redirect(302, "/");
}
