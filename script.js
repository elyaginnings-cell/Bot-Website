let currentUser = null;
let selectedServer = null;
let isLoadingServers = false;
let serverRefreshInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  const pcBtn = document.getElementById("select-pc");
  const mobileBtn = document.getElementById("select-mobile");
  const modal = document.querySelector(".device-modal");

  function setMode(mode) {
    document.body.classList.remove(
      "mode-pc",
      "mode-mobile",
      "modal-active"
    );

    document.body.classList.add("mode-" + mode);

    if (modal) {
      modal.classList.add("hidden");
    }

    // Re-render the selected server after changing layouts.
    // This makes sure the mobile view gets the current counts too.
    if (selectedServer) {
      renderServerDetails(selectedServer);
    }
  }

  if (pcBtn) {
    pcBtn.addEventListener("click", () => setMode("pc"));
  }

  if (mobileBtn) {
    mobileBtn.addEventListener("click", () => setMode("mobile"));
  }

  setupEventListeners();
  checkLogin();
  restoreSelectedServer();

  // Keep server information updated.
  startServerRefresh();
});

/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section =
        btn.getAttribute("data-tab") ||
        btn.getAttribute("data-section");

      if (section) {
        showSection(section);
      }
    });
  });

  document.querySelectorAll(".quick-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.getAttribute("data-section-link");

      if (section) {
        showSection(section);
      }
    });
  });

  const serverBtn =
    document.getElementById("server-button") ||
    document.querySelector(".server-bar .button");

  if (serverBtn) {
    serverBtn.addEventListener("click", loadServers);
  }

  const logoutBtn =
    document.getElementById("logout-button") ||
    document.querySelector(".logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  const saveInviteBtn =
    document.getElementById("save-invite-settings");

  if (saveInviteBtn) {
    saveInviteBtn.addEventListener("click", saveInviteSettings);
  }

  const saveRewardBtn =
    document.getElementById("save-reward");

  if (saveRewardBtn) {
    saveRewardBtn.addEventListener("click", saveReward);
  }

  const saveSettingsBtn =
    document.getElementById("save-settings");

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", saveSettings);
  }
}

/* =========================================================
   LOGIN
========================================================= */

async function checkLogin() {
  try {
    const response = await fetch("/api/user", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      window.location.href = "/api/login";
      return;
    }

    const data = await response.json();

    if (!data?.authenticated || !data?.user) {
      window.location.href = "/api/login";
      return;
    }

    currentUser = data.user;

    updateUserInterface(currentUser);

    console.log("✅ Logged in as:", currentUser.username);
  } catch (error) {
    console.error("Login check failed:", error);
    window.location.href = "/api/login";
  }
}

function updateUserInterface(user) {
  if (!user) return;

  const username =
    user.global_name ||
    user.username ||
    "Discord User";

  const usernameEl = document.getElementById("username");

  if (usernameEl) {
    usernameEl.textContent = username;
  }

  const welcome =
    document.getElementById("welcome-name");

  if (welcome) {
    welcome.textContent = username;
  }

  const avatar =
    document.getElementById("user-avatar");

  if (avatar) {
    avatar.src = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : "https://cdn.discordapp.com/embed/avatars/0.png";
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

function showSection(section) {
  document.querySelectorAll(".page-section").forEach((el) => {
    el.classList.remove("active");
  });

  const target =
    document.getElementById(section);

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.remove("active");

    const navTarget =
      btn.getAttribute("data-tab") ||
      btn.getAttribute("data-section");

    if (navTarget === section) {
      btn.classList.add("active");
    }
  });

  const titles = {
    overview: [
      "Overview",
      "Manage your Discord server."
    ],

    invites: [
      "Invite Tracker",
      "Track and manage member invites."
    ],

    rewards: [
      "Rewards",
      "Automatically reward your members."
    ],

    settings: [
      "Settings",
      "Configure your bot."
    ],
  };

  const info = titles[section];

  if (!info) return;

  const title =
    document.getElementById("page-title");

  const description =
    document.getElementById("page-description");

  if (title) {
    title.textContent = info[0];
  }

  if (description) {
    description.textContent = info[1];
  }
}

/* =========================================================
   SERVER LIST
========================================================= */

async function loadServers() {
  const list =
    document.getElementById("server-list");

  if (!list || isLoadingServers) {
    return;
  }

  if (list.dataset.open === "true") {
    list.innerHTML = "";
    list.dataset.open = "false";
    list.hidden = true;
    return;
  }

  isLoadingServers = true;

  list.hidden = false;
  list.dataset.open = "true";

  list.innerHTML = `
    <div class="server-item">
      <span>Loading your servers...</span>
    </div>
  `;

  try {
    const response = await fetch("/api/guilds", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch guilds");
    }

    const data = await response.json();

    const guilds =
      Array.isArray(data.guilds)
        ? data.guilds
        : [];

    if (guilds.length === 0) {
      list.innerHTML = `
        <div class="server-item">
          <span>No manageable servers found.</span>
        </div>
      `;

      return;
    }

    list.innerHTML = "";

    guilds.forEach((guild) => {
      const button =
        document.createElement("button");

      button.type = "button";
      button.className = "server-item";

      const iconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
        : "https://cdn.discordapp.com/embed/avatars/0.png";

      const img =
        document.createElement("img");

      img.src = iconUrl;
      img.alt = "";
      img.loading = "lazy";

      const name =
        document.createElement("span");

      name.textContent =
        guild.name || "Unknown Server";

      button.appendChild(img);
      button.appendChild(name);

      button.addEventListener(
        "click",
        () => selectServer(guild)
      );

      list.appendChild(button);
    });
  } catch (error) {
    console.error(
      "Server loading failed:",
      error
    );

    list.innerHTML = `
      <div class="server-item">
        <span>❌ Unable to load servers.</span>
      </div>
    `;
  } finally {
    isLoadingServers = false;
  }
}

