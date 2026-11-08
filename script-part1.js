/* Legacy email-login bootstrap removed. guest-auth.js owns guest and account state. */

var currentUser = null;
var selectedServer = null;
var isLoadingServers = false;
var serverRefreshInterval = null;
var channelsCache = [];
var rolesCache = [];
var currentConfig = null;

function syncGlobals() {
  window.selectedServer = selectedServer;
  window.channelsCache = channelsCache;
  window.rolesCache = rolesCache;
  window.currentConfig = currentConfig;
  window.currentUser = currentUser;
}
syncGlobals();

function resolveGuildIcon(guild) {
  if (!guild) return "https://cdn.discordapp.com/embed/avatars/0.png";
  var icon = guild.icon;
  if (!icon) return "https://cdn.discordapp.com/embed/avatars/0.png";
  if (String(icon).indexOf("http") === 0) return icon;
  return "https://cdn.discordapp.com/icons/" + guild.id + "/" + icon + ".png?size=128";
}

const SHOP_TYPE_META = {
  role: { role: true, duration: false, amount: false, title: false, hint: "Permanent role: member keeps it forever." },
  temp_role: { role: true, duration: true, amount: false, title: false, hint: "Temporary role: auto-removed after hours." },
  xp_boost: { role: false, duration: true, amount: true, title: false, amountLabel: "Multiplier x100 (200 = 2x)", hint: "XP boost while chatting." },
  bean_boost: { role: false, duration: true, amount: true, title: false, amountLabel: "Multiplier x100 (200 = 2x)", hint: "Boosts daily, work, and chat Bean drops." },
  title: { role: false, duration: false, amount: false, title: true, hint: "Cosmetic title on /rank and /balance." },
  xp_pack: { role: false, duration: false, amount: true, title: false, amountLabel: "XP to grant", hint: "Instant XP." },
  bean_pack: { role: false, duration: false, amount: true, title: false, amountLabel: "Beans to grant", hint: "Instant Beans." },
  mystery: { role: false, duration: false, amount: true, title: false, amountLabel: "Max Beans in box", hint: "Random Beans." },
  work_skip: { role: false, duration: false, amount: false, title: false, hint: "One free /work." },
  daily_reset: { role: false, duration: false, amount: false, title: false, hint: "Reset daily claim." },
};

function bootDashboard() {
  if (window.__dashboardBooted) return;
  window.__dashboardBooted = true;
  initViewMode();
  setupEventListeners();
  checkLogin();
}
window.bootDashboard = bootDashboard;

function initViewMode() {
  const select = document.getElementById("view-mode");
  const saved = localStorage.getItem("dashboardViewMode") || "auto";
  applyViewMode(saved);
  if (select) {
    select.value = saved;
    select.addEventListener("change", () => applyViewMode(select.value));
  }
}

function applyViewMode(mode) {
  const allowed = ["auto", "desktop", "mobile"];
  if (!allowed.includes(mode)) mode = "auto";
  document.body.classList.remove("mode-auto", "mode-desktop", "mode-mobile");
  document.body.classList.add(`mode-${mode}`);
  localStorage.setItem("dashboardViewMode", mode);
  const select = document.getElementById("view-mode");
  if (select && select.value !== mode) select.value = mode;
}

