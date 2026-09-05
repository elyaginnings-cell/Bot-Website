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
