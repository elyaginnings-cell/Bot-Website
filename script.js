(function loadEmailLogin() {
  if (!document.querySelector('link[href="login-extra.css"]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "login-extra.css";
    document.head.appendChild(css);
  }
  if (!document.querySelector('script[src*="login-auth.js"]')) {
    const s = document.createElement("script");
    s.src = "login-auth.js?v=4";
    document.head.appendChild(s);
  }
  if (!document.querySelector('script[src*="theme-boot.js"]')) {
    const t = document.createElement("script");
    t.src = "theme-boot.js";
    document.head.appendChild(t);
  }
})();

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

document.addEventListener("DOMContentLoaded", () => {
  initViewMode();
  setupEventListeners();
  checkLogin();
});

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
    if (typeof window.openServerView === "function") {
      window.openServerView();
    } else {
      alert("Server View script not loaded. Hard refresh (Ctrl+Shift+R).");
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
  ["lvl-beans-base", "lvl-beans-linear", "lvl-beans-quad"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateLevelPreview);
  });
  updateShopTypeFields();
}

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

async function checkLogin() {
  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");
  try {
    const response = await fetch("/api/user", { credentials: "include", cache: "no-store" });
    if (!response.ok) {
      if (loginScreen) loginScreen.hidden = false;
      if (app) app.hidden = true;
      return;
    }
    const data = await response.json();
    if (!data?.authenticated || !data?.user) {
      if (loginScreen) loginScreen.hidden = false;
      if (app) app.hidden = true;
      return;
    }
    currentUser = data.user;
    syncGlobals();
    if (loginScreen) loginScreen.hidden = true;
    if (app) app.hidden = false;
    updateUserInterface(currentUser);
    restoreSelectedServer();
    startServerRefresh();
    refreshStorageStatus();
  } catch {
    if (loginScreen) loginScreen.hidden = false;
    if (app) app.hidden = true;
  }
}

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

function showSection(section) {
  document.querySelectorAll(".page-section").forEach((el) => el.classList.remove("active"));
  document.getElementById(section)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === section);
  });
  const titles = {
    overview: ["Overview", "Manage your Discord server systems."],
    moderation: ["Moderation", "Warn logs."],
    invites: ["Invites", "Leaderboard channel."],
    leveling: ["Leveling", "XP, Beans rewards, and level roles."],
    currency: ["Currency", "Daily, work, chat drops, coinflip."],
    shop: ["Shop", "Roles, boosts, packs, titles."],
    logs: ["Logs", "Confirm dashboard saves in Discord."],
    birthday: ["Birthday", "Announcements, roles, and bonus Beans."],
    settings: ["Settings", "Layout & general info."],
  };
  const info = titles[section];
  if (!info) return;
  document.getElementById("page-title").textContent = info[0];
  document.getElementById("page-description").textContent = info[1];
  window.scrollTo({ top: 0, behavior: "smooth" });
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
      const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
        : "https://cdn.discordapp.com/embed/avatars/0.png";
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
  selectedServer = {
    id: guild.id,
    name: guild.name || "Unknown",
    icon: guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
      : "https://cdn.discordapp.com/embed/avatars/0.png",
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
    localStorage.setItem("selectedServer", JSON.stringify(selectedServer));
    syncGlobals();
    renderServerDetails(selectedServer);
  } catch {}
}

async function loadGuildData() {
  if (!selectedServer?.id) return;
  try {
    const [channelsRes, rolesRes, configRes] = await Promise.all([
      fetch(`/api/channels?guildId=${selectedServer.id}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/roles?guildId=${selectedServer.id}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/config?guildId=${selectedServer.id}`, { credentials: "include", cache: "no-store" }),
    ]);
    if (channelsRes.ok) {
      channelsCache = (await channelsRes.json()).channels || [];
      fillChannelSelects();
    }
    if (rolesRes.ok) {
      rolesCache = (await rolesRes.json()).roles || [];
      fillRoleSelects();
    }
    if (configRes.ok) {
      currentConfig = (await configRes.json()).config || {};
      applyConfigToForms();
    }
    syncGlobals();
  } catch (e) {
    console.error(e);
  }
}

function fillChannelSelects() {
  ["warn-channel", "invite-channel", "dashboard-log-channel", "level-up-channel", "bday-channel"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    const emptyLabel = id === "level-up-channel" ? "Same channel they leveled in" : "Select a channel...";
    el.innerHTML = `<option value="">${emptyLabel}</option>`;
    channelsCache.forEach((ch) => {
      const opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = `#${ch.name}`;
      el.appendChild(opt);
    });
    if (current) el.value = current;
  });
}

