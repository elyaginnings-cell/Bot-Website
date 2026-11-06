import { findById } from "./accounts.js";

export async function getConnectedDiscordId(session) {
  if (session?.discordId) return String(session.discordId);

  if (session?.accountId) {
    try {
      const account = await findById(session.accountId);
      if (account?.discord_id) return String(account.discord_id);
    } catch (error) {
      console.warn("[discord-identity] account lookup failed:", error.message);
    }
  }

  if (session?.discordToken) {
    try {
      const response = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: "Bearer " + session.discordToken },
        cache: "no-store",
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) return null;
      const user = await response.json();
      if (/^\d{17,20}$/.test(String(user?.id || ""))) return String(user.id);
    } catch (error) {
      console.warn("[discord-identity] OAuth identity lookup failed:", error.message);
    }
  }
  return null;
}
