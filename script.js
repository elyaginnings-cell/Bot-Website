let currentUser = null;
let selectedServer = null;

/* ================================================= /
/ START /
/ ================================================= */

document.addEventListener(“DOMContentLoaded”, async () => {

setupNavigation();
setupButtons();
await checkLogin();

});

/* ================================================= /
/ AUTHENTICATION /
/ ================================================= */

async function checkLogin() {

try {
    const response = await fetch("/api/user", {
        method: "GET",
        credentials: "include",
        cache: "no-store"
    });
    if (!response.ok) {
        console.error(
            "Authentication failed:",
            response.status
        );
        showAuthenticationError();
        return;
    }
    const data = await response.json();
    if (!data.authenticated || !data.user) {
        showAuthenticationError();
        return;
    }
    currentUser = data.user;
    showDashboard(data.user);
    restoreSelectedServer();
}
catch (error) {
    console.error(
        "Authentication request failed:",
        error
    );
    showAuthenticationError();
}

}

/* ================================================= /
/ DASHBOARD /
/ ================================================= */

function showDashboard(user) {

const username =
    user.global_name ||
    user.username ||
    "Discord User";
const usernameElement =
    document.getElementById("username");
if (usernameElement) {
    usernameElement.textContent =
        username;
}
const welcome =
    document.getElementById("welcome-name");
if (welcome) {
    welcome.textContent =
        username;
}
const avatar =
    document.getElementById("user-avatar");
if (avatar) {
    if (user.avatar) {
        avatar.src =
            `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    }
    else {
        avatar.src =
            `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`;
    }
}

}

/* ================================================= /
/ AUTH ERROR /
/ ================================================= */

function showAuthenticationError() {

const username =
    document.getElementById("username");
if (username) {
    username.textContent =
        "Not authenticated";
}
const welcome =
    document.getElementById("welcome-name");
if (welcome) {
    welcome.textContent =
        "there";
}
console.warn(
    "No valid Discord session was found."
);

}

/* ================================================= /
/ NAVIGATION /
/ ================================================= */

function setupNavigation() {

document
    .querySelectorAll(".nav-item")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const section =
                    button.dataset.section;
                showSection(section);
            }
        );
    });
document
    .querySelectorAll("[data-section-link]")
    .forEach(button => {
        button.addEventListener(
            "click",
            () => {
                showSection(
                    button.dataset.sectionLink
                );
            }
        );
    });

}

function showSection(section) {

document
    .querySelectorAll(".page-section")
    .forEach(element => {
        element.classList.remove(
            "active"
        );
    });
const selected =
    document.getElementById(section);
if (selected) {
    selected.classList.add(
        "active"
    );
}
document
    .querySelectorAll(".nav-item")
    .forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === section
        );
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
    ]
};
const title =
    titles[section];
if (!title) return;
const pageTitle =
    document.getElementById("page-title");
const pageDescription =
    document.getElementById("page-description");
if (pageTitle) {
    pageTitle.textContent =
        title[0];
}
if (pageDescription) {
    pageDescription.textContent =
        title[1];
}

}

/* ================================================= /
/ BUTTON SETUP /
/ ================================================= */

function setupButtons() {

const serverButton =
    document.getElementById(
        "server-button"
    );
if (serverButton) {
    serverButton.addEventListener(
        "click",
        loadServers
    );
}
const logoutButton =
    document.getElementById(
        "logout-button"
    );
if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        logout
    );
}
const inviteButton =
    document.getElementById(
        "save-invite-settings"
    );
if (inviteButton) {
    inviteButton.addEventListener(
        "click",
        saveInviteSettings
    );
}
const rewardButton =
    document.getElementById(
        "save-reward"
    );
if (rewardButton) {
    rewardButton.addEventListener(
        "click",
        saveReward
    );
}
const settingsButton =
    document.getElementById(
        "save-settings"
    );
if (settingsButton) {
    settingsButton.addEventListener(
        "click",
        saveSettings
    );
}

}

/* ================================================= /
/ DISCORD SERVERS /
/ ================================================= */

async function loadServers() {

const list =
    document.getElementById(
        "server-list"
    );
if (!list) return;
if (!list.hidden) {
    list.hidden = true;
    list.innerHTML = "";
    return;
}
list.hidden = false;
list.innerHTML = `
    <div class="server-item">
        <span>Loading your Discord servers...</span>
    </div>
`;
try {
    const response =
        await fetch(
            "/api/guilds",
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );
    if (!response.ok) {
        const text =
            await response.text();
        console.error(
            "Guild request failed:",
            response.status,
            text
        );
        throw new Error(
            `Guild request failed (${response.status})`
        );
    }
    const data =
        await response.json();
    const guilds =
        Array.isArray(data.guilds)
            ? data.guilds
            : [];
    if (guilds.length === 0) {
        list.innerHTML = `
            <div class="server-item">
                <span>
                    No manageable servers found.
                </span>
            </div>
        `;
        return;
    }
    list.innerHTML = "";
    guilds.forEach(guild => {
        const button =
            document.createElement("button");
        button.className =
            "server-item";
        const icon =
            guild.icon
                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                : "https://cdn.discordapp.com/embed/avatars/0.png";
        const image =
            document.createElement("img");
        image.src = icon;
        image.alt = "";
        const name =
            document.createElement("span");
        name.textContent =
            guild.name;
        button.appendChild(image);
        button.appendChild(name);
        button.addEventListener(
            "click",
            () => {
                selectServer(
                    guild.id,
                    guild.name,
                    icon
                );
            }
        );
        list.appendChild(button);
    });
}
catch (error) {
    console.error(
        "Server loading error:",
        error
    );
    list.innerHTML = `
        <div class="server-item">
            <span>
                ❌ Unable to load your servers.
            </span>
        </div>
    `;
}

}

/* ================================================= /
/ SELECT SERVER /
/ ================================================= */

function selectServer(
id,
name,
icon
) {

selectedServer = {
    id,
    name,
    icon
};
localStorage.setItem(
    "selectedServer",
    JSON.stringify(selectedServer)
);
updateSelectedServerUI();
const list =
    document.getElementById(
        "server-list"
    );
if (list) {
    list.hidden = true;
    list.innerHTML = "";
}

}

/* ================================================= /
/ RESTORE SERVER /
/ ================================================= */

function restoreSelectedServer() {

try {
    const saved =
        localStorage.getItem(
            "selectedServer"
        );
    if (!saved) return;
    selectedServer =
        JSON.parse(saved);
    if (
        !selectedServer ||
        !selectedServer.id
    ) {
        return;
    }
    updateSelectedServerUI();
}
catch (error) {
    console.error(
        "Could not restore selected server:",
        error
    );
    localStorage.removeItem(
        "selectedServer"
    );
}

}

/* ================================================= /
/ SERVER UI /
/ ================================================= */

function updateSelectedServerUI() {

if (!selectedServer) return;
const name =
    document.getElementById(
        "selected-server-name"
    );
if (name) {
    name.textContent =
        selectedServer.name;
}
const overview =
    document.getElementById(
        "overview-server"
    );
if (overview) {
    overview.textContent =
        selectedServer.name;
}
const icon =
    document.getElementById(
        "selected-server-icon"
    );
if (icon) {
    icon.innerHTML = "";
    const image =
        document.createElement("img");
    image.src =
        selectedServer.icon;
    image.alt =
        selectedServer.name;
    image.style.width =
        "100%";
    image.style.height =
        "100%";
    image.style.objectFit =
        "cover";
    image.style.borderRadius =
        "10px";
    icon.appendChild(
        image
    );
}

}

/* ================================================= /
/ INVITE SETTINGS /
/ ================================================= */

function saveInviteSettings() {

if (!selectedServer) {
    alert(
        "Choose a Discord server first."
    );
    return;
}
const channel =
    document
        .getElementById(
            "invite-log-channel"
        )
        .value
        .trim();
if (!channel) {
    alert(
        "Enter a channel ID first."
    );
    return;
}
console.log(
    "Invite settings:",
    {
        guildId: selectedServer.id,
        channelId: channel
    }
);
alert(
    "Invite tracker settings saved!"
);

}

/* ================================================= /
/ REWARDS /
/ ================================================= */

function saveReward() {

if (!selectedServer) {
    alert(
        "Choose a Discord server first."
    );
    return;
}
const goal =
    Number(
        document
            .getElementById(
                "reward-goal"
            )
            .value
    );
const role =
    document
        .getElementById(
            "reward-role"
        )
        .value
        .trim();
if (!goal || goal < 1 || !role) {
    alert(
        "Enter both an invite goal and role ID."
    );
    return;
}
console.log(
    "Reward:",
    {
        guildId: selectedServer.id,
        goal,
        roleId: role
    }
);
alert(
    `Reward created for ${goal} invites!`
);

}

/* ================================================= /
/ BOT SETTINGS /
/ ================================================= */

function saveSettings() {

if (!selectedServer) {
    alert(
        "Choose a Discord server first."
    );
    return;
}
const status =
    document
        .getElementById(
            "bot-status"
        )
        .value;
console.log(
    "Bot status:",
    {
        guildId: selectedServer.id,
        status
    }
);
alert(
    "Settings saved!"
);

}

/* ================================================= /
/ LOGOUT /
/ ================================================= */

function logout() {

window.location.href =
    "/api/logout";

}