let currentUser = null;
let selectedServer = null;

/* =========================================================
STARTUP
========================================================= */

document.addEventListener(“DOMContentLoaded”, () => {

console.log("✅ Bot Control script loaded");
setupEventListeners();
checkLogin();
restoreSelectedServer();

});

/* =========================================================
EVENT LISTENERS
========================================================= */

function setupEventListeners() {

/* -------------------------
   Sidebar Navigation
------------------------- */
document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        const section =
            button.dataset.section;
        if (!section) return;
        showSection(section);
    });
});
/* -------------------------
   Quick Setup Cards
------------------------- */
document.querySelectorAll(".quick-card").forEach(button => {
    button.addEventListener("click", () => {
        const section =
            button.dataset.sectionLink;
        if (!section) return;
        showSection(section);
    });
});
/* -------------------------
   Server Button
------------------------- */
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
/* -------------------------
   Logout
------------------------- */
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
/* -------------------------
   Invite Settings
------------------------- */
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
/* -------------------------
   Rewards
------------------------- */
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
/* -------------------------
   Bot Settings
------------------------- */
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
console.log(
    "✅ Event listeners attached"
);

}

/* =========================================================
AUTHENTICATION
========================================================= */

async function checkLogin() {

try {
    const response =
        await fetch(
            "/api/user",
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );
    if (!response.ok) {
        console.log(
            "Not authenticated:",
            response.status
        );
        return;
    }
    const data =
        await response.json();
    if (
        !data ||
        !data.authenticated ||
        !data.user
    ) {
        console.log(
            "No authenticated Discord user."
        );
        return;
    }
    currentUser =
        data.user;
    updateUserInterface(
        currentUser
    );
    console.log(
        "✅ Logged in as:",
        currentUser.username
    );
} catch (error) {
    console.error(
        "❌ Login check failed:",
        error
    );
}

}

/* =========================================================
USER INTERFACE
========================================================= */

function updateUserInterface(user) {

const username =
    user.global_name ||
    user.username ||
    "Discord User";
const usernameElement =
    document.getElementById(
        "username"
    );
if (usernameElement) {
    usernameElement.textContent =
        username;
}
const welcome =
    document.getElementById(
        "welcome-name"
    );
if (welcome) {
    welcome.textContent =
        username;
}
const avatar =
    document.getElementById(
        "user-avatar"
    );
if (avatar) {
    avatar.src =
        user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : "https://cdn.discordapp.com/embed/avatars/0.png";
}

}

/* =========================================================
NAVIGATION
========================================================= */

function showSection(section) {

console.log(
    "📂 Opening:",
    section
);
/* Hide everything */
document
    .querySelectorAll(
        ".page-section"
    )
    .forEach(element => {
        element.classList.remove(
            "active"
        );
    });
/* Show selected section */
const target =
    document.getElementById(
        section
    );
if (!target) {
    console.error(
        "Section not found:",
        section
    );
    return;
}
target.classList.add(
    "active"
);
/* Update navigation */
document
    .querySelectorAll(
        ".nav-item"
    )
    .forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === section
        );
    });
/* Page titles */
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
const info =
    titles[section];
if (!info) return;
const title =
    document.getElementById(
        "page-title"
    );
const description =
    document.getElementById(
        "page-description"
    );
if (title) {
    title.textContent =
        info[0];
}
if (description) {
    description.textContent =
        info[1];
}

}

/* =========================================================
LOAD DISCORD SERVERS
========================================================= */

