let currentUser = null;
let selectedServer = null;
let isLoadingServers = false;

/* =========================================================
   STARTUP
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ script.js loaded");

    setupDeviceButtons();
    setupEventListeners();
    restoreSelectedServer();
    checkLogin();
});


/* =========================================================
   DEVICE MODE
========================================================= */

function setupDeviceButtons() {
    const pcBtn = document.getElementById("select-pc");
    const mobileBtn = document.getElementById("select-mobile");
    const modal = document.querySelector(".device-modal");

    function setMode(mode) {
        document.body.classList.remove(
            "mode-pc",
            "mode-mobile",
            "modal-active"
        );

        document.body.classList.add(`mode-${mode}`);

        if (modal) {
            modal.classList.add("hidden");
        }

        localStorage.setItem("viewMode", mode);
    }

    const savedMode = localStorage.getItem("viewMode");

    if (savedMode === "pc" || savedMode === "mobile") {
        setMode(savedMode);
    }

    if (pcBtn) {
        pcBtn.addEventListener("click", () => setMode("pc"));
    }

    if (mobileBtn) {
        mobileBtn.addEventListener("click", () => setMode("mobile"));
    }
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    document.querySelectorAll(".nav-item").forEach((button) => {
        button.addEventListener("click", () => {
            const section = button.dataset.tab;

            if (section) {
                showSection(section);
            }
        });
    });


    document.querySelectorAll(".quick-card").forEach((button) => {
        button.addEventListener("click", () => {
            const section = button.dataset.sectionLink;

            if (section) {
                showSection(section);
            }
        });
    });


    const serverButton = document.getElementById("server-button");

    if (serverButton) {
        serverButton.addEventListener("click", loadServers);
    }


    const logoutButton = document.getElementById("logout-button");

    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }


    const inviteButton =
        document.getElementById("save-invite-settings");

    if (inviteButton) {
        inviteButton.addEventListener(
            "click",
            saveInviteSettings
        );
    }


    const rewardButton =
        document.getElementById("save-reward");

    if (rewardButton) {
        rewardButton.addEventListener(
            "click",
            saveReward
        );
    }


    const settingsButton =
        document.getElementById("save-settings");

    if (settingsButton) {
        settingsButton.addEventListener(
            "click",
            saveSettings
        );
    }


    document.addEventListener("click", (event) => {
        const selector = document.querySelector(".server-selector");
        const list = document.getElementById("server-list");

        if (!selector || !list) return;

        if (
            list.dataset.open === "true" &&
            !selector.contains(event.target)
        ) {
            closeServerList();
        }
    });
}


/* =========================================================
   LOGIN
========================================================= */

async function checkLogin() {
    try {
        const response = await fetch("/api/user", {
            method: "GET",
            credentials: "include",
            cache: "no-store"
        });

        if (!response.ok) {
            window.location.href = "/api/login";
            return;
        }

        const data = await response.json();

        if (!data.authenticated || !data.user) {
            window.location.href = "/api/login";
            return;
        }

        currentUser = data.user;

        updateUserInterface(currentUser);

        console.log(
            "✅ Logged in as:",
            currentUser.global_name || currentUser.username
        );

    } catch (error) {
        console.error("Login check failed:", error);

        window.location.href = "/api/login";
    }
}


/* =========================================================
   USER UI
========================================================= */

function updateUserInterface(user) {
    if (!user) return;

    const username =
        user.global_name ||
        user.username ||
        "Discord User";


    const usernameElement =
        document.getElementById("username");

    if (usernameElement) {
        usernameElement.textContent = username;
    }


    const welcomeElement =
        document.getElementById("welcome-name");

    if (welcomeElement) {
        welcomeElement.textContent = username;
    }


    const avatarElement =
        document.getElementById("user-avatar");

    if (avatarElement) {

        avatarElement.src = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : "https://cdn.discordapp.com/embed/avatars/0.png";

        avatarElement.style.display = "block";
    }
}


/* =========================================================
   NAVIGATION
========================================================= */