function setupEventListeners() {
  document.getElementById("login-button")?.addEventListener("click", () => {
    window.location.href = "/api/login";
  });
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.getAttribute("data-tab");
      if (section) showSection(section);
    });
  });
  document.querySelectorAll(".quick-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.getAttribute("data-section-link");
      if (section) showSection(section);
    });
  });
  document.getElementById("server-button")?.addEventListener("click", loadServers);
  function launchServerView(e) {
    if (e) e.preventDefault();
    if (window.dashboardDraftIsDirty && window.dashboardDraftIsDirty()) {
      window.showDashboardDraftNotice?.();
      return;
    }
    // Prefer the public API from server-view.js
    if (typeof window.openServerView === "function") {
      window.openServerView();
      return;
    }
    // Fallback: server-view.js also binds its own click handlers on these
    // buttons. Do NOT alert — that caused a false "script not loaded" popup
    // every time even though Server View opened fine afterwards.
    var view = document.getElementById("server-view");
    if (view) {
      // Trigger the native handler path if present; otherwise show the view
      view.hidden = false;
      document.body.classList.add("server-view-open");
      var app = document.getElementById("app");
      if (app) app.hidden = true;
    }
  }
  document.getElementById("open-server-view")?.addEventListener("click", launchServerView);
  document.getElementById("nav-server-view")?.addEventListener("click", launchServerView);
  document.getElementById("logout-button")?.addEventListener("click", () => {
    window.location.href = "/api/logout";
  });
  document.getElementById("save-moderation")?.addEventListener("click", saveModeration);
  document.getElementById("save-invites")?.addEventListener("click", saveInvites);
  document.getElementById("save-leveling")?.addEventListener("click", saveLeveling);
  document.getElementById("save-currency")?.addEventListener("click", saveCurrency);
  document.getElementById("add-level-role")?.addEventListener("click", addLevelRole);
  document.getElementById("save-logs")?.addEventListener("click", saveLogChannel);
  document.getElementById("test-log")?.addEventListener("click", sendTestLog);
  document.getElementById("save-shop-toggle")?.addEventListener("click", saveShopToggle);
  document.getElementById("add-shop-item")?.addEventListener("click", addShopItem);
  document.getElementById("shop-type")?.addEventListener("change", updateShopTypeFields);
  document.getElementById("save-birthday")?.addEventListener("click", saveBirthday);
  document.getElementById("save-dashboard-tabs")?.addEventListener("click", saveDashboardTabs);
  document.getElementById("save-custom-emoji")?.addEventListener("click", saveCustomEmoji);
  document.getElementById("emoji-file")?.addEventListener("change", previewCustomEmojiFile);
  ["lvl-beans-base", "lvl-beans-linear", "lvl-beans-quad"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateLevelPreview);
  });
  updateShopTypeFields();
  initDashboardDrafts();
}


const DASHBOARD_DRAFT_FIELDS = {
  moderation: ["warn-channel"],
  invites: ["invite-channel"],
  leveling: ["lvl-enabled","lvl-messages","lvl-beans-enabled","level-up-channel","lvl-xp-min","lvl-xp-max","lvl-xp-cd","lvl-beans-base","lvl-beans-linear","lvl-beans-quad"],
  currency: ["cur-enabled","cur-name","cur-emoji","cur-daily-min","cur-daily-max","cur-streak-bonus","cur-max-streak","cur-work-min","cur-work-max","cur-work-cd","cur-chat-enabled","cur-chat-chance","cur-chat-min","cur-chat-max","cur-chat-cd","cur-flip-enabled","cur-flip-max"],
  shop: ["shop-enabled"],
  logs: ["dashboard-log-channel"],
  birthday: ["bday-channel","bday-ping-role","bday-role","bday-bonus"],
  settings: ["dashboard-tab-moderation","dashboard-tab-invites","dashboard-tab-leveling","dashboard-tab-currency","dashboard-tab-emojis","dashboard-tab-shop","dashboard-tab-logs","dashboard-tab-birthday","dashboard-tab-account","dashboard-tab-owner-billing"],
  verification: ["verify-enabled","verify-channel","verify-role","verify-log-channel","verify-btn-label","verify-title","verify-desc","verify-monitor-mins"]
};
let dashboardDraftSnapshot = "";
let dashboardDraftSaving = false;

