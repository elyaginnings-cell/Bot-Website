let currentUser = null;
let selectedServer = null;
let isLoadingServers = false;
let serverRefreshInterval = null;
let channelsCache = [];
let rolesCache = [];
let currentConfig = null;

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  checkLogin();
});

function setupEventListeners() {
  const loginBtn = document.getElementById("login-button");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      window.location.href = "/api/login";
    });
  }

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

  const serverBtn = document.getElementById("server-button");
  if (serverBtn) serverBtn.addEventListener("click", loadServers);

  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    window.location.href = "/api/logout";
  });

  const saveMod = document.getElementById("save-moderation");
  if (saveMod) saveMod.addEventListener("click", saveModeration);

  const saveInv = document.getElementById("save-invites");
  if (saveInv) saveInv.addEventListener("click", saveInvites);

  const addLevel = document.getElementById("add-level-role");
  if (addLevel) addLevel.addEventListener("click", addLevelRole);

  const levelingEnabled = document.getElementById("leveling-enabled");
  if (levelingEnabled) {
    levelingEnabled.addEventListener("change", async () => {
      if (!selectedServer) return;
      await saveConfig({ levelingEnabled: levelingEnabled.checked });
      setStatus("leveling-status", levelingEnabled.checked ? "Leveling enabled" : "Leveling disabled", true);
    });
  }
}

/* ===================== LOGIN ===================== */

async function checkLogin() {
  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");

  try {
    const response = await fetch("/api/user", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      // Not logged in — show login screen, DO NOT auto-redirect
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

    // Logged in
    currentUser = data.user;
    if (loginScreen) loginScreen.hidden = true;
    if (app) app.hidden = false;

    updateUserInterface(currentUser);
    restoreSelectedServer();
    startServerRefresh();
  } catch (error) {
    console.error("Login check failed:", error);
    if (loginScreen) loginScreen.hidden = false;
    if (app) app.hidden = true;
  }
}

function updateUserInterface(user) {
  if (!user) return;
  const username = user.global_name || user.username || "Discord User";

  const usernameEl = document.getElementById("username");
  if (usernameEl) usernameEl.textContent = username;

  const welcome = document.getElementById("welcome-name");
  if (welcome) welcome.textContent = username;

  const avatar = document.getElementById("user-avatar");
  if (avatar) {
    avatar.src = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

/* ===================== NAV ===================== */

function showSection(section) {
  document.querySelectorAll(".page-section").forEach((el) => el.classList.remove("active"));
  const target = document.getElementById(section);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-tab") === section) btn.classList.add("active");
  });

  const titles = {
    overview: ["Overview", "Manage your Discord server systems."],
    moderation: ["Moderation", "Warn logs and punishment system."],
    invites: ["Invites", "Leaderboard and invite ranks."],
    leveling: ["Leveling", "XP and automatic level roles."],
    settings: ["Settings", "General configuration."],
  };

  const info = titles[section];
  if (!info) return;

  const title = document.getElementById("page-title");
  const description = document.getElementById("page-description");
  if (title) title.textContent = info[0];
  if (description) description.textContent = info[1];
}

/* ===================== SERVERS ===================== */

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
  list.innerHTML = `<div class="server-item"><span>Loading servers...</span></div>`;

  try {
    const response = await fetch("/api/guilds", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) throw new Error("Failed to fetch guilds");

    const data = await response.json();
    const guilds = Array.isArray(data.guilds) ? data.guilds : [];

    if (guilds.length === 0) {
      list.innerHTML = `<div class="server-item"><span>No servers found (bot must be in the server).</span></div>`;
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
      img.alt = "";

      const name = document.createElement("span");
      name.textContent = guild.name || "Unknown Server";

      button.appendChild(img);
      button.appendChild(name);
      button.addEventListener("click", () => selectServer(guild));
      list.appendChild(button);
    });
  } catch (error) {
    console.error(error);
    list.innerHTML = `<div class="server-item"><span>❌ Unable to load servers.</span></div>`;
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
    name: guild.name || "Unknown Server",
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

  const nameEl = document.getElementById("selected-server-name");
  if (nameEl) nameEl.textContent = server.name;

  const memberCount = document.getElementById("server-member-count");
  if (memberCount) memberCount.textContent = Number(server.members || 0).toLocaleString();

  const onlineCount = document.getElementById("server-online-count");
  if (onlineCount) onlineCount.textContent = Number(server.online || 0).toLocaleString();

  const ownerStatus = document.getElementById("server-owner-status");
  if (ownerStatus) ownerStatus.textContent = server.owner ? "Owner" : "Administrator";

  const iconEl = document.getElementById("selected-server-icon");
  if (iconEl && server.icon) {
    iconEl.innerHTML = "";
    const img = document.createElement("img");
    img.src = server.icon;
    img.alt = server.name || "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
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
    const response = await fetch("/api/guilds", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    const guilds = Array.isArray(data.guilds) ? data.guilds : [];
    const updated = guilds.find((g) => g.id === selectedServer.id);
    if (!updated) return;

    selectedServer.members = updated.approximate_member_count || 0;
    selectedServer.online = updated.approximate_presence_count || 0;
    selectedServer.owner = !!updated.owner;
    localStorage.setItem("selectedServer", JSON.stringify(selectedServer));
    renderServerDetails(selectedServer);
  } catch (e) {
    console.error(e);
  }
}

/* ===================== GUILD DATA ===================== */

async function loadGuildData() {
  if (!selectedServer?.id) return;

  try {
    const [channelsRes, rolesRes, configRes] = await Promise.all([
      fetch(`/api/channels?guildId=${selectedServer.id}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/roles?guildId=${selectedServer.id}`, { credentials: "include", cache: "no-store" }),
      fetch(`/api/config?guildId=${selectedServer.id}`, { credentials: "include", cache: "no-store" }),
    ]);

    if (channelsRes.ok) {
      const d = await channelsRes.json();
      channelsCache = d.channels || [];
      fillChannelSelects();
    }

    if (rolesRes.ok) {
      const d = await rolesRes.json();
      rolesCache = d.roles || [];
      fillRoleSelect();
    }

    if (configRes.ok) {
      const d = await configRes.json();
      currentConfig = d.config || {};
      applyConfigToForms();
    }
  } catch (error) {
    console.error("Failed to load guild data:", error);
  }
}

function fillChannelSelects() {
  const selects = ["warn-channel", "invite-channel"];

  selects.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const current = el.value;
    el.innerHTML = `<option value="">Select a channel...</option>`;

    channelsCache.forEach((ch) => {
      const opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = `#${ch.name}`;
      el.appendChild(opt);
    });

    if (current) el.value = current;
  });
}

