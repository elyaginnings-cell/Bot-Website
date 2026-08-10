let currentUser = null;
let selectedServer = null;

/* =========================================================
START
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initialize();
});

async function initialize() {
    console.log("✅ script.js loaded");
    setupButtons();
    await checkLogin();
    restoreSelectedServer();
}

/* =========================================================
BUTTON SETUP
========================================================= */

function setupButtons() {
    /* Navigation */
    document.querySelectorAll(".nav-item").forEach(button => {
        button.addEventListener("click", () => {
            const action = button.getAttribute("onclick");
            if (!action) return;
            const match = action.match(/showSection\(['"](.+?)['"]\)/);
            if (match) {
                showSection(match[1]);
            }
        });
    });

    /* Choose Server */
    const serverButton = document.querySelector(".server-button");
    if (serverButton) {
        serverButton.addEventListener("click", loadServers);
    }

    /* Logout */
    const logoutButton = document.querySelector(".logout");
    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }

    /* Invite settings */
    const inviteButton = document.querySelector("[onclick*='saveInviteSettings']");
    if (inviteButton) {
        inviteButton.addEventListener("click", saveInviteSettings);
    }

    /* Reward */
    const rewardButton = document.querySelector("[onclick*='saveReward']");
    if (rewardButton) {
        rewardButton.addEventListener("click", saveReward);
    }

    /* Settings */
    const settingsButton = document.querySelector("[onclick*='saveSettings']");
    if (settingsButton) {
        settingsButton.addEventListener("click", saveSettings);
    }

    /* Quick setup buttons */
    document.querySelectorAll(".quick-card").forEach(button => {
        button.addEventListener("click", () => {
            const action = button.getAttribute("onclick");
            if (!action) return;
            const match = action.match(/showSection\(['"](.+?)['"]\)/);
            if (match) {
                showSection(match[1]);
            }
        });
    });
}

/* =========================================================
AUTHENTICATION
========================================================= */

async function checkLogin() {
    try {
        const response = await fetch("/api/user", {
            credentials: "include",
            cache: "no-store"
        });
        if (!response.ok) {
            console.warn("User endpoint returned:", response.status);
            return;
        }
        const data = await response.json();
        if (!data || !data.authenticated || !data.user) {
            console.warn("No authenticated Discord user.");
            return;
        }
        currentUser = data.user;
        updateUserInterface(currentUser);
    } catch (error) {
        console.error("Login check failed:", error);
    }
}

/* =========================================================
USER UI
========================================================= */

function updateUserInterface(user) {
    const username = user.global_name || user.username || "Discord User";
    const usernameElement = document.getElementById("username");
    if (usernameElement) {
        usernameElement.textContent = username;
    }

    const welcome = document.getElementById("welcome-name");
    if (welcome) {
        welcome.textContent = username;
    }

    const avatar = document.getElementById("user-avatar");
    if (avatar) {
        if (user.avatar) {
            avatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
        } else {
            avatar.src = `https://cdn.discordapp.com/embed/avatars/0.png`;
        }
    }
}

/* =========================================================
NAVIGATION
========================================================= */

function showSection(section) {
    document.querySelectorAll(".page-section").forEach(element => {
        element.classList.remove("active");
    });

    const target = document.getElementById(section);
    if (target) {
        target.classList.add("active");
    }

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");
        const action = button.getAttribute("onclick");
        if (action && action.includes(`showSection('${section}')`)) {
            button.classList.add("active");
        }
    });

    const titles = {
        overview: {
            title: "Overview",
            description: "Manage your Discord server."
        },
        invites: {
            title: "Invite Tracker",
            description: "Track and manage member invites."
        },
        rewards: {
            title: "Rewards",
            description: "Automatically reward your members."
        },
        settings: {
            title: "Settings",
            description: "Configure your bot."
        }
    };

    const info = titles[section];
    if (!info) return;

    const title = document.getElementById("page-title");
    const description = document.getElementById("page-description");

    if (title) title.textContent = info.title;
    if (description) description.textContent = info.description;
}

/* =========================================================
DISCORD SERVERS
========================================================= */

async function loadServers() {
    const list = document.getElementById("server-list");
    if (!list) {
        console.error("server-list element not found.");
        return;
    }

    /* Toggle list */
    if (list.dataset.open === "true") {
        list.innerHTML = "";
        list.dataset.open = "false";
        return;
    }

    list.dataset.open = "true";
    list.innerHTML = `
        <div class="server-item">
            <span>Loading your servers...</span>
        </div>
    `;

    try {
        const response = await fetch("/api/guilds", {
            credentials: "include",
            cache: "no-store"
        });
        if (!response.ok) {
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
            button.className = "server-item";

            const icon = guild.icon
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                : `https://cdn.discordapp.com/embed/avatars/0.png`;

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
        console.error("Server loading failed:", error);
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
    }

    console.log("Selected Discord server:", selectedServer);
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
            iconElement.innerHTML = `
                <img
                    src="${server.icon}"
                    alt=""
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:10px;
                    "
                >
            `;
        }
    } catch (error) {
        console.error("Could not restore server:", error);
    }
}

/* =========================================================
INVITE SETTINGS
========================================================= */

function saveInviteSettings() {
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

function saveReward() {
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

function saveSettings() {
    const statusInput = document.getElementById("bot-status");
    const status = statusInput ? statusInput.value : "Online";

    console.log("Bot status:", status);
    alert("Settings saved!");
}

/* =========================================================
LOGOUT
========================================================= */

function logout() {
    window.location.href = "/api/logout";
}
