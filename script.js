let currentUser = null;
let selectedServer = null;

/* =========================================================
START
========================================================= */

document.addEventListener(“DOMContentLoaded”, () => {
console.log(“✅ Bot Control loaded”);

checkLogin();
restoreSelectedServer();

});

/* =========================================================
AUTHENTICATION
========================================================= */

async function checkLogin() {

console.log("🔐 Checking Discord login...");
try {
    const response = await fetch("/api/user", {
        method: "GET",
        credentials: "include",
        cache: "no-store"
    });
    console.log(
        "User API status:",
        response.status
    );
    if (!response.ok) {
        console.log(
            "❌ User is not authenticated"
        );
        return;
    }
    const data = await response.json();
    console.log(
        "User API response:",
        data
    );
    if (
        !data ||
        !data.authenticated ||
        !data.user
    ) {
        console.log(
            "❌ No authenticated user"
        );
        return;
    }
    currentUser = data.user;
    updateUserInterface(
        currentUser
    );
    hideLoginOverlay();
    console.log(
        "✅ Logged in as:",
        currentUser.username
    );
} catch (error) {
    console.error(
        "❌ Login check error:",
        error
    );
}

}

/* =========================================================
LOGIN OVERLAY
========================================================= */

function hideLoginOverlay() {

const overlay =
    document.getElementById(
        "login-overlay"
    );
if (!overlay) return;
overlay.style.display = "none";

}

function showLoginOverlay() {

const overlay =
    document.getElementById(
        "login-overlay"
    );
if (!overlay) return;
overlay.style.display = "flex";

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
if (!avatar) return;
if (user.avatar) {
    avatar.src =
        `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
} else {
    avatar.src =
        "https://cdn.discordapp.com/embed/avatars/0.png";
}

}

/* =========================================================
NAVIGATION
========================================================= */

function showSection(section) {

console.log(
    "📂 Opening section:",
    section
);
document
    .querySelectorAll(".page-section")
    .forEach(element => {
        element.classList.remove(
            "active"
        );
    });
const target =
    document.getElementById(
        section
    );
if (target) {
    target.classList.add(
        "active"
    );
}
document
    .querySelectorAll(".nav-item")
    .forEach(button => {
        button.classList.remove(
            "active"
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
if (!titles[section]) return;
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
        titles[section][0];
}
if (description) {
    description.textContent =
        titles[section][1];
}

}

/* =========================================================
SERVER LIST
========================================================= */

async function loadServers() {

console.log(
    "🌐 Loading Discord servers..."
);
const list =
    document.getElementById(
        "server-list"
    );
if (!list) {
    console.error(
        "❌ server-list does not exist"
    );
    return;
}
if (
    list.dataset.open === "true"
) {
    list.innerHTML = "";
    list.dataset.open =
        "false";
    return;
}
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
    console.log(
        "Guild API status:",
        response.status
    );
    if (!response.ok) {
        throw new Error(
            `Guild API returned ${response.status}`
        );
    }
    const data =
        await response.json();
    console.log(
        "Guild data:",
        data
    );
    const guilds =
        Array.isArray(data.guilds)
            ? data.guilds
            : [];
    if (
        guilds.length === 0
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
    list.innerHTML = "";
    guilds.forEach(guild => {
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
    });
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
const serverName =
    document.getElementById(
        "selected-server-name"
    );
if (serverName) {
    serverName.textContent =
        name;
}
const overviewServer =
    document.getElementById(
        "overview-server"
    );
if (overviewServer) {
    overviewServer.textContent =
        name;
}
const iconContainer =
    document.getElementById(
        "selected-server-icon"
    );
if (iconContainer) {
    iconContainer.innerHTML = "";
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
const list =
    document.getElementById(
        "server-list"
    );
if (list) {
    list.innerHTML = "";
    list.dataset.open =
        "false";
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
    selectedServer =
        JSON.parse(
            saved
        );
    if (
        !selectedServer ||
        !selectedServer.id
    ) {
        return;
    }
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
} catch (error) {
    console.error(
        "Server restore failed:",
        error
    );
}

}

/* =========================================================
INVITE SETTINGS
========================================================= */

function saveInviteSettings() {

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
    "Invite settings:",
    {
        server:
            selectedServer.id,
        channel:
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

function saveReward() {

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
if (!goal || !role) {
    alert(
        "Enter both an invite goal and role ID."
    );
    return;
}
console.log(
    "Reward created:",
    {
        server:
            selectedServer.id,
        goal:
            Number(goal),
        role:
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

function saveSettings() {

const status =
    document.getElementById(
        "bot-status"
    );
console.log(
    "Bot status:",
    status
        ? status.value
        : "Online"
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