async function loadServers() {

console.log(
    "🔎 Loading Discord servers..."
);
const list =
    document.getElementById(
        "server-list"
    );
if (!list) {
    console.error(
        "❌ #server-list not found"
    );
    return;
}
/* Toggle closed */
if (
    list.dataset.open ===
    "true"
) {
    list.innerHTML =
        "";
    list.dataset.open =
        "false";
    list.hidden =
        true;
    return;
}
/* Open */
list.hidden =
    false;
list.dataset.open =
    "true";
list.innerHTML = `
    <div class="server-item">
        <span>
            Loading your servers...
        </span>
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
        const error =
            await response.text();
        console.error(
            "Guild API error:",
            error
        );
        throw new Error(
            `Guild API returned ${response.status}`
        );
    }
    const data =
        await response.json();
    const guilds =
        Array.isArray(
            data.guilds
        )
            ? data.guilds
            : [];
    if (
        guilds.length ===
        0
    ) {
        list.innerHTML = `
            <div class="server-item">
                <span>
                    No manageable servers found.
                </span>
            </div>
        `;
        return;
    }
    list.innerHTML =
        "";
    guilds.forEach(
        guild => {
            const button =
                document.createElement(
                    "button"
                );
            button.type =
                "button";
            button.className =
                "server-item";
            const icon =
                guild.icon
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                    : "https://cdn.discordapp.com/embed/avatars/0.png";
            const image =
                document.createElement(
                    "img"
                );
            image.src =
                icon;
            image.alt =
                "";
            image.loading =
                "lazy";
            const name =
                document.createElement(
                    "span"
                );
            name.textContent =
                guild.name;
            button.appendChild(
                image
            );
            button.appendChild(
                name
            );
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
            list.appendChild(
                button
            );
        }
    );
    console.log(
        `✅ Loaded ${guilds.length} server(s)`
    );
} catch (error) {
    console.error(
        "❌ Server loading failed:",
        error
    );
    list.innerHTML = `
        <div class="server-item">
            <span>
                ❌ Unable to load servers.
            </span>
        </div>
    `;
}

}

/* =========================================================
SELECT SERVER
========================================================= */

function selectServer(
id,
name,
icon
) {

console.log(
    "🏠 Selected server:",
    name
);
selectedServer = {
    id,
    name,
    icon
};
localStorage.setItem(
    "selectedServer",
    JSON.stringify(
        selectedServer
    )
);
/* Current server name */
const currentName =
    document.getElementById(
        "selected-server-name"
    );
if (currentName) {
    currentName.textContent =
        name;
}
/* Overview */
const overview =
    document.getElementById(
        "overview-server"
    );
if (overview) {
    overview.textContent =
        name;
}
/* Server icon */
const iconContainer =
    document.getElementById(
        "selected-server-icon"
    );
if (iconContainer) {
    iconContainer.innerHTML =
        "";
    const image =
        document.createElement(
            "img"
        );
    image.src =
        icon;
    image.alt =
        name;
    image.style.width =
        "100%";
    image.style.height =
        "100%";
    image.style.objectFit =
        "cover";
    image.style.borderRadius =
        "10px";
    iconContainer.appendChild(
        image
    );
}
/* Close server list */
const list =
    document.getElementById(
        "server-list"
    );
if (list) {
    list.innerHTML =
        "";
    list.dataset.open =
        "false";
    list.hidden =
        true;
}

}

/* =========================================================
RESTORE SELECTED SERVER
========================================================= */

function restoreSelectedServer() {

try {
    const saved =
        localStorage.getItem(
            "selectedServer"
        );
    if (!saved) return;
    const server =
        JSON.parse(
            saved
        );
    if (
        !server ||
        !server.id ||
        !server.name
    ) {
        return;
    }
    selectedServer =
        server;
    const currentName =
        document.getElementById(
            "selected-server-name"
        );
    if (currentName) {
        currentName.textContent =
            server.name;
    }
    const overview =
        document.getElementById(
            "overview-server"
        );
    if (overview) {
        overview.textContent =
            server.name;
    }
    if (
        server.icon
    ) {
        const container =
            document.getElementById(
                "selected-server-icon"
            );
        if (container) {
            const image =
                document.createElement(
                    "img"
                );
            image.src =
                server.icon;
            image.alt =
                server.name;
            image.style.width =
                "100%";
            image.style.height =
                "100%";
            image.style.objectFit =
                "cover";
            image.style.borderRadius =
                "10px";
            container.innerHTML =
                "";
            container.appendChild(
                image
            );
        }
    }
} catch (error) {
    console.error(
        "❌ Could not restore server:",
        error
    );
}

}

/* =========================================================
INVITE SETTINGS
========================================================= */

async function saveInviteSettings() {

if (!selectedServer) {
    alert(
        "Choose a Discord server first."
    );
    return;
}
const input =
    document.getElementById(
        "invite-log-channel"
    );
const channel =
    input
        ? input.value.trim()
        : "";
if (!channel) {
    alert(
        "Enter a channel ID first."
    );
    return;
}
console.log(
    "💾 Invite settings:",
    {
        guildId:
            selectedServer.id,
        channelId:
            channel
    }
);
alert(
    "Invite tracker settings saved!"
);

}

/* =========================================================
REWARDS
========================================================= */

async function saveReward() {

if (!selectedServer) {
    alert(
        "Choose a Discord server first."
    );
    return;
}
const goalInput =
    document.getElementById(
        "reward-goal"
    );
const roleInput =
    document.getElementById(
        "reward-role"
    );
const goal =
    goalInput
        ? goalInput.value.trim()
        : "";
const role =
    roleInput
        ? roleInput.value.trim()
        : "";
if (
    !goal ||
    !role
) {
    alert(
        "Enter both an invite goal and role ID."
    );
    return;
}
console.log(
    "🎁 Reward:",
    {
        guildId:
            selectedServer.id,
        goal:
            Number(goal),
        roleId:
            role
    }
);
alert(
    `Reward created for ${goal} invites!`
);

}

/* =========================================================
BOT SETTINGS
========================================================= */

async function saveSettings() {

const input =
    document.getElementById(
        "bot-status"
    );
const status =
    input
        ? input.value
        : "Online";
console.log(
    "⚙️ Bot status:",
    status
);
alert(
    "Settings saved!"
);

}

/* =========================================================
LOGOUT
========================================================= */

function logout() {

console.log(
    "🚪 Logging out..."
);
window.location.href =
    "/api/logout";

}