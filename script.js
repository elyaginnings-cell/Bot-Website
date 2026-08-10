let currentUser = null;
let selectedServer = null;
let isLoadingServers = false;

document.addEventListener("DOMContentLoaded", () => {
  setupDeviceMode();
  setupEventListeners();
  checkLogin();
  restoreSelectedServer();
});

function setupDeviceMode() {
  const pcBtn = document.getElementById("select-pc");
  const mobileBtn = document.getElementById("select-mobile");
  const modal = document.getElementById("device-modal");

  const setMode = (mode) => {
    document.body.classList.remove("mode-pc", "mode-mobile", "modal-active");
    document.body.classList.add(`mode-${mode}`);
    if (modal) modal.classList.add("hidden");
    localStorage.setItem("dashboardMode", mode);
  };

  const savedMode = localStorage.getItem("dashboardMode");
  if (savedMode === "pc" || savedMode === "mobile") {
    setMode(savedMode);
  } else {
    document.body.classList.add("modal-active");
  }

  pcBtn?.addEventListener("click", () => setMode("pc"));
  mobileBtn?.addEventListener("click", () => setMode("mobile"));
}

function setupEventListeners() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.tab || button.dataset.section;
      if (section) showSection(section);
    });
  });

  document.querySelectorAll(".quick-card").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.sectionLink;
      if (section) showSection(section);
    });
  });

  document.getElementById("server-button")?.addEventListener("click", loadServers);
  document.getElementById("logout-button")?.addEventListener("click", logout);
  document.getElementById("save-invite-settings")?.addEventListener("click", saveInviteSettings);
  document.getElementById("save-reward")?.addEventListener("click", saveReward);
  document.getElementById("save-settings")?.addEventListener("click", saveSettings);

  document.addEventListener("click", (event) => {
    const picker = document.querySelector(".server-picker");
    const list = document.getElementById("server-list");
    if (!picker || !list || list.hidden) return;
    if (!picker.contains(event.target)) closeServerList();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeServerList();
  });
}

async function checkLogin() {
  try {
    const response = await fetch("/api/user", {
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401) {
      window.location.href = "/api/login";
      return;
    }

    if (!response.ok) throw new Error("Unable to verify login.");

    const data = await response.json();

    if (!data?.authenticated || !data?.user) {
      window.location.href = "/api/login";
      return;
    }

    currentUser = data.user;
    updateUserInterface(currentUser);
  } catch (error) {
    console.error("Login check failed:", error);
    window.location.href = "/api/login";
  }
}

function updateUserInterface(user) {
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
    avatar.hidden = false;
  }
}

function showSection(section) {
  const target = document.getElementById(section);
  if (!target) return;

  document.querySelectorAll(".page-section").forEach((el) => {
    el.classList.toggle("active", el.id === section);
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    const navTarget = button.dataset.tab || button.dataset.section;
    button.classList.toggle("active", navTarget === section);
  });

  const titles = {
    overview: ["Overview", "Manage your Discord server."],
    invites: ["Invite Tracker", "Track and manage member invites."],
    rewards: ["Rewards", "Automatically reward your members."],
    settings: ["Settings", "Configure your bot."],
  };

  const [titleText, descriptionText] = titles[section] || titles.overview;

  const title = document.getElementById("page-title");
  const description = document.getElementById("page-description");

  if (title) title.textContent = titleText;
  if (description) description.textContent = descriptionText;
}