function dashboardDraftValue() {
  const section = document.querySelector(".page-section.active")?.id || "overview";
  const ids = DASHBOARD_DRAFT_FIELDS[section] || [];
  const values = ids.map((id) => {
    const el = document.getElementById(id);
    if (!el) return [id, null];
    return [id, el.type === "checkbox" || el.type === "radio" ? el.checked : el.value];
  });
  const systemToggle = document.querySelector(".page-section.active [data-system-toggle] input[data-sys-key]");
  if (systemToggle) values.push(["system:" + systemToggle.dataset.sysKey, systemToggle.checked]);
  return JSON.stringify(values);
}
function dashboardDraftIsDirty() {
  const section = document.querySelector(".page-section.active")?.id || "overview";
  const hasSystemToggle = !!document.querySelector(".page-section.active [data-system-toggle] input[data-sys-key]");
  if (!DASHBOARD_DRAFT_FIELDS[section] && !hasSystemToggle) return false;
  return dashboardDraftValue() !== dashboardDraftSnapshot;
}
function captureDashboardDraft() {
  dashboardDraftSnapshot = dashboardDraftValue();
  updateDashboardDraftBar();
}
function showDashboardDraftNotice() {
  const message = document.getElementById("dashboard-draft-message");
  if (message) message.textContent = "Save or cancel your changes before switching tabs or servers.";
  const bar = document.getElementById("dashboard-draft-bar");
  if (bar) bar.classList.add("attention");
}
function updateDashboardDraftBar() {
  const bar = document.getElementById("dashboard-draft-bar");
  if (!bar) return;
  const dirty = dashboardDraftIsDirty();
  bar.hidden = !dirty && !dashboardDraftSaving;
  bar.classList.toggle("attention", false);
  const message = document.getElementById("dashboard-draft-message");
  if (message && !dashboardDraftSaving) message.textContent = dirty ? "You have unsaved changes." : "";
}
function initDashboardDrafts() {
  const bar = document.getElementById("dashboard-draft-bar");
  if (!bar || bar.dataset.bound === "true") return;
  bar.dataset.bound = "true";
  document.addEventListener("click", (event) => {
    const protectedAction = event.target.closest("#add-level-role, #add-shop-item, [data-remove-level], [data-remove-shop]");
    if (protectedAction && dashboardDraftIsDirty()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showDashboardDraftNotice();
    }
  }, true);
  // Delegate so dynamically injected feature controls are tracked too.
  ["input", "change"].forEach((type) => document.addEventListener(type, (event) => {
    const el = event.target;
    if (!el || !el.matches || !el.matches("#app .page-section input, #app .page-section select, #app .page-section textarea")) return;
    if (["file", "button", "submit"].includes(el.type)) return;
    updateDashboardDraftBar();
  }, true));
  document.getElementById("dashboard-draft-save")?.addEventListener("click", saveDashboardDraft);
  document.getElementById("dashboard-draft-cancel")?.addEventListener("click", cancelDashboardDraft);
  captureDashboardDraft();
}
async function cancelDashboardDraft() {
  const section = document.querySelector(".page-section.active")?.id || "overview";
  if (typeof window.restoreSystemTabDraft === "function") window.restoreSystemTabDraft();
  if (section === "verification" && typeof window.loadGuildData === "function") {
    try { await window.loadGuildData(); } catch (error) { console.error("[dashboard-drafts] cancel reload failed", error); }
  } else if (typeof applyConfigToForms === "function") {
    applyConfigToForms();
  }
  if (typeof applyDashboardTabs === "function") applyDashboardTabs();
  captureDashboardDraft();
}
async function saveDashboardDraft() {
  if (dashboardDraftSaving || !dashboardDraftIsDirty()) return;
  const section = document.querySelector(".page-section.active")?.id || "overview";
  const actions = {
    moderation: saveModeration,
    invites: saveInvites,
    leveling: saveLeveling,
    currency: saveCurrency,
    shop: saveShopToggle,
    logs: saveLogChannel,
    birthday: saveBirthday,
    settings: saveDashboardTabs,
    verification: () => typeof window.saveVerificationDraft === "function" ? window.saveVerificationDraft() : false
  };
  const action = actions[section];
  const hasSystemToggle = !!document.querySelector(".page-section.active [data-system-toggle] input[data-sys-key]");
  if (typeof action !== "function" && !hasSystemToggle) return;
  dashboardDraftSaving = true;
  updateDashboardDraftBar();
  const saveButton = document.getElementById("dashboard-draft-save");
  if (saveButton) saveButton.disabled = true;
  try {
    let saved = true;
    if (typeof action === "function") saved = (await action()) === true;
    if (saved && hasSystemToggle && typeof window.saveSystemTabDraft === "function") await window.saveSystemTabDraft();
    if (saved) captureDashboardDraft();
    else showDashboardDraftNotice();
  } finally {
    dashboardDraftSaving = false;
    if (saveButton) saveButton.disabled = false;
    updateDashboardDraftBar();
  }
}
window.dashboardDraftIsDirty = dashboardDraftIsDirty;
window.captureDashboardDraft = captureDashboardDraft;
window.updateDashboardDraftBar = updateDashboardDraftBar;
window.showDashboardDraftNotice = showDashboardDraftNotice;

function updateShopTypeFields() {
  const type = document.getElementById("shop-type")?.value || "role";
  const meta = SHOP_TYPE_META[type] || SHOP_TYPE_META.role;
  const roleWrap = document.getElementById("shop-role-wrap");
  const durWrap = document.getElementById("shop-duration-wrap");
  const amtWrap = document.getElementById("shop-amount-wrap");
  const titleWrap = document.getElementById("shop-title-wrap");
  const hint = document.getElementById("shop-type-hint");
  const amtLabel = document.getElementById("shop-amount-label");
  if (roleWrap) roleWrap.hidden = !meta.role;
  if (durWrap) durWrap.hidden = !meta.duration;
  if (amtWrap) amtWrap.hidden = !meta.amount;
  if (titleWrap) titleWrap.hidden = !meta.title;
  if (hint) hint.textContent = meta.hint || "";
  if (amtLabel && meta.amountLabel) amtLabel.textContent = meta.amountLabel;
}

/* checkLogin is supplied by guest-auth.js; the legacy version hid the dashboard for guests. */

