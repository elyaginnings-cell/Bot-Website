let currentUser = null;
let selectedServer = null;
let isLoadingServers = false;
let serverRefreshInterval = null;
let channelsCache = [];
let rolesCache = [];
let currentConfig = null;

const SHOP_TYPE_META = {
  role: { role: true, duration: false, amount: false, title: false, hint: "Permanent role: member keeps it forever." },
  temp_role: { role: true, duration: true, amount: false, title: false, hint: "Temporary role: auto-removed after hours." },
  xp_boost: { role: false, duration: true, amount: true, title: false, amountLabel: "Multiplier ×100 (200 = 2x)", hint: "XP boost while chatting. Amount 200 = 2× XP." },
  bean_boost: { role: false, duration: true, amount: true, title: false, amountLabel: "Multiplier ×100 (200 = 2x)", hint: "Boosts daily, work, and chat Bean drops." },
  title: { role: false, duration: false, amount: false, title: true, hint: "Cosmetic title on /rank and /balance." },
  xp_pack: { role: false, duration: false, amount: true, title: false, amountLabel: "XP to grant", hint: "Instant XP dump into their level." },
  bean_pack: { role: false, duration: false, amount: true, title: false, amountLabel: "Beans to grant", hint: "Instant Beans added to balance." },
  mystery: { role: false, duration: false, amount: true, title: false, amountLabel: "Max Beans in box", hint: "Random Beans between ~25% of max and max." },
  work_skip: { role: false, duration: false, amount: false, title: false, hint: "One free /work with no cooldown." },
  daily_reset: { role: false, duration: false, amount: false, title: false, hint: "Lets them claim /daily again immediately." },
};

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkLogin();
});

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
      loginScreen.hidden = false;
      app.hidden = true;
      return;
    }
    const data = await response.json();
    if (!data?.authenticated || !data?.user) {
      loginScreen.hidden = false;
      app.hidden = true;
      return;
    }
    currentUser = data.user;
    loginScreen.hidden = true;
    app.hidden = false;
    updateUserInterface(currentUser);
    restoreSelectedServer();
    startServerRefresh();
  } catch {
    loginScreen.hidden = false;
    app.hidden = true;
  }
}

function updateUserInterface(user) {
  const username = user.global_name || user.username || "Discord User";
  document.getElementById("username").textContent = username;
  const welcome = document.getElementById("welcome-name");
  if (welcome) welcome.textContent = username;
  const avatar = document.getElementById("user-avatar");
  if (avatar) {
    avatar.src = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
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
    shop: ["Shop", "Roles, boosts, packs, titles — private /shop."],
    logs: ["Logs", "Confirm dashboard saves in Discord."],
    settings: ["Settings", "General info."],
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
    if (!response.ok) throw new Error("fail");
    const data = await response.json();
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
  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
  selectedServer = {
    id: guild.id,
    name: guild.name || "Unknown",
    icon: iconUrl,
    owner: !!guild.owner,
    members: guild.approximate_member_count || 0,
    online: guild.approximate_presence_count || 0,
  };
  localStorage.setItem("selectedServer", JSON.stringify(selectedServer));
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
  } catch (e) {
    console.error(e);
  }
}