async function loadServers() {
  const list = document.getElementById("server-list");
  const button = document.getElementById("server-button");

  if (!list || !button || isLoadingServers) return;

  if (!list.hidden) {
    closeServerList();
    return;
  }

  isLoadingServers = true;
  list.hidden = false;
  button.setAttribute("aria-expanded", "true");
  list.innerHTML = `<div class="server-item"><span>Loading your servers...</span></div>`;

  try {
    const response = await fetch("/api/guilds", {
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401) {
      window.location.href = "/api/login";
      return;
    }

    if (!response.ok) throw new Error("Failed to fetch guilds.");

    const data = await response.json();
    const guilds = Array.isArray(data.guilds) ? data.guilds : [];

    if (guilds.length === 0) {
      list.innerHTML = `<div class="server-item"><span>No manageable servers found.</span></div>`;
      return;
    }

    list.innerHTML = "";

    guilds.forEach((guild) => {
      const serverButton = document.createElement("button");
      serverButton.type = "button";
      serverButton.className = "server-item";

      const img = document.createElement("img");
      img.src = getGuildIconUrl(guild);
      img.alt = "";
      img.loading = "lazy";

      const name = document.createElement("span");
      name.textContent = guild.name || "Unknown Server";

      serverButton.append(img, name);
      serverButton.addEventListener("click", () => selectServer(guild));
      list.appendChild(serverButton);
    });
  } catch (error) {
    console.error("Server loading failed:", error);
    list.innerHTML = `<div class="server-item"><span>❌ Unable to load servers.</span></div>`;
  } finally {
    isLoadingServers = false;
  }
}

function getGuildIconUrl(guild) {
  return guild?.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
}

function selectServer(guild) {
  if (!guild?.id) return;

  selectedServer = {
    id: guild.id,
    name: guild.name || "Unknown Server",
    icon: getGuildIconUrl(guild),
    owner: Boolean(guild.owner),
    members: Number(guild.approximate_member_count || 0),
    online: Number(guild.approximate_presence_count || 0),
  };

  localStorage.setItem("selectedServer", JSON.stringify(selectedServer));
  renderServerDetails(selectedServer);
  closeServerList();
}

function renderServerDetails(server) {
  if (!server) return;

  const nameEl = document.getElementById("selected-server-name");
  if (nameEl) nameEl.textContent = server.name;

  const memberCount = document.getElementById("server-member-count");
  if (memberCount) memberCount.textContent = server.members.toLocaleString();

  const onlineCount = document.getElementById("server-online-count");
  if (onlineCount) onlineCount.textContent = server.online.toLocaleString();

  const ownerStatus = document.getElementById("server-owner-status");
  if (ownerStatus) ownerStatus.textContent = server.owner ? "Owner" : "Administrator";

  const iconEl = document.getElementById("selected-server-icon");
  if (iconEl) {
    iconEl.replaceChildren();
    const img = document.createElement("img");
    img.src = server.icon;
    img.alt = server.name;
    iconEl.appendChild(img);
  }
}

function restoreSelectedServer() {
  try {
    const saved = localStorage.getItem("selectedServer");
    if (!saved) return;

    const server = JSON.parse(saved);
    if (!server?.id || !server?.name) throw new Error("Invalid saved server.");

    selectedServer = server;
    renderServerDetails(server);
  } catch (error) {
    console.warn("Could not restore selected server:", error);
    localStorage.removeItem("selectedServer");
  }
}

function closeServerList() {
  const list = document.getElementById("server-list");
  const button = document.getElementById("server-button");

  if (list) {
    list.hidden = true;
    list.innerHTML = "";
  }

  if (button) button.setAttribute("aria-expanded", "false");
}

function requireServer() {
  if (selectedServer?.id) return true;
  alert("Choose a Discord server first.");
  return false;
}

function setStatus(id, message) {
  const element = document.getElementById(id);
  if (element) element.textContent = message;
}

function saveInviteSettings() {
  if (!requireServer()) return;

  const channel = document.getElementById("invite-log-channel")?.value.trim();
  if (!channel) {
    setStatus("invite-status", "Enter a channel ID first.");
    return;
  }

  localStorage.setItem(`inviteSettings:${selectedServer.id}`, JSON.stringify({ channel }));
  setStatus("invite-status", "✓ Invite tracker settings saved.");
}

function saveReward() {
  if (!requireServer()) return;

  const goal = Number(document.getElementById("reward-goal")?.value);
  const role = document.getElementById("reward-role")?.value.trim();

  if (!Number.isInteger(goal) || goal < 1) {
    setStatus("reward-status", "Enter a valid invite goal.");
    return;
  }

  if (!role) {
    setStatus("reward-status", "Enter a reward role ID.");
    return;
  }

  localStorage.setItem(
    `rewardSettings:${selectedServer.id}`,
    JSON.stringify({ goal, role })
  );

  setStatus("reward-status", `✓ Reward saved for ${goal} invites.`);
}

function saveSettings() {
  const status = document.getElementById("bot-status")?.value || "online";
  localStorage.setItem("botStatus", status);
  setStatus("settings-status", "✓ Settings saved.");
}

function logout() {
  window.location.href = "/api/logout";
}