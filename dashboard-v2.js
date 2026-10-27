const pageMeta = {
  overview: { title: "Overview", heading: "Your server, at a glance.", description: "A clearer home for your Discord community tools.", symbol: "◈", summary: "A quick view of your bot and selected server." },
  moderation: { title: "Moderation", heading: "Keep your community safe.", description: "Moderation tools and policy controls.", symbol: "⚖", summary: "Moderation settings are being connected to their existing API contracts." },
  activity: { title: "Activity & levels", heading: "Make activity feel rewarding.", description: "Leveling, invites, and member activity.", symbol: "↗", summary: "Leveling, invite tracking, and activity checks." },
  economy: { title: "Economy & shop", heading: "Your community economy.", description: "Beans, rewards, and shop settings.", symbol: "☕", summary: "Currency, shop items, and rewards." },
  community: { title: "Community tools", heading: "Bring your community together.", description: "Community features in one place.", symbol: "✳", summary: "Welcome, verification, tickets, suggestions, QOTD, birthdays, and more." },
  "self-roles": { title: "Self roles", heading: "Role menus, without the mess.", description: "Manage member-selectable roles carefully.", symbol: "♙", summary: "Role categories, role IDs, and linked channels." },
  staff: { title: "Staff tools", heading: "Give your team the right tools.", description: "Applications, leave requests, and staff workflows.", symbol: "♧", summary: "Staff applications, LOA, and AI staff assistance." },
  settings: { title: "Settings", heading: "Make the dashboard yours.", description: "Server configuration and dashboard preferences.", symbol: "⚙", summary: "Logging, server preferences, and integration settings." }
};
const $ = (id) => document.getElementById(id);
const state = { page: "overview", guilds: [], guildId: sessionStorage.getItem("dashboard-v2-guild") || "", status: null };
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
function showNotice(message) { const el = $("notice"); el.textContent = message; el.hidden = !message; }
function setBotStatus(online, label, detail = "") {
  $("bot-status-text").textContent = label;
  $("stat-bot").textContent = label;
  $("stat-bot-detail").textContent = detail || (online ? "Bot API responded successfully" : "Could not verify the bot connection");
  $("sidebar-status").textContent = online ? "Bot service reachable" : "Bot connection needs attention";
  $("bot-status-dot").className = online ? "online" : "offline";
  $("sidebar-status-dot").className = "status-dot " + (online ? "online" : "offline");
}
async function requestJson(path) {
  const response = await fetch(path, { credentials: "same-origin", headers: { Accept: "application/json" }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    const error = new Error(payload.error || "Your dashboard session is not authorized.");
    error.auth = true;
    error.status = response.status;
    throw error;
  }
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}
function renderGuildPicker() {
  const select = $("guild-select");
  select.innerHTML = "";
  if (!state.guilds.length) {
    select.add(new Option("No servers returned", ""));
    select.disabled = true;
    $("selected-server").textContent = "No server selected";
    $("stat-server").textContent = "Unavailable";
    $("stat-server-detail").textContent = "No manageable servers were returned";
    return;
  }
  state.guilds.forEach((guild) => select.add(new Option(guild.name || "Unknown server", String(guild.id))));
  if (!state.guilds.some((guild) => String(guild.id) === state.guildId)) state.guildId = String(state.guilds[0].id);
  select.value = state.guildId;
  select.disabled = false;
  updateSelectedGuild();
}
function updateSelectedGuild() {
  const guild = state.guilds.find((item) => String(item.id) === state.guildId);
  const name = guild?.name || "No server selected";
  $("selected-server").textContent = name;
  $("stat-server").textContent = name;
  $("stat-server-detail").textContent = guild ? (guild.approximate_member_count ? `${Number(guild.approximate_member_count).toLocaleString()} members reported by Discord` : "Server selected") : "Choose a server above";
  sessionStorage.setItem("dashboard-v2-guild", state.guildId);
}
function setPage(page) {
  state.page = pageMeta[page] ? page : "overview";
  const meta = pageMeta[state.page];
  document.querySelectorAll("[data-page]").forEach((link) => link.classList.toggle("active", link.dataset.page === state.page));
  $("topbar-title").textContent = meta.title;
  $("page-heading").textContent = meta.heading;
  $("page-description").textContent = meta.description;
  $("guild-eyebrow").textContent = state.guilds.find((guild) => String(guild.id) === state.guildId)?.name?.toUpperCase() || "COFFEE SHOP CONTROL ROOM";
  $("overview-page").hidden = state.page !== "overview";
  $("feature-page").hidden = state.page === "overview";
  $("feature-symbol").textContent = meta.symbol;
  $("feature-title").textContent = meta.title;
  $("feature-summary").textContent = meta.summary;
  if (state.page !== "overview") {
    $("feature-state-title").textContent = "Compatibility mapping in progress";
    $("feature-state-detail").textContent = "The new workspace is in place. Its controls will be enabled only after each setting is mapped to the current API and verified to preserve existing saved values.";
  }
  document.title = `${meta.title} · Coffee Shop Dashboard`;
  if (location.hash !== "#" + state.page) history.replaceState(null, "", "#" + state.page);
  closeMobileNav();
}
function closeMobileNav() {
  document.body.classList.remove("nav-open");
  $("menu-button").setAttribute("aria-expanded", "false");
  $("menu-button").setAttribute("aria-label", "Open navigation");
  $("mobile-scrim").hidden = true;
}
function openMobileNav() {
  document.body.classList.add("nav-open");
  $("menu-button").setAttribute("aria-expanded", "true");
  $("menu-button").setAttribute("aria-label", "Close navigation");
  $("mobile-scrim").hidden = false;
}
async function loadDashboard() {
  showNotice("");
  $("refresh-button").disabled = true;
  $("refresh-button").textContent = "↻ Loading";
  try {
    // Boot uses only the existing guild-list API. The legacy bot-status endpoint
    // runs a database health query through a helper that may initialize schema,
    // so this replacement shell avoids that endpoint entirely.
    const guildData = await requestJson("/api/guilds");
    state.guilds = Array.isArray(guildData.guilds) ? guildData.guilds : [];
    renderGuildPicker();
    setBotStatus(true, "API reachable", "The authenticated server-list request succeeded");
    $("stat-session").textContent = "Authorized";
    $("stat-session-detail").textContent = "Existing dashboard session accepted";
    if (!state.guilds.length) {
      setBotStatus(false, "No servers", "The API responded but returned no manageable servers");
      showNotice("Your session is working, but the server list is empty. Check that the bot is in a server and that the dashboard API is configured.");
    }
    setPage(state.page);
  } catch (error) {
    if (error.auth) {
      $("stat-session").textContent = error.status === 403 ? "Access denied" : "Sign-in required";
      $("stat-session-detail").textContent = error.message;
      setBotStatus(false, "Unavailable", "Sign in to check the bot connection");
      showNotice(error.status === 403 ? "This account is not authorized for the dashboard. The existing login and staff checks are still enforced." : "Your dashboard session was not accepted. Taking you back to the existing sign-in page…");
      if (error.status === 401) window.setTimeout(() => { window.location.href = "/"; }, 1200);
    } else {
      $("stat-session").textContent = "Unverified";
      $("stat-session-detail").textContent = "Could not confirm the existing session";
      setBotStatus(false, "Unavailable", "Could not reach the dashboard API");
      showNotice(error.message || "Could not load dashboard data. Try refreshing.");
    }
  } finally {
    $("refresh-button").disabled = false;
    $("refresh-button").innerHTML = "↻ <span>Refresh</span>";
  }
}
document.querySelectorAll("[data-page]").forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  setPage(link.dataset.page);
}));
document.querySelectorAll('a[href^="#"]:not([data-page])').forEach((link) => link.addEventListener("click", (event) => {
  const page = link.getAttribute("href").slice(1);
  if (pageMeta[page]) { event.preventDefault(); setPage(page); }
}));
$("guild-select").addEventListener("change", (event) => {
  state.guildId = event.target.value;
  updateSelectedGuild();
  $("guild-eyebrow").textContent = state.guilds.find((guild) => String(guild.id) === state.guildId)?.name?.toUpperCase() || "COFFEE SHOP CONTROL ROOM";
});
$("refresh-button").addEventListener("click", loadDashboard);
$("menu-button").addEventListener("click", () => document.body.classList.contains("nav-open") ? closeMobileNav() : openMobileNav());
$("mobile-scrim").addEventListener("click", closeMobileNav);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMobileNav(); });
window.addEventListener("hashchange", () => setPage(location.hash.slice(1) || "overview"));
setPage(location.hash.slice(1) || "overview");
loadDashboard();