function fillChannelSelects() {
  ["warn-channel", "invite-channel", "dashboard-log-channel", "level-up-channel"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    const emptyLabel =
      id === "level-up-channel"
        ? "Same channel they leveled in"
        : "Select a channel...";
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
  ["level-role", "shop-role"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="">Select role...</option>`;
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

function renderLevelRolesList() {
  const list = document.getElementById("level-roles-list");
  if (!list) return;
  const roles = currentConfig?.levelRoles || {};
  const keys = Object.keys(roles).map(Number).sort((a, b) => a - b);
  if (!keys.length) {
    list.innerHTML = `<p class="empty-list">No level roles yet.</p>`;
    return;
  }
  list.innerHTML = keys
    .map((lvl) => {
      const roleId = roles[String(lvl)];
      const role = rolesCache.find((r) => r.id === roleId);
      const name = role ? role.name : roleId;
      return `<div class="level-role-row"><span><strong>Level ${lvl}</strong> → ${name}</span>
        <button type="button" class="remove-btn" data-level="${lvl}">Remove</button></div>`;
    })
    .join("");
  list.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const level = Number(btn.getAttribute("data-level"));
      try {
        await saveConfig({ removeLevelRole: level });
        if (currentConfig?.levelRoles) delete currentConfig.levelRoles[String(level)];
        renderLevelRolesList();
        setStatus("leveling-status", `Removed level ${level}`, true);
      } catch (e) {
        setStatus("leveling-status", e.message, false);
      }
    });
  });
}

function typePretty(t) {
  return (SHOP_TYPE_META[t] && t) ? t.replace(/_/g, " ") : t;
}

function renderShopItems() {
  const list = document.getElementById("shop-items-list");
  if (!list) return;
  const items = currentConfig?.shop?.items || [];
  if (!items.length) {
    list.innerHTML = `<p class="empty-list">No shop items yet.</p>`;
    return;
  }
  list.innerHTML = items
    .map((item) => {
      const role = item.roleId ? rolesCache.find((r) => r.id === item.roleId) : null;
      const bits = [
        `<strong>${escapeHtml(item.name)}</strong>`,
        `${Number(item.price).toLocaleString()} ☕`,
        `<em>${escapeHtml(typePretty(item.type))}</em>`,
      ];
      if (role) bits.push(escapeHtml(role.name));
      if (item.durationHours) bits.push(`${item.durationHours}h`);
      if (item.amount != null) bits.push(`amt ${item.amount}`);
      if (item.titleText) bits.push(`“${escapeHtml(item.titleText)}”`);
      return `<div class="level-role-row">
        <span>${bits.join(" · ")}</span>
        <button type="button" class="remove-btn" data-shop-id="${item.id}">Remove</button>
      </div>`;
    })
    .join("");

  list.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-shop-id");
      try {
        await saveConfig({ removeShopItem: id });
        if (currentConfig?.shop?.items) {
          currentConfig.shop.items = currentConfig.shop.items.filter((i) => i.id !== id);
        }
        renderShopItems();
        setStatus("shop-status", "Item removed", true);
      } catch (e) {
        setStatus("shop-status", e.message, false);
      }
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLogResult(data, fallbackOk) {
  if (data?.logResult) {
    if (data.logResult.ok) return { ok: true, text: "✅ Saved & logged in Discord" };
    return {
      ok: false,
      text: "⚠️ Saved, but log failed: " + (data.logResult.error || "unknown error"),
    };
  }
  return { ok: true, text: fallbackOk };
}

async function saveConfig(body) {
  if (!selectedServer?.id) {
    alert("Choose a server first.");
    return null;
  }
  const response = await fetch(`/api/config?guildId=${selectedServer.id}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Save failed");
  if (data.config) currentConfig = data.config;
  return data;
}

function setStatus(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? "#57F287" : "#f23f43";
}

function num(id, fallback) {
  const v = Number(document.getElementById(id)?.value);
  return Number.isFinite(v) ? v : fallback;
}

async function saveModeration() {
  try {
    const data = await saveConfig({ warnChannelId: document.getElementById("warn-channel")?.value || null });
    const r = formatLogResult(data, "✅ Saved");
    setStatus("moderation-status", r.text, r.ok);
  } catch (e) {
    setStatus("moderation-status", "❌ " + e.message, false);
  }
}

async function saveInvites() {
  try {
    const data = await saveConfig({
      inviteLeaderboardChannelId: document.getElementById("invite-channel")?.value || null,
    });
    const r = formatLogResult(data, "✅ Saved");
    setStatus("invites-status", r.text, r.ok);
  } catch (e) {
    setStatus("invites-status", "❌ " + e.message, false);
  }
}

async function saveLeveling() {
  try {
    const channelId = document.getElementById("level-up-channel")?.value || null;
    const data = await saveConfig({
      levelUpChannelId: channelId,
      leveling: {
        enabled: document.getElementById("lvl-enabled")?.checked !== false,
        levelUpMessages: document.getElementById("lvl-messages")?.checked !== false,
        beansEnabled: document.getElementById("lvl-beans-enabled")?.checked !== false,
        xpMin: num("lvl-xp-min", 15),
        xpMax: num("lvl-xp-max", 25),
        xpCooldownSeconds: num("lvl-xp-cd", 60),
        beansBase: num("lvl-beans-base", 50),
        beansLinear: num("lvl-beans-linear", 50),
        beansQuadratic: num("lvl-beans-quad", 5),
      },
    });
    const r = formatLogResult(data, "✅ Leveling settings saved");
    setStatus("leveling-status", r.text, r.ok);
  } catch (e) {
    setStatus("leveling-status", "❌ " + e.message, false);
  }
}

async function saveCurrency() {
  try {
    const data = await saveConfig({
      currency: {
        enabled: document.getElementById("cur-enabled")?.checked !== false,
        currencyName: document.getElementById("cur-name")?.value?.trim() || "Beans",
        currencyEmoji: document.getElementById("cur-emoji")?.value?.trim() || "☕",
        dailyMin: num("cur-daily-min", 150),
        dailyMax: num("cur-daily-max", 300),
        dailyStreakBonus: num("cur-streak-bonus", 25),
        dailyMaxStreak: num("cur-max-streak", 7),
        workMin: num("cur-work-min", 40),
        workMax: num("cur-work-max", 120),
        workCooldownMinutes: num("cur-work-cd", 30),
        chatCoinsEnabled: document.getElementById("cur-chat-enabled")?.checked !== false,
        chatCoinChance: num("cur-chat-chance", 8),
        chatCoinMin: num("cur-chat-min", 5),
        chatCoinMax: num("cur-chat-max", 20),
        chatCoinCooldownSeconds: num("cur-chat-cd", 60),
        coinflipEnabled: document.getElementById("cur-flip-enabled")?.checked !== false,
        coinflipMaxBet: num("cur-flip-max", 0),
      },
    });
    const r = formatLogResult(data, "✅ Currency settings saved");
    setStatus("currency-status", r.text, r.ok);
  } catch (e) {
    setStatus("currency-status", "❌ " + e.message, false);
  }
}

async function saveShopToggle() {
  try {
    const data = await saveConfig({
      shopEnabled: document.getElementById("shop-enabled")?.checked !== false,
    });
    const r = formatLogResult(data, "✅ Shop setting saved");
    setStatus("shop-status", r.text, r.ok);
  } catch (e) {
    setStatus("shop-status", "❌ " + e.message, false);
  }
}

async function addShopItem() {
  const type = document.getElementById("shop-type")?.value || "role";
  const meta = SHOP_TYPE_META[type] || SHOP_TYPE_META.role;
  const name = document.getElementById("shop-name")?.value?.trim();
  const price = Number(document.getElementById("shop-price")?.value);
  const roleId = document.getElementById("shop-role")?.value || null;
  const description = document.getElementById("shop-desc")?.value?.trim() || "";
  const durationHours = document.getElementById("shop-duration")?.value;
  const amount = document.getElementById("shop-amount")?.value;
  const titleText = document.getElementById("shop-title-text")?.value?.trim() || "";

  if (!name) return alert("Enter an item name.");
  if (!Number.isFinite(price) || price < 0) return alert("Enter a valid price.");
  if (meta.role && !roleId) return alert("Select a role for this item type.");

  try {
    const data = await saveConfig({
      addShopItem: {
        type,
        name,
        price,
        roleId: meta.role ? roleId : null,
        description,
        durationHours: meta.duration ? Number(durationHours) || 24 : null,
        amount: meta.amount ? Number(amount) || 0 : null,
        titleText: meta.title ? titleText || name : null,
      },
    });
    renderShopItems();
    document.getElementById("shop-name").value = "";
    document.getElementById("shop-price").value = "";
    document.getElementById("shop-desc").value = "";
    const r = formatLogResult(data, "✅ Shop item added");
    setStatus("shop-status", r.text, r.ok);
  } catch (e) {
    setStatus("shop-status", "❌ " + e.message, false);
  }
}

async function addLevelRole() {
  const level = Number(document.getElementById("level-number")?.value);
  const roleId = document.getElementById("level-role")?.value;
  if (!level || level < 1) return alert("Enter a level.");
  if (!roleId) return alert("Select a role.");
  try {
    const data = await saveConfig({ setLevelRole: { level, roleId } });
    if (!currentConfig.levelRoles) currentConfig.levelRoles = {};
    currentConfig.levelRoles[String(level)] = roleId;
    renderLevelRolesList();
    document.getElementById("level-number").value = "";
    const r = formatLogResult(data, `✅ Level ${level} role saved`);
    setStatus("leveling-status", r.text, r.ok);
  } catch (e) {
    setStatus("leveling-status", "❌ " + e.message, false);
  }
}

async function saveLogChannel() {
  const channelId = document.getElementById("dashboard-log-channel")?.value;
  if (!channelId) return alert("Select a log channel first.");
  try {
    const data = await saveConfig({ dashboardLogChannelId: channelId });
    if (data?.logResult?.ok) {
      setStatus("logs-status", "✅ Log channel saved — check Discord", true);
    } else {
      setStatus(
        "logs-status",
        "⚠️ Channel saved, but message failed: " + (data?.logResult?.error || "unknown"),
        false
      );
    }
  } catch (e) {
    setStatus("logs-status", "❌ " + e.message, false);
  }
}

async function sendTestLog() {
  const channelId = document.getElementById("dashboard-log-channel")?.value;
  if (!channelId && !currentConfig?.dashboardLogChannelId) {
    return alert("Select and save a log channel first.");
  }
  try {
    const body = { testLog: true };
    if (channelId) body.dashboardLogChannelId = channelId;
    const data = await saveConfig(body);
    if (data?.logResult?.ok) {
      setStatus("logs-status", "✅ Test log posted", true);
    } else {
      setStatus("logs-status", "❌ Log failed: " + (data?.logResult?.error || "unknown"), false);
    }
  } catch (e) {
    setStatus("logs-status", "❌ " + e.message, false);
  }
}