function updateUserInterface(user) {
  const username = user.global_name || user.username || user.email || "User";
  const usernameEl = document.getElementById("username");
  if (usernameEl) usernameEl.textContent = username;
  const welcome = document.getElementById("welcome-name");
  if (welcome) welcome.textContent = username;
  const avatar = document.getElementById("user-avatar");
  if (avatar) {
    const discordId = user.discord_id || user.id;
    avatar.src =
      user.avatar && discordId && String(discordId).length > 15
        ? `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.png?size=128`
        : "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

function showSection(section, force) {
  if (!force && window.dashboardDraftIsDirty && window.dashboardDraftIsDirty()) {
    window.showDashboardDraftNotice?.();
    return false;
  }
  document.querySelectorAll(".page-section").forEach((el) => el.classList.remove("active"));
  document.getElementById(section)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === section);
  });
  const titles = {
    overview: ["Overview", "Manage your Discord server systems."],
    moderation: ["Moderation", "Warn logs."],
    verification: ["Verification", "Configure the verification button, role, and channels."],
    invites: ["Invites", "Leaderboard channel."],
    leveling: ["Leveling", "XP, Beans rewards, and level roles."],
    currency: ["Currency", "Daily, work, chat drops, coinflip."],
    emojis: ["Custom Emojis", "Import, organize, and choose your server emojis."],
    shop: ["Shop", "Roles, boosts, packs, titles."],
    logs: ["Logs", "Confirm dashboard saves in Discord."],
    birthday: ["Birthday", "Announcements, roles, and bonus Beans."],
    settings: ["Settings", "Layout & general info."],
    account: ["Account", "Subscription, storage, and connected servers."],
    "owner-billing": ["Owner Billing", "Manage customer plans and account subscriptions."],
  };
  const info = titles[section];
  if (!info) return;
  document.getElementById("page-title").textContent = info[0];
  document.getElementById("page-description").textContent = info[1];
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.captureDashboardDraft?.();
  return true;
}

async function loadServers() {
  const list = document.getElementById("server-list");
  if (!list || isLoadingServers) return;
  if (list.dataset.open === "true") {
    list.innerHTML = "";
    list.dataset.open = "false";
    list.hidden = true;
    return;
  }
  isLoadingServers = true;
  list.hidden = false;
  list.dataset.open = "true";
  list.innerHTML = `<div class="server-item"><span>Loading...</span></div>`;
  try {
    const response = await fetch("/api/guilds", { credentials: "include", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      list.innerHTML = `<div class="server-item"><span>❌ ${data.error || response.status}</span></div>`;
      return;
    }
    const guilds = data.guilds || [];
    if (!guilds.length) {
      list.innerHTML = `<div class="server-item"><span>No servers found.</span></div>`;
      return;
    }
    list.innerHTML = "";
    guilds.forEach((guild) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "server-item";
      const iconUrl = resolveGuildIcon(guild);
      const img = document.createElement("img");
      img.src = iconUrl;
      const name = document.createElement("span");
      name.textContent = guild.name || "Unknown";
      button.appendChild(img);
      button.appendChild(name);
      button.addEventListener("click", () => selectServer(guild));
      list.appendChild(button);
    });
  } catch {
    list.innerHTML = `<div class="server-item"><span>❌ Failed to load.</span></div>`;
  } finally {
    isLoadingServers = false;
  }
}

async function selectServer(guild) {
  if (!guild?.id) return;
  if (window.dashboardDraftIsDirty && window.dashboardDraftIsDirty()) {
    window.showDashboardDraftNotice?.();
    return;
  }
  selectedServer = {
    id: guild.id,
    name: guild.name || "Unknown",
    icon: resolveGuildIcon(guild),
    owner: !!guild.owner,
    members: guild.approximate_member_count || 0,
    online: guild.approximate_presence_count || 0,
  };
  localStorage.setItem("selectedServer", JSON.stringify(selectedServer));
  syncGlobals();
  renderServerDetails(selectedServer);
  closeServerList();
  await loadGuildData();
}

function renderServerDetails(server) {
  if (!server) return;
  document.getElementById("selected-server-name").textContent = server.name;
  document.getElementById("server-member-count").textContent = Number(server.members || 0).toLocaleString();
  document.getElementById("server-online-count").textContent = Number(server.online || 0).toLocaleString();
  document.getElementById("server-owner-status").textContent = server.owner ? "Owner" : "Administrator";
  const iconEl = document.getElementById("selected-server-icon");
  if (iconEl && server.icon) {
    iconEl.innerHTML = "";
    const img = document.createElement("img");
    img.src = server.icon;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:8px";
    iconEl.appendChild(img);
  }
}