/* =========================================================
   SELECT SERVER
========================================================= */

function selectServer(guild) {
  if (!guild?.id) return;

  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  selectedServer = {
    id: guild.id,
    name: guild.name || "Unknown Server",
    icon: iconUrl,
    owner: !!guild.owner,
    members:
      guild.approximate_member_count || 0,
    online:
      guild.approximate_presence_count || 0,
  };

  localStorage.setItem(
    "selectedServer",
    JSON.stringify(selectedServer)
  );

  renderServerDetails(selectedServer);

  closeServerList();
}

/* =========================================================
   RENDER SERVER
========================================================= */

function renderServerDetails(server) {
  if (!server) return;

  const nameEl =
    document.getElementById(
      "selected-server-name"
    );

  if (nameEl) {
    nameEl.textContent = server.name;
  }

  const overview =
    document.getElementById(
      "overview-server"
    );

  if (overview) {
    overview.textContent = server.name;
  }

  /*
   * IMPORTANT:
   * These IDs are shared by both desktop and
   * mobile layouts.
   */

  const memberCount =
    document.getElementById(
      "server-member-count"
    );

  if (memberCount) {
    memberCount.textContent =
      Number(server.members || 0)
        .toLocaleString();
  }

  const onlineCount =
    document.getElementById(
      "server-online-count"
    );

  if (onlineCount) {
    onlineCount.textContent =
      Number(server.online || 0)
        .toLocaleString();
  }

  const ownerStatus =
    document.getElementById(
      "server-owner-status"
    );

  if (ownerStatus) {
    ownerStatus.textContent =
      server.owner
        ? "Owner"
        : "Administrator";
  }

  const iconEl =
    document.getElementById(
      "selected-server-icon"
    );

  if (iconEl && server.icon) {
    iconEl.innerHTML = "";

    const img =
      document.createElement("img");

    img.src = server.icon;
    img.alt = server.name || "";

    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";

    iconEl.appendChild(img);
  }
}

/* =========================================================
   LIVE SERVER COUNT REFRESH
========================================================= */

function startServerRefresh() {
  /*
   * Refresh every 30 seconds.
   * This updates member and online counts
   * without requiring the user to reload.
   */

  if (serverRefreshInterval) {
    clearInterval(serverRefreshInterval);
  }

  serverRefreshInterval = setInterval(
    refreshSelectedServer,
    30000
  );
}

async function refreshSelectedServer() {
  if (!selectedServer?.id) {
    return;
  }

  try {
    const response = await fetch(
      "/api/guilds",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    const guilds =
      Array.isArray(data.guilds)
        ? data.guilds
        : [];

    const updatedGuild =
      guilds.find(
        (guild) =>
          guild.id === selectedServer.id
      );

    if (!updatedGuild) {
      return;
    }

    selectedServer.members =
      updatedGuild.approximate_member_count || 0;

    selectedServer.online =
      updatedGuild.approximate_presence_count || 0;

    selectedServer.owner =
      !!updatedGuild.owner;

    localStorage.setItem(
      "selectedServer",
      JSON.stringify(selectedServer)
    );

    /*
     * Re-render EVERYTHING.
     *
     * This is what makes the counts update
     * correctly regardless of PC/mobile mode.
     */
    renderServerDetails(selectedServer);

  } catch (error) {
    console.error(
      "Server count refresh failed:",
      error
    );
  }
}

/* =========================================================
   RESTORE SERVER
========================================================= */

function restoreSelectedServer() {
  try {
    const saved =
      localStorage.getItem(
        "selectedServer"
      );

    if (!saved) return;

    const server =
      JSON.parse(saved);

    if (!server?.id || !server?.name) {
      return;
    }

    selectedServer = server;

    renderServerDetails(
      selectedServer
    );

    /*
     * Immediately fetch fresh data instead
     * of waiting 30 seconds.
     */
    refreshSelectedServer();

  } catch (error) {
    console.error(
      "Could not restore server:",
      error
    );

    localStorage.removeItem(
      "selectedServer"
    );
  }
}

/* =========================================================
   CLOSE SERVER LIST
========================================================= */

function closeServerList() {
  const list =
    document.getElementById(
      "server-list"
    );

  if (!list) return;

  list.innerHTML = "";
  list.dataset.open = "false";
  list.hidden = true;
}

/* =========================================================
   INVITE SETTINGS
========================================================= */

function saveInviteSettings() {
  if (!selectedServer) {
    return alert(
      "Choose a Discord server first."
    );
  }

  const channel =
    document
      .getElementById(
        "invite-log-channel"
      )
      ?.value
      .trim();

  if (!channel) {
    return alert(
      "Enter a channel ID first."
    );
  }

  alert(
    "Invite tracker settings saved!"
  );
}

/* =========================================================
   REWARDS
========================================================= */

function saveReward() {
  if (!selectedServer) {
    return alert(
      "Choose a Discord server first."
    );
  }

  const goal =
    document
      .getElementById(
        "reward-goal"
      )
      ?.value
      .trim();

  const role =
    document
      .getElementById(
        "reward-role"
      )
      ?.value
      .trim();

  if (!goal || !role) {
    return alert(
      "Enter both an invite goal and role ID."
    );
  }

  alert(
    `Reward created for ${goal} invites!`
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function saveSettings() {
  alert("Settings saved!");
}

/* =========================================================
   LOGOUT
========================================================= */

function logout() {
  window.location.href =
    "/api/logout";
}