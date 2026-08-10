let currentUser = null;
let selectedServer = null;

/* =========================================================
STARTUP & EVENT LISTENERS
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ script.js loaded");
    checkLogin();
    restoreSelectedServer();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation items
    document.querySelectorAll(".nav-item").forEach(button => {
        button.addEventListener("click", () => {
            const section = button.getAttribute("data-section");
            if (section) showSection(section);
        });
    });

    // Quick cards
    document.querySelectorAll(".quick-card").forEach(button => {
        button.addEventListener("click", () => {
            const section = button.getAttribute("data-section-link");
            if (section) showSection(section);
        });
    });

    // Action buttons
    const serverBtn = document.getElementById("server-button");
    if (serverBtn) serverBtn.addEventListener("click", loadServers);

    const logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    const saveInviteBtn = document.getElementById("save-invite-settings");
    if (saveInviteBtn) saveInviteBtn.addEventListener("click", saveInviteSettings);

    const saveRewardBtn = document.getElementById("save-reward");
    if (saveRewardBtn) saveRewardBtn.addEventListener("click", saveReward);

    const saveSettingsBtn = document.getElementById("save-settings");
    if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", saveSettings);
}

/* =========================================================
AUTHENTICATION
========================================================= */

async function checkLogin() {
    try {
        const response = await fetch("/api/user", {
            method: "GET",
            credentials: "include",
            cache: "no-store"
        });
        if (!response.ok) {
            console.log("Not authenticated:", response.status);
            return;
        }
        const data = await response.json();
        if (!data || !data.authenticated || !data.user) {
            console.log("No authenticated user.");
            return;
        }
        currentUser = data.user;
        updateUserInterface(currentUser);
        console.log("✅ Logged in as:", currentUser.username);
    } catch (error) {
        console.error("Login check failed:", error);
    }
}

/* =========================================================
USER INTERFACE
========================================================= */

function updateUserInterface(user) {
    const username = user.global_name || user.username || "Discord User";
    const usernameElement = document.getElementById("username");
    if (usernameElement) usernameElement.textContent = username;

    const welcome = document.getElementById("welcome-name");
    if (welcome) welcome.textContent = username;

    const avatar = document.getElementById("user-avatar");
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
    console.log("Opening section:", section);

    // Hide all page sections
    document.querySelectorAll(".page-section").forEach(element => {
        element.classList.remove("active");
    });

    // Show target page section
    const target = document.getElementById(section);
    if (target) target.classList.add("active");

    // Update nav item active states
    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");
        if (button.getAttribute("data-section") === section) {
            button.classList.add("active");
        }
    });

    // Update section title & description
    const titles = {
        overview: ["Overview", "Manage your Discord server."],
        invites: ["Invite Tracker", "Track and manage member invites."],
        rewards: ["Rewards", "Automatically reward your members."],
        settings: ["Settings", "Configure your bot."]
    };

    const info = titles[section];
    if (!info) return;

    const title = document.getElementById("page-title");
    const description = document.getElementById("page-description");

    if (title) title.textContent = info[0];
    if (description) description.textContent = info[1];
}

/* =========================================================
DISCORD SERVERS
========================================================= */

async function loadServers() {
    console.log("🔎 Loading Discord servers...");
    const list = document.getElementById("server-list");
    if (!list) {
        console.error("❌ server-list not found");
        return;
    }

    // Toggle visibility
    if (list.dataset.open === "true") {
        list.innerHTML = "";
        list.dataset.open = "false";
        list.hidden = true;
        return;
    }

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
            cache: "no-store"
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Guild API error:", errorText);
            throw new Error(`Guild API returned ${response.status}`);
        }

        const data = await response.json();
        const guilds = Array.isArray(data.guilds) ? data.guilds : [];

        if (guilds.length === 0) {
            list.innerHTML = `
                <div class="server-item">
                    <span>No manageable servers found.</span>
                </div>
            `;
            return;
        }

        list.innerHTML = "";
        guilds.forEach(guild => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "server-item";

            const icon = guild.icon
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                : "https://cdn.discordapp.com/embed/avatars/0.png";

            const image = document.createElement("img");
            image.src = icon;
            image.alt = "";

            const name = document.createElement("span");
            name.textContent = guild.name;

            button.appendChild(image);
            button.appendChild(name);
            button.addEventListener("click", () => {
                selectServer(guild.id, guild.name, icon);
            });
            list.appendChild(button);
        });
    } catch (error) {
        console.error("❌ Server loading failed:", error);
        list.innerHTML = `
            <div class="server-item">
                <span>❌ Unable to load servers.</span>
            </div>
        `;
    }
}

