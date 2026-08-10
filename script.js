let currentUser = null;
let selectedServer = null;

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ script.js loaded");
    checkLogin();
    restoreSelectedServer();
    setupEventListeners();
});

function setupEventListeners() {
    // Nav buttons
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

    // Buttons
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

async function checkLogin() {
    try {
        const response = await fetch("/api/user", {
            method: "GET",
            credentials: "include",
            cache: "no-store"
        });

        if (!response.ok) {
            console.log("Not authenticated, redirecting...");
            window.location.href = "/api/login";
            return;
        }

        const data = await response.json();
        if (!data || !data.authenticated || !data.user) {
            window.location.href = "/api/login";
            return;
        }

        currentUser = data.user;
        updateUserInterface(currentUser);
        console.log("✅ Logged in as:", currentUser.username);
    } catch (error) {
        console.error("Login check failed:", error);
    }
}

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

function showSection(section) {
    document.querySelectorAll(".page-section").forEach(element => {
        element.classList.remove("active");
    });

    const target = document.getElementById(section);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.remove("active");
        if (button.getAttribute("data-section") === section) {
            button.classList.add("active");
        }
    });

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

async function loadServers() {
    const list = document.getElementById("server-list");
    if (!list) return;

    if (list.dataset.open === "true") {
        list.innerHTML = "";
        list.dataset.open = "false";
        list.hidden = true;
        return;
    }

    list.hidden = false;
    list.dataset.open = "true";
    list.innerHTML = `<div class="server-item"><span>Loading your servers...</span></div>`;

    try {
        const response = await fetch("/api/guilds", {
            method: "GET",
            credentials: "include",
            cache: "no-store"
        });

        if (!response.ok) throw new Error("Failed to fetch guilds");

        const data = await response.json();
        const guilds = Array.isArray(data.guilds) ? data.guilds : [];

        if (guilds.length === 0) {
            list.innerHTML = `<div class="server-item"><span>No manageable servers found.</span></div>`;
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
            button.addEventListener("click", () => selectServer(guild.id, guild.name, icon));
            list.appendChild(button);
        });
    } catch (error) {
        console.error("Server loading failed:", error);
        list.innerHTML = `<div class="server-item"><span>❌ Unable to load servers.</span></div>`;
    }
}

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
        list.hidden = true;
    }
}

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

function saveInviteSettings() {
    if (!selectedServer) return alert("Choose a Discord server first.");
    const input = document.getElementById("invite-log-channel");
    const channel = input ? input.value.trim() : "";
    if (!channel) return alert("Enter a channel ID first.");
    alert("Invite tracker settings saved!");
}

function saveReward() {
    if (!selectedServer) return alert("Choose a Discord server first.");
    const goalInput = document.getElementById("reward-goal");
    const roleInput = document.getElementById("reward-role");
    const goal = goalInput ? goalInput.value.trim() : "";
    const role = roleInput ? roleInput.value.trim() : "";

    if (!goal || !role) return alert("Enter both an invite goal and role ID.");
    alert(`Reward created for ${goal} invites!`);
}

function saveSettings() {
    alert("Settings saved!");
}

function logout() {
    window.location.href = "/api/logout";
}