function fillRoleSelect() {
  const el = document.getElementById("level-role");
  if (!el) return;

  el.innerHTML = `<option value="">Select a role...</option>`;
  rolesCache.forEach((role) => {
    const opt = document.createElement("option");
    opt.value = role.id;
    opt.textContent = role.name;
    el.appendChild(opt);
  });
}

function applyConfigToForms() {
  if (!currentConfig) return;

  const warn = document.getElementById("warn-channel");
  if (warn && currentConfig.warnChannelId) {
    warn.value = currentConfig.warnChannelId;
  }

  const invite = document.getElementById("invite-channel");
  if (invite && currentConfig.inviteLeaderboardChannelId) {
    invite.value = currentConfig.inviteLeaderboardChannelId;
  }

  const levelingEnabled = document.getElementById("leveling-enabled");
  if (levelingEnabled) {
    levelingEnabled.checked = currentConfig.levelingEnabled !== false;
  }

  renderLevelRolesList();
}

function renderLevelRolesList() {
  const list = document.getElementById("level-roles-list");
  if (!list) return;

  const roles = currentConfig?.levelRoles || {};
  const keys = Object.keys(roles).map(Number).sort((a, b) => a - b);

  if (keys.length === 0) {
    list.innerHTML = `<p class="empty-list">No level roles yet. Add one above.</p>`;
    return;
  }

  list.innerHTML = keys
    .map((lvl) => {
      const roleId = roles[String(lvl)];
      const role = rolesCache.find((r) => r.id === roleId);
      const name = role ? role.name : roleId;
      return `
        <div class="level-role-row">
          <span><strong>Level ${lvl}</strong> → ${name}</span>
          <button type="button" class="remove-btn" data-level="${lvl}">Remove</button>
        </div>`;
    })
    .join("");

  list.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const level = Number(btn.getAttribute("data-level"));
      await saveConfig({ removeLevelRole: level });
      if (currentConfig?.levelRoles) delete currentConfig.levelRoles[String(level)];
      renderLevelRolesList();
      setStatus("leveling-status", `Removed level ${level} role`, true);
    });
  });
}

/* ===================== SAVE ===================== */

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
  if (!response.ok) {
    throw new Error(data.error || "Save failed");
  }

  if (data.config) currentConfig = data.config;
  return data;
}

function setStatus(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? "#57F287" : "#f23f43";
}

async function saveModeration() {
  if (!selectedServer) return alert("Choose a server first.");
  const channelId = document.getElementById("warn-channel")?.value || null;

  try {
    await saveConfig({ warnChannelId: channelId || null });
    setStatus("moderation-status", "✅ Moderation settings saved", true);
  } catch (e) {
    setStatus("moderation-status", "❌ " + e.message, false);
  }
}

async function saveInvites() {
  if (!selectedServer) return alert("Choose a server first.");
  const channelId = document.getElementById("invite-channel")?.value || null;

  try {
    await saveConfig({ inviteLeaderboardChannelId: channelId || null });
    setStatus("invites-status", "✅ Invite settings saved", true);
  } catch (e) {
    setStatus("invites-status", "❌ " + e.message, false);
  }
}

async function addLevelRole() {
  if (!selectedServer) return alert("Choose a server first.");

  const level = Number(document.getElementById("level-number")?.value);
  const roleId = document.getElementById("level-role")?.value;

  if (!level || level < 1) return alert("Enter a valid level.");
  if (!roleId) return alert("Select a role.");

  try {
    await saveConfig({ setLevelRole: { level, roleId } });
    if (!currentConfig.levelRoles) currentConfig.levelRoles = {};
    currentConfig.levelRoles[String(level)] = roleId;
    renderLevelRolesList();
    document.getElementById("level-number").value = "";
    setStatus("leveling-status", `✅ Level ${level} role saved`, true);
  } catch (e) {
    setStatus("leveling-status", "❌ " + e.message, false);
  }
}