function fillRoleSelects() {
  ["level-role", "shop-role", "bday-ping-role", "bday-role"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="">${id.startsWith("bday") ? "None" : "Select role..."}</option>`;
    rolesCache.forEach((role) => {
      const opt = document.createElement("option");
      opt.value = role.id;
      opt.textContent = role.name;
      el.appendChild(opt);
    });
    if (current) el.value = current;
  });
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el && v !== undefined && v !== null) el.value = v;
}
function setCheck(id, v) {
  const el = document.getElementById(id);
  if (el) el.checked = !!v;
}
function setStatus(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#57F287" : "#f23f43";
}
function formatLogResult(data, okMsg) {
  if (data?.logResult?.ok) return { ok: true, text: okMsg };
  if (data?.logResult?.error) return { ok: false, text: "⚠️ Saved, log failed: " + data.logResult.error };
  return { ok: true, text: okMsg };
}

async function saveConfig(body) {
  if (!selectedServer?.id) throw new Error("Select a server first.");
  const response = await fetch(`/api/config?guildId=${selectedServer.id}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Save failed");
  if (data.config) currentConfig = data.config;
  syncGlobals();
  return data;
}

function applyConfigToForms() {
  if (!currentConfig) return;
  const c = currentConfig;
  if (c.warnChannelId) setVal("warn-channel", c.warnChannelId);
  if (c.inviteLeaderboardChannelId) setVal("invite-channel", c.inviteLeaderboardChannelId);
  if (c.dashboardLogChannelId) setVal("dashboard-log-channel", c.dashboardLogChannelId);
  if (c.levelUpChannelId) setVal("level-up-channel", c.levelUpChannelId);
  else setVal("level-up-channel", "");
  const L = c.leveling || {};
  setCheck("lvl-enabled", L.enabled !== false);
  setCheck("lvl-messages", L.levelUpMessages !== false);
  setCheck("lvl-beans-enabled", L.beansEnabled !== false);
  setVal("lvl-xp-min", L.xpMin ?? 15);
  setVal("lvl-xp-max", L.xpMax ?? 25);
  setVal("lvl-xp-cd", L.xpCooldownSeconds ?? 60);
  setVal("lvl-beans-base", L.beansBase ?? 50);
  setVal("lvl-beans-linear", L.beansLinear ?? 50);
  setVal("lvl-beans-quad", L.beansQuadratic ?? 5);
  updateLevelPreview();
  const U = c.currency || {};
  setCheck("cur-enabled", U.enabled !== false);
  setVal("cur-name", U.currencyName ?? "Beans");
  setVal("cur-emoji", U.currencyEmoji ?? "☕");
  setVal("cur-daily-min", U.dailyMin ?? 150);
  setVal("cur-daily-max", U.dailyMax ?? 300);
  setVal("cur-streak-bonus", U.dailyStreakBonus ?? 25);
  setVal("cur-max-streak", U.dailyMaxStreak ?? 7);
  setVal("cur-work-min", U.workMin ?? 40);
  setVal("cur-work-max", U.workMax ?? 120);
  setVal("cur-work-cd", U.workCooldownMinutes ?? 30);
  setCheck("cur-chat-enabled", U.chatCoinsEnabled !== false);
  setVal("cur-chat-chance", U.chatCoinChance ?? 8);
  setVal("cur-chat-min", U.chatCoinMin ?? 5);
  setVal("cur-chat-max", U.chatCoinMax ?? 20);
  setVal("cur-chat-cd", U.chatCoinCooldownSeconds ?? 60);
  setCheck("cur-flip-enabled", U.coinflipEnabled !== false);
  setVal("cur-flip-max", U.coinflipMaxBet ?? 0);
  const S = c.shop || {};
  setCheck("shop-enabled", S.enabled !== false);
  renderLevelRolesList();
  renderShopItems();
  updateShopTypeFields();
  const B = c.birthday || {};
  setVal("bday-channel", B.channelId || "");
  setVal("bday-ping-role", B.pingRoleId || "");
  setVal("bday-role", B.birthdayRoleId || "");
  setVal("bday-bonus", B.bonusBeans ?? 500);
}

function updateLevelPreview() {
  const base = Number(document.getElementById("lvl-beans-base")?.value) || 0;
  const linear = Number(document.getElementById("lvl-beans-linear")?.value) || 0;
  const quad = Number(document.getElementById("lvl-beans-quad")?.value) || 0;
  const el = document.getElementById("lvl-preview");
  if (!el) return;
  const samples = [1, 5, 10, 20].map((lvl) => {
    const amt = Math.floor(base + lvl * linear + lvl * lvl * quad);
    return `L${lvl}=${amt.toLocaleString()}`;
  });
  el.textContent = "Preview: " + samples.join(" · ");
}

async function saveModeration() {
  try {
    setStatus("moderation-status", "Saving…", true);
    const data = await saveConfig({ warnChannelId: document.getElementById("warn-channel")?.value || null });
    const r = formatLogResult(data, "✅ Saved.");
    setStatus("moderation-status", r.text, r.ok);
  } catch (e) {
    setStatus("moderation-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveInvites() {
  try {
    setStatus("invites-status", "Saving…", true);
    const data = await saveConfig({ inviteLeaderboardChannelId: document.getElementById("invite-channel")?.value || null });
    const r = formatLogResult(data, "✅ Saved.");
    setStatus("invites-status", r.text, r.ok);
  } catch (e) {
    setStatus("invites-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveLeveling() {
  try {
    setStatus("leveling-status", "Saving…", true);
    const data = await saveConfig({
      levelingEnabled: document.getElementById("lvl-enabled")?.checked,
      levelUpChannelId: document.getElementById("level-up-channel")?.value || null,
      leveling: {
        enabled: document.getElementById("lvl-enabled")?.checked,
        levelUpMessages: document.getElementById("lvl-messages")?.checked,
        beansEnabled: document.getElementById("lvl-beans-enabled")?.checked,
        xpMin: Number(document.getElementById("lvl-xp-min")?.value) || 15,
        xpMax: Number(document.getElementById("lvl-xp-max")?.value) || 25,
        xpCooldownSeconds: Number(document.getElementById("lvl-xp-cd")?.value) || 60,
        beansBase: Number(document.getElementById("lvl-beans-base")?.value) || 0,
        beansLinear: Number(document.getElementById("lvl-beans-linear")?.value) || 0,
        beansQuadratic: Number(document.getElementById("lvl-beans-quad")?.value) || 0,
      },
    });
    const r = formatLogResult(data, "✅ Leveling saved.");
    setStatus("leveling-status", r.text, r.ok);
  } catch (e) {
    setStatus("leveling-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveCurrency() {
  try {
    setStatus("currency-status", "Saving…", true);
    const data = await saveConfig({
      currencyEnabled: document.getElementById("cur-enabled")?.checked,
      currency: {
        enabled: document.getElementById("cur-enabled")?.checked,
        currencyName: document.getElementById("cur-name")?.value || "Beans",
        currencyEmoji: document.getElementById("cur-emoji")?.value || "☕",
        dailyMin: Number(document.getElementById("cur-daily-min")?.value) || 150,
        dailyMax: Number(document.getElementById("cur-daily-max")?.value) || 300,
        dailyStreakBonus: Number(document.getElementById("cur-streak-bonus")?.value) || 25,
        dailyMaxStreak: Number(document.getElementById("cur-max-streak")?.value) || 7,
        workMin: Number(document.getElementById("cur-work-min")?.value) || 40,
        workMax: Number(document.getElementById("cur-work-max")?.value) || 120,
        workCooldownMinutes: Number(document.getElementById("cur-work-cd")?.value) || 30,
        chatCoinsEnabled: document.getElementById("cur-chat-enabled")?.checked,
        chatCoinChance: Number(document.getElementById("cur-chat-chance")?.value) || 8,
        chatCoinMin: Number(document.getElementById("cur-chat-min")?.value) || 5,
        chatCoinMax: Number(document.getElementById("cur-chat-max")?.value) || 20,
        chatCoinCooldownSeconds: Number(document.getElementById("cur-chat-cd")?.value) || 60,
        coinflipEnabled: document.getElementById("cur-flip-enabled")?.checked,
        coinflipMaxBet: Number(document.getElementById("cur-flip-max")?.value) || 0,
      },
    });
    const r = formatLogResult(data, "✅ Currency saved.");
    setStatus("currency-status", r.text, r.ok);
  } catch (e) {
    setStatus("currency-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveLogChannel() {
  try {
    setStatus("logs-status", "Saving…", true);
    const data = await saveConfig({ dashboardLogChannelId: document.getElementById("dashboard-log-channel")?.value || null });
    const r = formatLogResult(data, "✅ Log channel saved.");
    setStatus("logs-status", r.text, r.ok);
  } catch (e) {
    setStatus("logs-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function sendTestLog() {
  try {
    setStatus("logs-status", "Sending…", true);
    const data = await saveConfig({ testLog: true });
    const r = formatLogResult(data, "✅ Test log sent.");
    setStatus("logs-status", r.text, r.ok);
  } catch (e) {
    setStatus("logs-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveShopToggle() {
  try {
    setStatus("shop-status", "Saving…", true);
    const data = await saveConfig({ shopEnabled: document.getElementById("shop-enabled")?.checked });
    const r = formatLogResult(data, "✅ Shop toggle saved.");
    setStatus("shop-status", r.text, r.ok);
  } catch (e) {
    setStatus("shop-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function addLevelRole() {
  const level = Number(document.getElementById("level-number")?.value);
  const roleId = document.getElementById("level-role")?.value;
  if (!level || !roleId) return alert("Pick level + role");
  try {
    await saveConfig({ setLevelRole: { level, roleId } });
    await loadGuildData();
  } catch (e) {
    alert(e.message || "Failed");
  }
}

function renderLevelRolesList() {
  const list = document.getElementById("level-roles-list");
  if (!list) return;
  const roles = (currentConfig && currentConfig.levelRoles) || {};
  const entries = Object.entries(roles).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (!entries.length) {
    list.innerHTML = "<p class=\"form-hint\">No level roles yet.</p>";
    return;
  }
  list.innerHTML = entries
    .map(([lvl, roleId]) => {
      const role = rolesCache.find((r) => r.id === roleId);
      return `<div class=\"level-role-row\">Level ${lvl} → ${role ? role.name : roleId} <button type=\"button\" data-remove-level=\"${lvl}\">Remove</button></div>`;
    })
    .join("");
  list.querySelectorAll("[data-remove-level]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await saveConfig({ removeLevelRole: btn.getAttribute("data-remove-level") });
        await loadGuildData();
      } catch (e) {
        alert(e.message || "Failed");
      }
    });
  });
}

function renderShopItems() {
  const list = document.getElementById("shop-items-list");
  if (!list) return;
  const items = (currentConfig && currentConfig.shop && currentConfig.shop.items) || [];
  if (!items.length) {
    list.innerHTML = "<p class=\"form-hint\">No shop items yet.</p>";
    return;
  }
  list.innerHTML = items
    .map((item, idx) => `<div class=\"level-role-row\">${item.name || item.type} — ${item.price || 0} <button type=\"button\" data-remove-shop=\"${idx}\">Remove</button></div>`)
    .join("");
  list.querySelectorAll("[data-remove-shop]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await saveConfig({ removeShopItem: Number(btn.getAttribute("data-remove-shop")) });
        await loadGuildData();
      } catch (e) {
        alert(e.message || "Failed");
      }
    });
  });
}

async function addShopItem() {
  const type = document.getElementById("shop-type")?.value || "role";
  const name = document.getElementById("shop-name")?.value?.trim();
  const price = Number(document.getElementById("shop-price")?.value);
  if (!name || !price) return alert("Name + price required");
  const item = { type, name, price, description: document.getElementById("shop-desc")?.value || "" };
  const meta = SHOP_TYPE_META[type] || {};
  if (meta.role) item.roleId = document.getElementById("shop-role")?.value || null;
  if (meta.duration) item.durationHours = Number(document.getElementById("shop-duration")?.value) || 24;
  if (meta.amount) item.amount = Number(document.getElementById("shop-amount")?.value) || 1;
  if (meta.title) item.titleText = document.getElementById("shop-title-text")?.value || "";
  try {
    await saveConfig({ addShopItem: item });
    await loadGuildData();
  } catch (e) {
    alert(e.message || "Failed");
  }
}

async function saveBirthday() {
  try {
    setStatus("birthday-status", "Saving…", true);
    const data = await saveConfig({
      birthday: {
        channelId: document.getElementById("bday-channel")?.value || null,
        pingRoleId: document.getElementById("bday-ping-role")?.value || null,
        birthdayRoleId: document.getElementById("bday-role")?.value || null,
        bonusBeans: Number(document.getElementById("bday-bonus")?.value) || 0,
      },
    });
    const r = formatLogResult(data, "✅ Birthday settings saved.");
    setStatus("birthday-status", r.text, r.ok);
  } catch (e) {
    setStatus("birthday-status", "❌ " + (e.message || "Save failed"), false);
  }
}

async function refreshStorageStatus() {
  const el = document.getElementById("storage-status");
  if (!el) return;
  try {
    const res = await fetch("/api/bot-status", { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      el.textContent = "Unknown";
      return;
    }
    const data = await res.json();
    const s = data.storage || data;
    if (s.usingPostgres) el.textContent = "Postgres ✓";
    else if (s.hasDatabaseUrl === false) el.textContent = "File only ⚠️";
    else el.textContent = s.usingPostgres === false ? "File fallback" : "Online";
  } catch {
    el.textContent = "—";
  }
}
