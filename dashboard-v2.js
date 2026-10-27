const pageMeta = {
  overview: { title: "Overview", heading: "Your server, at a glance.", description: "A clearer home for your Discord community tools.", symbol: "◈", summary: "A quick view of your bot and selected server." },
  moderation: { title: "Moderation", heading: "Keep your community safe.", description: "Moderation tools and policy controls.", symbol: "⚖", summary: "Moderation and logging settings." },
  activity: { title: "Activity & levels", heading: "Make activity feel rewarding.", description: "Leveling, invites, and member activity.", symbol: "↗", summary: "Leveling and invite tracking settings." },
  economy: { title: "Economy & shop", heading: "Your community economy.", description: "Beans, rewards, and shop settings.", symbol: "☕", summary: "Currency and shop settings." },
  community: { title: "Community tools", heading: "Bring your community together.", description: "Community features in one place.", symbol: "✳", summary: "Welcome, verification, tickets, suggestions, QOTD, and bump." },
  "self-roles": { title: "Self roles", heading: "Role menus, without the mess.", description: "Review member-selectable role menus.", symbol: "♙", summary: "Existing role categories and linked roles." },
  staff: { title: "Staff tools", heading: "Give your team the right tools.", description: "Applications, leave requests, and staff workflows.", symbol: "♧", summary: "Staff applications, LOA, and activity checks." },
  settings: { title: "Settings", heading: "Make the dashboard yours.", description: "Server configuration and logging.", symbol: "⚙", summary: "Server channels and logging preferences." }
};
const pageFields = {
  moderation: [
    { path: ["automod", "enabled"], label: "Auto moderation", description: "Enable the existing automod configuration.", type: "toggle" },
    { path: ["warnChannelId"], label: "Warning channel ID", description: "Discord channel ID used for warning logs.", type: "text" },
    { path: ["dashboardLogChannelId"], label: "Dashboard log channel ID", description: "Discord channel ID for dashboard-related logs.", type: "text" }
  ],
  activity: [
    { path: ["levelingEnabled"], label: "Leveling", description: "Enable the existing leveling feature.", type: "toggle" },
    { path: ["levelUpChannelId"], label: "Level-up channel ID", description: "Channel where level-up notices are sent.", type: "text" },
    { path: ["inviteLeaderboardChannelId"], label: "Invite leaderboard channel ID", description: "Channel used for invite leaderboard output.", type: "text" }
  ],
  economy: [
    { path: ["currencyEnabled"], label: "Beans / currency", description: "Enable the existing currency feature.", type: "toggle" },
    { path: ["shopEnabled"], label: "Shop", description: "Enable the existing shop feature.", type: "toggle" }
  ],
  community: [
    { path: ["birthday", "enabled"], label: "Birthdays", description: "Use the saved birthday feature settings.", type: "toggle" },
    { path: ["bump", "enabled"], label: "Bump reminders", description: "Use the saved bump reminder settings.", type: "toggle" },
    { path: ["verification", "enabled"], label: "Verification", description: "Use the saved verification settings.", type: "toggle" },
    { path: ["suggestions", "enabled"], label: "Suggestions", description: "Use the saved suggestions settings.", type: "toggle" },
    { path: ["tickets", "enabled"], label: "Tickets", description: "Use the saved ticket settings.", type: "toggle" },
    { path: ["qotd", "enabled"], label: "Question of the day", description: "Use the saved QOTD settings.", type: "toggle" }
  ],
  staff: [
    { path: ["applications", "enabled"], label: "Staff applications", description: "Use the saved staff application settings.", type: "toggle" },
    { path: ["loa", "enabled"], label: "Leave of absence", description: "Use the saved LOA settings.", type: "toggle" },
    { path: ["activityCheck", "enabled"], label: "Staff activity checks", description: "Use the saved staff activity-check settings.", type: "toggle" }
  ],
  settings: [
    { path: ["logging", "enabled"], label: "Logging", description: "Use the saved logging settings.", type: "toggle" },
    { path: ["auditLog", "enabled"], label: "Audit log", description: "Use the saved audit log settings.", type: "toggle" }
  ]
};
const $ = (id) => document.getElementById(id);
const state = {
  page: "overview",
  guilds: [],
  guildId: sessionStorage.getItem("dashboard-v2-guild") || "",
  config: null,
  configLoadedFor: "",
  configLoading: false,
  saving: false,
  dirty: new Map(),
  loadToken: 0
};
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function showNotice(message) {
  const el = $("notice");
  el.textContent = message;
  el.hidden = !message;
}
function setBotStatus(online, label, detail = "") {
  $("bot-status-text").textContent = label;
  $("stat-bot").textContent = label;
  $("stat-bot-detail").textContent = detail || (online ? "Authenticated server-list request succeeded" : "Could not verify the bot connection");
  $("sidebar-status").textContent = online ? "Bot API reachable" : "Bot connection needs attention";
  $("bot-status-dot").className = online ? "online" : "offline";
  $("sidebar-status-dot").className = "status-dot " + (online ? "online" : "offline");
}
async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
    cache: "no-store",
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    const error = new Error(payload.error || "Your dashboard session is not authorized.");
    error.auth = true;
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
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
  if (state.guildId) sessionStorage.setItem("dashboard-v2-guild", state.guildId);
}
function getAt(object, path) {
  return path.reduce((value, key) => value && typeof value === "object" ? value[key] : undefined, object);
}
function buildPatch(path, value) {
  const patch = {};
  let cursor = patch;
  path.forEach((key, index) => {
    if (index === path.length - 1) cursor[key] = value;
    else { cursor[key] = {}; cursor = cursor[key]; }
  });
  return patch;
}
function mergePatch(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) target[key] = {};
      mergePatch(target[key], value);
    } else target[key] = value;
  }
  return target;
}
function renderFeaturePage() {
  const page = state.page;
  const meta = pageMeta[page];
  const host = $("feature-controls");
  const saveButton = $("save-config-button");
  const status = $("config-status");
  host.innerHTML = "";
  state.dirty.clear();
  saveButton.hidden = true;
  saveButton.disabled = true;
  status.textContent = "";
  if (page === "self-roles") {
    const categories = Array.isArray(state.config?.selfRoles?.categories) ? state.config.selfRoles.categories : [];
    const categoryCount = categories.length;
    const roleCount = categories.reduce((total, category) => total + (Array.isArray(category.children) ? category.children.reduce((n, child) => n + (Array.isArray(child.roles) ? child.roles.length : 0), 0) : (Array.isArray(category.roles) ? category.roles.length : 0)), 0);
    host.innerHTML = `<div class="readout-grid"><article class="readout-card"><span>Saved categories</span><strong>${categoryCount}</strong></article><article class="readout-card"><span>Configured roles</span><strong>${roleCount}</strong></article></div><div class="feature-footnote"><span>ⓘ</span><p>This page is read-only for now. The editor will not rewrite category IDs, role IDs, channel IDs, message IDs, or nested category data until the complete editor is connected.</p></div>`;
    return;
  }
  const fields = pageFields[page] || [];
  if (!fields.length) {
    host.innerHTML = '<p class="empty-state">No editable settings are mapped to this page yet.</p>';
    return;
  }
  if (!state.config || typeof state.config !== "object") {
    host.innerHTML = '<div class="empty-state"><strong>No saved configuration was found.</strong><p>To protect your data, this page will not create a default config or save over an empty object.</p></div>';
    return;
  }
  const form = document.createElement("form");
  form.className = "settings-form";
  form.innerHTML = fields.map((field, index) => {
    const current = getAt(state.config, field.path);
    const id = `setting-${page}-${index}`;
    if (field.type === "toggle") {
      const checked = current === true || current === 1 || current === "true";
      return `<label class="setting-row" for="${id}"><span class="setting-copy"><strong>${escapeHtml(field.label)}</strong><small>${escapeHtml(field.description)}</small></span><span class="toggle-control"><input id="${id}" type="checkbox" data-setting-index="${index}" ${checked ? "checked" : ""}><span class="toggle-track"></span></span></label>`;
    }
    return `<label class="setting-row text-setting" for="${id}"><span class="setting-copy"><strong>${escapeHtml(field.label)}</strong><small>${escapeHtml(field.description)}</small></span><input id="${id}" class="text-control" type="text" autocomplete="off" spellcheck="false" data-setting-index="${index}" value="${escapeHtml(current ?? "")}" placeholder="Not configured"></label>`;
  }).join("");
  host.append(form);
  saveButton.hidden = false;
  form.querySelectorAll("[data-setting-index]").forEach((input) => input.addEventListener("change", () => {
    const field = fields[Number(input.dataset.settingIndex)];
    let value;
    if (field.type === "toggle") value = input.checked;
    else value = input.value.trim() || null;
    const original = getAt(state.config, field.path);
    const normalizedOriginal = field.type === "toggle" ? (original === true || original === 1 || original === "true") : (original ?? null);
    if (value === normalizedOriginal) state.dirty.delete(input.dataset.settingIndex);
    else state.dirty.set(input.dataset.settingIndex, { field, value });
    saveButton.disabled = state.dirty.size === 0;
    status.textContent = state.dirty.size ? `${state.dirty.size} unsaved change${state.dirty.size === 1 ? "" : "s"}` : "All changes saved";
  }));
}
async function loadFeatureConfig() {
  if (state.page === "overview" || !state.guildId || !pageFields[state.page] && state.page !== "self-roles") return;
  if (state.configLoadedFor === state.guildId && state.config && !state.dirty.size) {
    renderFeaturePage();
    return;
  }
  const token = ++state.loadToken;
  state.configLoading = true;
  $("feature-controls").innerHTML = '<div class="loading-state"><span class="loading-spinner"></span><span>Loading saved settings…</span></div>';
  $("save-config-button").hidden = true;
  $("config-status").textContent = "Reading existing saved configuration";
  try {
    const result = await requestJson(`/api/config?guildId=${encodeURIComponent(state.guildId)}&mode=readonly`);
    if (token !== state.loadToken) return;
    state.config = result.config && typeof result.config === "object" ? result.config : null;
    state.configLoadedFor = state.guildId;
    renderFeaturePage();
    if (!result.found && !result.config) $("config-status").textContent = "No saved configuration found; nothing was changed.";
    else $("config-status").textContent = "Loaded saved configuration";
  } catch (error) {
    if (token !== state.loadToken) return;
    $("feature-controls").innerHTML = `<div class="empty-state"><strong>Could not load saved settings.</strong><p>${escapeHtml(error.message)}</p><p>No configuration was saved or reset.</p></div>`;
    $("config-status").textContent = "Load failed";
    if (error.auth) handleAuthError(error);
  } finally {
    if (token === state.loadToken) state.configLoading = false;
  }
}
async function saveFeatureConfig() {
  if (state.saving || !state.guildId || !state.config || !state.dirty.size) return;
  const patch = {};
  for (const { field, value } of state.dirty.values()) mergePatch(patch, buildPatch(field.path, value));
  state.saving = true;
  const button = $("save-config-button");
  button.disabled = true;
  button.textContent = "Saving…";
  $("config-status").textContent = "Saving to existing storage and syncing the bot…";
  try {
    const result = await requestJson(`/api/config?guildId=${encodeURIComponent(state.guildId)}&mode=readonly&mode=compat`, {
      method: "POST",
      body: JSON.stringify(patch)
    });
    state.config = result.config;
    state.configLoadedFor = state.guildId;
    state.dirty.clear();
    renderFeaturePage();
    if (result.warning) {
      $("config-status").textContent = result.warning;
      showNotice(result.warning);
    } else {
      $("config-status").textContent = result.savedToBot ? "Saved and synced with the bot." : "Saved to existing storage.";
      showNotice("");
    }
  } catch (error) {
    $("config-status").textContent = `Save failed: ${error.message}. Your edits remain on screen; retry when ready.`;
    button.disabled = false;
    if (error.auth) handleAuthError(error);
  } finally {
    state.saving = false;
    button.textContent = "Save changes";
    button.disabled = state.dirty.size === 0;
  }
}
function handleAuthError(error) {
  $("stat-session").textContent = error.status === 403 ? "Access denied" : "Sign-in required";
  $("stat-session-detail").textContent = error.message;
  setBotStatus(false, "Unavailable", "Sign in to check the bot connection");
  showNotice(error.status === 403 ? "This account is not authorized for the dashboard. The existing staff checks are still enforced." : "Your dashboard session was not accepted. Returning to the existing sign-in page…");
  if (error.status === 401) window.setTimeout(() => { window.location.href = "/"; }, 1200);
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
  document.title = `${meta.title} · Coffee Shop Dashboard`;
  if (location.hash !== "#" + state.page) history.replaceState(null, "", "#" + state.page);
  closeMobileNav();
  if (state.page !== "overview") loadFeatureConfig();
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
  $("refresh-button").innerHTML = "↻ <span>Loading</span>";
  try {
    // Only call the existing guild-list API during boot. The legacy bot-status
    // endpoint runs a database health query through a helper that may initialize
    // schema, so the replacement shell avoids that endpoint entirely.
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
    if (error.auth) handleAuthError(error);
    else {
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
  state.config = null;
  state.configLoadedFor = "";
  state.dirty.clear();
  updateSelectedGuild();
  $("guild-eyebrow").textContent = state.guilds.find((guild) => String(guild.id) === state.guildId)?.name?.toUpperCase() || "COFFEE SHOP CONTROL ROOM";
  if (state.page !== "overview") loadFeatureConfig();
});
$("refresh-button").addEventListener("click", loadDashboard);
$("save-config-button").addEventListener("click", saveFeatureConfig);
$("menu-button").addEventListener("click", () => document.body.classList.contains("nav-open") ? closeMobileNav() : openMobileNav());
$("mobile-scrim").addEventListener("click", closeMobileNav);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMobileNav(); });
window.addEventListener("hashchange", () => setPage(location.hash.slice(1) || "overview"));
setPage(location.hash.slice(1) || "overview");
loadDashboard();