function showSection(section) {

    const target =
        document.getElementById(section);

    if (!target) return;


    document
        .querySelectorAll(".page-section")
        .forEach((element) => {
            element.classList.remove("active");
        });


    target.classList.add("active");


    document
        .querySelectorAll(".nav-item")
        .forEach((button) => {

            button.classList.remove("active");

            if (button.dataset.tab === section) {
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

    if (!list || isLoadingServers) return;


    if (list.dataset.open === "true") {
        closeServerList();
        return;
    }


    isLoadingServers = true;

    list.hidden = false;
    list.dataset.open = "true";

    list.innerHTML = `
        <div class="server-loading">
            Loading your servers...
        </div>
    `;


    try {

        const response = await fetch("/api/guilds", {
            method: "GET",
            credentials: "include",
            cache: "no-store"
        });


        if (response.status === 401) {
            window.location.href = "/api/login";
            return;
        }


        if (!response.ok) {
            throw new Error(
                `Guild request failed: ${response.status}`
            );
        }


        const data = await response.json();

        const guilds =
            Array.isArray(data.guilds)
                ? data.guilds
                : [];


        if (guilds.length === 0) {

            list.innerHTML = `
                <div class="server-empty">
                    No manageable servers found.
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


            const image =
                document.createElement("img");

            image.src = iconUrl;
            image.alt = "";
            image.loading = "lazy";


            const name =
                document.createElement("span");

            name.textContent =
                guild.name || "Unknown Server";


            button.appendChild(image);
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
            <div class="server-empty">
                ❌ Unable to load servers.
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
        owner: Boolean(guild.owner),
        members: Number(
            guild.approximate_member_count || 0
        ),
        online: Number(
            guild.approximate_presence_count || 0
        )
    };


    localStorage.setItem(
        "selectedServer",
        JSON.stringify(selectedServer)
    );


    renderServerDetails(selectedServer);

    closeServerList();

    console.log(
        "✅ Selected server:",
        selectedServer.name
    );
}


/* =========================================================
   SERVER DISPLAY
========================================================= */

function renderServerDetails(server) {

    if (!server) return;


    const nameElement =
        document.getElementById(
            "selected-server-name"
        );

    if (nameElement) {
        nameElement.textContent =
            server.name;
    }


    const overviewElement =
        document.getElementById(
            "overview-server"
        );

    if (overviewElement) {
        overviewElement.textContent =
            server.name;
    }


    const memberElement =
        document.getElementById(
            "server-member-count"
        );

    if (memberElement) {
        memberElement.textContent =
            server.members.toLocaleString();
    }


    const onlineElement =
        document.getElementById(
            "server-online-count"
        );

    if (onlineElement) {
        onlineElement.textContent =
            server.online.toLocaleString();
    }


    const ownerElement =
        document.getElementById(
            "server-owner-status"
        );

    if (ownerElement) {
        ownerElement.textContent =
            server.owner
                ? "Owner"
                : "Administrator";
    }


    const iconElement =
        document.getElementById(
            "selected-server-icon"
        );

    if (iconElement) {

        iconElement.innerHTML = "";

        const image =
            document.createElement("img");

        image.src = server.icon;
        image.alt = server.name;
        image.loading = "lazy";

        iconElement.appendChild(image);
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
            localStorage.removeItem(
                "selectedServer"
            );

            return;
        }


        selectedServer = server;

        renderServerDetails(
            selectedServer
        );

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
            ?.value
            .trim();


    if (!channel) {
        alert(
            "Enter a channel ID first."
        );

        return;
    }


    alert(
        `Invite tracker settings saved for ${selectedServer.name}!`
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
        alert(
            "Enter both an invite goal and role ID."
        );

        return;
    }


    alert(
        `Reward created for ${goal} invites!`
    );
}


/* =========================================================
   BOT SETTINGS
========================================================= */

function saveSettings() {

    const status =
        document
            .getElementById(
                "bot-status"
            )
            ?.value;


    if (!status) {
        alert(
            "Choose a bot status first."
        );

        return;
    }


    alert(
        `Bot status set to ${status}.`
    );
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {
    window.location.href = "/api/logout";
}