/* =========================================================
SERVER SELECTION
========================================================= */

function selectServer(id, name, icon) {
    console.log("Selected server:", id, name);
    selectedServer = { id, name, icon };
    localStorage.setItem("selectedServer", JSON.stringify(selectedServer));

    const nameElement = document.getElementById("selected-server-name");
    if (nameElement) nameElement.textContent = name;

    const overview = document.getElementById("overview-server");
    if (overview) overview.textContent = name;

    const iconElement = document.getElementById("selected-server-icon");
    if (iconElement) {
        iconElement.innerHTML = "";
        const image = document.createElement("img");
        image.src = icon;
        image.alt = name;
        image.style.width = "100%";
        image.style.height = "100%";
        image.style.objectFit = "cover";
        image.style.borderRadius = "10px";
        iconElement.appendChild(image);
    }

    const list = document.getElementById("server-list");
    if (list) {
        list.innerHTML = "";
        list.dataset.open = "false";
        list.hidden = true;
    }
}

/* =========================================================
RESTORE SERVER
========================================================= */

function restoreSelectedServer() {
    try {
        const saved = localStorage.getItem("selectedServer");
        if (!saved) return;
        const server = JSON.parse(saved);
        if (!server || !server.id || !server.name) return;

        selectedServer = server;
        const nameElement = document.getElementById("selected-server-name");
        if (nameElement) nameElement.textContent = server.name;

        const overview = document.getElementById("overview-server");
        if (overview) overview.textContent = server.name;

        const iconElement = document.getElementById("selected-server-icon");
        if (iconElement && server.icon) {
            const image = document.createElement("img");
            image.src = server.icon;
            image.alt = server.name;
            image.style.width = "100%";
            image.style.height = "100%";
            image.style.objectFit = "cover";
            image.style.borderRadius = "10px";
            iconElement.innerHTML = "";
            iconElement.appendChild(image);
        }
    } catch (error) {
        console.error("Could not restore server:", error);
    }
}

/* =========================================================
INVITE SETTINGS
========================================================= */

async function saveInviteSettings() {
    if (!selectedServer) {
        alert("Choose a Discord server first.");
        return;
    }
    const input = document.getElementById("invite-log-channel");
    const channel = input ? input.value.trim() : "";
    if (!channel) {
        alert("Enter a channel ID first.");
        return;
    }
    console.log("Invite settings:", {
        guildId: selectedServer.id,
        channelId: channel
    });
    alert("Invite tracker settings saved!");
}

/* =========================================================
REWARDS
========================================================= */

async function saveReward() {
    if (!selectedServer) {
        alert("Choose a Discord server first.");
        return;
    }
    const goalInput = document.getElementById("reward-goal");
    const roleInput = document.getElementById("reward-role");
    const goal = goalInput ? goalInput.value.trim() : "";
    const role = roleInput ? roleInput.value.trim() : "";

    if (!goal || !role) {
        alert("Enter both an invite goal and role ID.");
        return;
    }
    console.log("Reward:", {
        guildId: selectedServer.id,
        goal: Number(goal),
        roleId: role
    });
    alert(`Reward created for ${goal} invites!`);
}

/* =========================================================
BOT SETTINGS
========================================================= */

async function saveSettings() {
    const input = document.getElementById("bot-status");
    const status = input ? input.value : "online";
    console.log("Bot status:", status);
    alert("Settings saved!");
}

/* =========================================================
LOGOUT
========================================================= */

function logout() {
    console.log("Logging out...");
    window.location.href = "/api/logout";
}
