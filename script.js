let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    checkLogin();
});

async function checkLogin() {
    try {
        const response = await fetch("/api/user", {
            method: "GET",
            credentials: "include",
            cache: "no-store"
        });

        if (!response.ok) {
            showLogin();
            return;
        }

        const data = await response.json();

        if (!data.authenticated || !data.user) {
            showLogin();
            return;
        }

        currentUser = data.user;

        showDashboard(currentUser);

    } catch (error) {
        console.error("Login check failed:", error);
        showLogin();
    }
}

function showLogin() {
    document.body.innerHTML = `
        <div class="login-container">

            <div class="login-card">

                <div class="login-icon">
                    🤖
                </div>

                <h1>
                    Discord Bot Dashboard
                </h1>

                <p>
                    Connect your Discord account to manage
                    your bot and server.
                </p>

                <a
                    href="/api/login"
                    class="discord-login-button"
                >
                    Login with Discord
                </a>

            </div>

        </div>
    `;
}

function showDashboard(user) {

    const username =
        user.global_name ||
        user.username ||
        "Discord User";

    const avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/0.png`;

    document.body.innerHTML = `
        <div class="dashboard">

            <header class="topbar">

                <div class="brand">
                    <span class="brand-icon">
                        🤖
                    </span>

                    <span>
                        Bot Dashboard
                    </span>
                </div>

                <div class="user-area">

                    <img
                        src="${avatar}"
                        class="user-avatar"
                        alt="Discord Avatar"
                    >

                    <span class="username">
                        ${escapeHtml(username)}
                    </span>

                    <a
                        href="/api/logout"
                        class="logout-button"
                    >
                        Logout
                    </a>

                </div>

            </header>


            <main class="dashboard-content">

                <section class="welcome">

                    <h1>
                        Welcome, ${escapeHtml(username)}! 👋
                    </h1>

                    <p>
                        Your Discord account is connected.
                        Choose what you want to configure below.
                    </p>

                </section>


                <section class="stats-grid">

                    <div class="dashboard-card">

                        <div class="card-icon">
                            📊
                        </div>

                        <h2>
                            Invite Tracker
                        </h2>

                        <p>
                            Track member invites, invite counts,
                            and rewards.
                        </p>

                        <button
                            onclick="openInviteTracker()"
                        >
                            Configure
                        </button>

                    </div>


                    <div class="dashboard-card">

                        <div class="card-icon">
                            🎁
                        </div>

                        <h2>
                            Rewards
                        </h2>

                        <p>
                            Automatically reward members when
                            they reach invite goals.
                        </p>

                        <button
                            onclick="openRewards()"
                        >
                            Configure
                        </button>

                    </div>


                    <div class="dashboard-card">

                        <div class="card-icon">
                            ⚙️
                        </div>

                        <h2>
                            Bot Settings
                        </h2>

                        <p>
                            Configure your Discord bot and
                            server settings.
                        </p>

                        <button
                            onclick="openSettings()"
                        >
                            Configure
                        </button>

                    </div>


                    <div class="dashboard-card">

                        <div class="card-icon">
                            🛡️
                        </div>

                        <h2>
                            Server
                        </h2>

                        <p>
                            Select and manage the Discord
                            servers connected to your account.
                        </p>

                        <button
                            onclick="loadServers()"
                        >
                            Select Server
                        </button>

                    </div>

                </section>


                <section
                    id="dashboard-panel"
                    class="dashboard-panel"
                >

                    <h2>
                        Select an option
                    </h2>

                    <p>
                        Choose a dashboard section above
                        to get started.
                    </p>

                </section>

            </main>

        </div>
    `;
}


async function loadServers() {

    const panel =
        document.getElementById("dashboard-panel");

    if (!panel) return;

    panel.innerHTML = `
        <h2>
            Loading servers...
        </h2>

        <p>
            Getting your Discord servers.
        </p>
    `;

    try {

        const response =
            await fetch("/api/guilds", {
                credentials: "include",
                cache: "no-store"
            });

        if (!response.ok) {

            panel.innerHTML = `
                <h2>
                    ❌ Couldn't load servers
                </h2>

                <p>
                    Your Discord session may have expired.
                </p>
            `;

            return;
        }

        const data =
            await response.json();

        if (!data.guilds || data.guilds.length === 0) {

            panel.innerHTML = `
                <h2>
                    No Servers Found
                </h2>

                <p>
                    Discord didn't return any servers
                    that you can manage.
                </p>
            `;

            return;
        }

        panel.innerHTML = `
            <h2>
                Select Your Server
            </h2>

            <div class="server-list">

                ${data.guilds.map(guild => {

                    const icon = guild.icon
                        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                        : `https://cdn.discordapp.com/embed/avatars/0.png`;

                    return `
                        <button
                            class="server-item"
                            onclick="selectServer('${guild.id}')"
                        >

                            <img
                                src="${icon}"
                                alt=""
                                class="server-icon"
                            >

                            <span>
                                ${escapeHtml(guild.name)}
                            </span>

                        </button>
                    `;

                }).join("")}

            </div>
        `;

    } catch (error) {

        console.error(
            "Server loading error:",
            error
        );

        panel.innerHTML = `
            <h2>
                ❌ Something went wrong
            </h2>

            <p>
                We couldn't retrieve your servers.
            </p>
        `;
    }
}


function selectServer(serverId) {

    localStorage.setItem(
        "selectedServer",
        serverId
    );

    const panel =
        document.getElementById(
            "dashboard-panel"
        );

    if (!panel) return;

    panel.innerHTML = `
        <h2>
            ✅ Server Selected
        </h2>

        <p>
            Server ID:
            <code>${serverId}</code>
        </p>

        <p>
            You can now configure your bot
            for this server.
        </p>
    `;
}


function openInviteTracker() {

    const panel =
        document.getElementById(
            "dashboard-panel"
        );

    if (!panel) return;

    panel.innerHTML = `
        <h2>
            📊 Invite Tracker
        </h2>

        <p>
            Configure how your bot tracks invites.
        </p>

        <div class="settings-form">

            <label>
                Invite Tracking
            </label>

            <select id="inviteTracking">
                <option value="enabled">
                    Enabled
                </option>

                <option value="disabled">
                    Disabled
                </option>
            </select>


            <label>
                Invite Log Channel ID
            </label>

            <input
                id="inviteLogChannel"
                type="text"
                placeholder="Channel ID"
            >


            <button
                onclick="saveInviteSettings()"
            >
                Save Invite Settings
            </button>

        </div>
    `;
}


function openRewards() {

    const panel =
        document.getElementById(
            "dashboard-panel"
        );

    if (!panel) return;

    panel.innerHTML = `
        <h2>
            🎁 Automatic Rewards
        </h2>

        <p>
            Create rewards for members when they
            reach specific invite goals.
        </p>

        <div class="settings-form">

            <label>
                Invite Goal
            </label>

            <input
                id="rewardGoal"
                type="number"
                min="1"
                placeholder="Example: 10"
            >


            <label>
                Reward Role ID
            </label>

            <input
                id="rewardRole"
                type="text"
                placeholder="Role ID"
            >


            <button
                onclick="saveReward()"
            >
                Save Reward
            </button>

        </div>
    `;
}


function openSettings() {

    const panel =
        document.getElementById(
            "dashboard-panel"
        );

    if (!panel) return;

    panel.innerHTML = `
        <h2>
            ⚙️ Bot Settings
        </h2>

        <p>
            General bot configuration will go here.
        </p>

        <div class="settings-form">

            <label>
                Bot Status
            </label>

            <select>
                <option>
                    Online
                </option>

                <option>
                    Idle
                </option>

                <option>
                    Do Not Disturb
                </option>
            </select>

        </div>
    `;
}


function saveInviteSettings() {

    const tracking =
        document.getElementById(
            "inviteTracking"
        )?.value;

    const channel =
        document.getElementById(
            "inviteLogChannel"
        )?.value;

    console.log({
        tracking,
        channel
    });

    alert(
        "Invite settings saved!"
    );
}


function saveReward() {

    const goal =
        document.getElementById(
            "rewardGoal"
        )?.value;

    const role =
        document.getElementById(
            "rewardRole"
        )?.value;

    if (!goal || !role) {

        alert(
            "Please enter an invite goal and role ID."
        );

        return;
    }

    console.log({
        goal,
        role
    });

    alert(
        `Reward saved! Members will receive the role after ${goal} invites.`
    );
}


function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value);

    return div.innerHTML;
}
`