function closeServerList() {
  const list = document.getElementById("server-list");
  if (!list) return;
  list.innerHTML = "";
  list.dataset.open = "false";
  list.hidden = true;
}

function restoreSelectedServer() {
  try {
    const saved = localStorage.getItem("selectedServer");
    if (!saved) return;
    const server = JSON.parse(saved);
    if (!server?.id) return;
    selectedServer = server;
    syncGlobals();
    renderServerDetails(server);
    loadGuildData();
    refreshSelectedServer();
  } catch {
    localStorage.removeItem("selectedServer");
  }
}

function startServerRefresh() {
  if (serverRefreshInterval) clearInterval(serverRefreshInterval);
  serverRefreshInterval = setInterval(refreshSelectedServer, 30000);
}

async function refreshSelectedServer() {
  if (!selectedServer?.id) return;
  try {
    const response = await fetch("/api/guilds", { credentials: "include", cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const updated = (data.guilds || []).find((g) => g.id === selectedServer.id);
    if (!updated) return;
    selectedServer.members = updated.approximate_member_count || 0;
    selectedServer.online = updated.approximate_presence_count || 0;
    selectedServer.owner = !!updated.owner;
    selectedServer.icon = resolveGuildIcon(updated);
    localStorage.setItem("selectedServer", JSON.stringify(selectedServer));
    syncGlobals();
    renderServerDetails(selectedServer);
  } catch {}
}

let guildDataLoadSequence = 0;

function resetGuildConfigForms() {
  document.querySelectorAll("#app .page-section input, #app .page-section select, #app .page-section textarea").forEach((el) => {
    if (el.type === "checkbox" || el.type === "radio") el.checked = !!el.defaultChecked;
    else if (el.tagName === "SELECT") el.selectedIndex = 0;
    else el.value = el.defaultValue || "";
  });
}

async function loadGuildData() {
  const guildId = String(selectedServer?.id || "");
  if (!guildId) return;
  const requestSequence = ++guildDataLoadSequence;

  // Never leave the previous server's roles/config visible while the next
  // server is loading. Responses from older requests are ignored below.
  channelsCache = [];
  rolesCache = [];
  currentConfig = {};
  syncGlobals();
  resetGuildConfigForms();
  fillChannelSelects();
  fillRoleSelects();
  window.guildConfigLoading = true;
  window.dispatchEvent(new CustomEvent("dashboard:guild-loading", { detail: { guildId } }));

  try {
    const [channelsRes, rolesRes, configRes] = await Promise.all([
      fetch(`/api/channels?guildId=${encodeURIComponent(guildId)}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/roles?guildId=${encodeURIComponent(guildId)}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/config?guildId=${encodeURIComponent(guildId)}`, { credentials: "include", cache: "no-store" }),
    ]);

    if (!configRes.ok) {
      throw new Error("Could not load this server's saved configuration. Saving is paused to protect its existing settings.");
    }
    const [channelsData, rolesData, configData] = await Promise.all([
      channelsRes.ok ? channelsRes.json() : Promise.resolve({ channels: [] }),
      rolesRes.ok ? rolesRes.json() : Promise.resolve({ roles: [] }),
      configRes.json(),
    ]);

    // A fast server switch can finish requests out of order. Only the latest
    // selected guild is allowed to update shared dashboard state.
    if (requestSequence !== guildDataLoadSequence || String(selectedServer?.id || "") !== guildId) return;

    channelsCache = Array.isArray(channelsData.channels) ? channelsData.channels : [];
    rolesCache = Array.isArray(rolesData.roles) ? rolesData.roles : [];
    currentConfig = configData.config && typeof configData.config === "object" ? configData.config : {};
    syncGlobals();
    fillChannelSelects();
    fillRoleSelects();
    applyConfigToForms();
    window.captureDashboardDraft?.();
    if (typeof applyDashboardTabs === "function") applyDashboardTabs();
    if (typeof loadCustomEmojis === "function") loadCustomEmojis();
    window.guildConfigLoading = false;
    window.dispatchEvent(new CustomEvent("dashboard:guild-loaded", { detail: { guildId } }));
  } catch (e) {
    if (requestSequence === guildDataLoadSequence && String(selectedServer?.id || "") === guildId) {
      console.error(e);
      // Keep saves locked when config failed to load; otherwise an empty UI
      // could overwrite a server's existing configuration.
      window.guildConfigLoading = true;
      window.dispatchEvent(new CustomEvent("dashboard:guild-load-error", { detail: { guildId, message: e.message } }));
    }
  }
}
