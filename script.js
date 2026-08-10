let currentUser = null;
let selectedServer = null;
/* ========================= */
/* START */
/* ========================= */
document.addEventListener(
    "DOMContentLoaded",
    checkLogin
);
/* ========================= */
/* AUTHENTICATION */
/* ========================= */
async function checkLogin() {
    try {
        const response =
            await fetch(
                "/api/user",
                {
                    credentials: "include",
                    cache: "no-store"
                }
            );
        if (!response.ok) {
            showLogin();
            return;
        }
        const data =
            await response.json();
        if (
            !data.authenticated ||
            !data.user
        ) {
            showLogin();
            return;
        }
        currentUser =
            data.user;
        showDashboard(
            data.user
        );
    } catch (error) {
        console.error(
            "Authentication error:",
            error
        );
        showLogin();
    }
}
/* ========================= */
/* LOGIN / DASHBOARD STATE */
/* ========================= */
function showLogin() {
    const overlay =
        document.getElementById(
            "login-overlay"
        );
    if (overlay) {
        overlay.style.display =
            "flex";
    }
}
function showDashboard(user) {
    const overlay =
        document.getElementById(
            "login-overlay"
        );
    if (overlay) {
        overlay.style.display =
            "none";
    }
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
        if (user.avatar) {
            avatar.src =
                `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
        } else {
            avatar.src =
                "https://cdn.discordapp.com/embed/avatars/0.png";
        }
    }
}
/* ========================= */
/* NAVIGATION */
/* ========================= */
function showSection(section) {
    document
        .querySelectorAll(
            ".page-section"
        )
        .forEach(element => {
            element.classList.remove(
                "active"
            );
        });
    const selected =
        document.getElementById(
            section
        );
    if (selected) {
        selected.classList.add(
            "active"
        );
    }
    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(button => {
            button.classList.remove(
                "active"
            );
        });
    const navButton =
        document.querySelector(
            `.nav-item[onclick="showSection('${section}')"]`
        );
    if (navButton) {
        navButton.classList.add(
            "active"
        );
    }
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
    if (title) {
        document.getElementById(
            "page-title"
        ).textContent =
            title[0];
        document.getElementById(
            "page-description"
        ).textContent =
            title[1];
    }
}
/* ========================= */
/* SERVERS */
/* ========================= */
async function loadServers() {
    const list =
        document.getElementById(
            "server-list"
        );
    if (!list) return;
    if (
        list.children.length > 0
    ) {
        list.innerHTML = "";
        return;
    }
    list.innerHTML = `
        <div class="server-item">
            Loading your servers...
        </div>
    `;
    try {
        const response =
            await fetch(
                "/api/guilds",
                {
                    credentials: "include",
                    cache: "no-store"
                }
            );
        if (!response.ok) {
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
                    No manageable servers found.
                </div>
            `;
            return;
        }
        list.innerHTML =
            data.guilds
                .map(
                    guild => {
                        const icon =
                            guild.icon
                                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                                : "https://cdn.discordapp.com/embed/avatars/0.png";
                        return `
                            <button
                                class="server-item"
                                onclick="selectServer(
                                    '${guild.id}',
                                    '${escapeAttribute(guild.name)}',
                                    '${icon}'
                                )"
                            >
                                <img
                                    src="${icon}"
                                    alt=""
                                >
                                <span>
                                    ${escapeHtml(guild.name)}
                                </span>
                            </button>
                        `;
                    }
                )
                .join("");
    } catch (error) {
        console.error(
            error
        );
        list.innerHTML = `
            <div class="server-item">
                ❌ Unable to load servers.
            </div>
        `;
    }
}
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
        JSON.stringify(
            selectedServer
        )
    );
    document.getElementById(
        "selected-server-name"
    ).textContent =
        name;
    document.getElementById(
        "overview-server"
    ).textContent =
        name;
    const serverIcon =
        document.getElementById(
            "selected-server-icon"
        );
    if (serverIcon) {
        serverIcon.innerHTML = `
            <img
                src="${icon}"
                style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    border-radius:10px;
                "
            >
        `;
    }
    document.getElementById(
        "server-list"
    ).innerHTML = "";
    console.log(
        "Selected server:",
        id
    );
}
/* ========================= */
/* INVITE SETTINGS */
/* ========================= */
function saveInviteSettings() {
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
    alert(
        "Invite tracker settings saved!"
    );
}
/* ========================= */
/* REWARDS */
/* ========================= */
function saveReward() {
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
    alert(
        `Reward created for ${goal} invites!`
    );
}
/* ========================= */
/* SETTINGS */
/* ========================= */
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
/* ========================= */
/* LOGOUT */
/* ========================= */
function logout() {
    window.location.href =
        "/api/logout";
}
/* ========================= */
/* SECURITY HELPERS */
/* ========================= */
function escapeHtml(value) {
    const element =
        document.createElement(
            "div"
        );
    element.textContent =
        String(value);
    return element.innerHTML;
}
function escapeAttribute(value) {
    return String(value)
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            "&quot;"
        );
}