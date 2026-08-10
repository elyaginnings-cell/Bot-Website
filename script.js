let currentUser = null;
let selectedServer = null;

/* ================================================= /
/ START /
/ ================================================= */

document.addEventListener(“DOMContentLoaded”, function () {
checkLogin();
});

/* ================================================= /
/ AUTHENTICATION /
/ ================================================= */

async function checkLogin() {

try {
    const response = await fetch("/api/user", {
        credentials: "include",
        cache: "no-store"
    });
    if (!response.ok) {
        console.error("User API failed:", response.status);
        return;
    }
    const data = await response.json();
    if (!data.authenticated || !data.user) {
        console.error("No authenticated Discord user.");
        return;
    }
    currentUser = data.user;
    showDashboard(data.user);
    restoreSelectedServer();
} catch (error) {
    console.error("Authentication error:", error);
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
    usernameElement.textContent = username;
}
const welcome =
    document.getElementById("welcome-name");
if (welcome) {
    welcome.textContent = username;
}
const avatar =
    document.getElementById("user-avatar");
if (avatar) {
    if (user.avatar) {
        avatar.src =
            `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    } else {
        avatar.src =
            "https://cdn.discordapp.com/embed/avatars/0.png";
    }
}

}

/* ================================================= /
/ NAVIGATION /
/ ================================================= */

function showSection(section) {

document
    .querySelectorAll(".page-section")
    .forEach(function (element) {
        element.classList.remove("active");
    });
const selected =
    document.getElementById(section);
if (selected) {
    selected.classList.add("active");
}
document
    .querySelectorAll(".nav-item")
    .forEach(function (button) {
        button.classList.remove("active");
    });
const buttons =
    document.querySelectorAll(".nav-item");
buttons.forEach(function (button) {
    const onclick =
        button.getAttribute("onclick");
    if (
        onclick &&
        onclick.includes(
            `showSection('${section}')`
        )
    ) {
        button.classList.add("active");
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
    ]
};
if (titles[section]) {
    document.getElementById(
        "page-title"
    ).textContent = titles[section][0];
    document.getElementById(
        "page-description"
    ).textContent = titles[section][1];
}

}

/* ================================================= /
/ SERVERS /
/ ================================================= */

async function loadServers() {

const list =
    document.getElementById("server-list");
if (!list) {
    console.error("server-list element missing.");
    return;
}
if (list.innerHTML.trim() !== "") {
    list.innerHTML = "";
    return;
}
list.innerHTML = `
    <div class="server-item">
        <span>Loading your servers...</span>
    </div>
`;
try {
    const response =
        await fetch("/api/guilds", {
            credentials: "include",
            cache: "no-store"
        });
    if (!response.ok) {
        console.error(
            "Guild API failed:",
            response.status
        );
        throw new Error(
            "Failed to load servers"
        );
    }
    const data =
        await response.json();
    if (
        !data.guilds ||
        data.guilds.length === 0
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
    data.guilds.forEach(function (guild) {
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
        button.onclick = function () {
            selectServer(
                guild.id,
                guild.name,
                icon
            );
        };
        list.appendChild(button);
    });
} catch (error) {
    console.error(
        "Server loading error:",
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

/* ================================================= /
/ SERVER SELECTION /
/ ================================================= */

function selectServer(id, name, icon) {

selectedServer = {
    id: id,
    name: name,
    icon: icon
};
localStorage.setItem(
    "selectedServer",
    JSON.stringify(selectedServer)
);
document.getElementById(
    "selected-server-name"
).textContent = name;
document.getElementById(
    "overview-server"
).textContent = name;
const serverIcon =
    document.getElementById(
        "selected-server-icon"
    );
if (serverIcon) {
    serverIcon.innerHTML = "";
    const image =
        document.createElement("img");
    image.src = icon;
    image.alt = name;
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    image.style.borderRadius = "10px";
    serverIcon.appendChild(image);
}
const list =
    document.getElementById("server-list");
if (list) {
    list.innerHTML = "";
}
console.log(
    "Selected server:",
    selectedServer
);

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
    if (!selectedServer) return;
    document.getElementById(
        "selected-server-name"
    ).textContent =
        selectedServer.name;
    document.getElementById(
        "overview-server"
    ).textContent =
        selectedServer.name;
    const serverIcon =
        document.getElementById(
            "selected-server-icon"
        );
    if (serverIcon && selectedServer.icon) {
        serverIcon.innerHTML = `
            <img
                src="${selectedServer.icon}"
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
    console.error(
        "Could not restore server:",
        error
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
    document.getElementById(
        "invite-log-channel"
    ).value.trim();
if (!channel) {
    alert(
        "Enter a channel ID first."
    );
    return;
}
console.log({
    guildId: selectedServer.id,
    channelId: channel
});
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
    document.getElementById(
        "reward-goal"
    ).value;
const role =
    document.getElementById(
        "reward-role"
    ).value.trim();
if (!goal || !role) {
    alert(
        "Enter both an invite goal and role ID."
    );
    return;
}
console.log({
    guildId: selectedServer.id,
    goal: goal,
    roleId: role
});
alert(
    `Reward created for ${goal} invites!`
);

}

/* ================================================= /
/ SETTINGS /
/ ================================================= */

function saveSettings() {

const status =
    document.getElementById(
        "bot-status"
    ).value;
console.log(
    "Bot status:",
    status
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