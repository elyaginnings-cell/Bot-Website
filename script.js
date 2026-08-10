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
            showLoggedOut();
            return;
        }

        const data = await response.json();

        if (!data.authenticated || !data.user) {
            showLoggedOut();
            return;
        }

        showLoggedIn(data.user);

    } catch (error) {
        console.error("Authentication check failed:", error);
        showLoggedOut();
    }
}


function showLoggedOut() {

    const loginButton =
        document.querySelector(
            ".discord-login-button"
        );

    if (loginButton) {
        loginButton.style.display = "inline-flex";
    }

    const dashboard =
        document.querySelector(
            "#dashboard"
        );

    if (dashboard) {
        dashboard.style.display = "none";
    }
}


function showLoggedIn(user) {

    const loginButton =
        document.querySelector(
            ".discord-login-button"
        );

    if (loginButton) {
        loginButton.style.display = "none";
    }

    const dashboard =
        document.querySelector(
            "#dashboard"
        );

    if (dashboard) {
        dashboard.style.display = "block";
    }

    const username =
        document.querySelector(
            "#username"
        );

    if (username) {
        username.textContent =
            user.global_name ||
            user.username;
    }

    const avatar =
        document.querySelector(
            "#user-avatar"
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


/*
 * SERVER SELECTION
 */

async function loadServers() {

    const serverList =
        document.querySelector(
            "#server-list"
        );

    if (!serverList) {
        console.error(
            "Missing #server-list element."
        );
        return;
    }

    serverList.innerHTML =
        "<p>Loading servers...</p>";

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

            serverList.innerHTML =
                "<p>❌ Couldn't load your servers.</p>";

            return;
        }

        const data =
            await response.json();

        if (
            !data.guilds ||
            data.guilds.length === 0
        ) {

            serverList.innerHTML =
                "<p>No manageable servers found.</p>";

            return;
        }

        serverList.innerHTML =
            data.guilds
                .map(guild => {

                    const icon =
                        guild.icon
                            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                            : "https://cdn.discordapp.com/embed/avatars/0.png";

                    return `
                        <button
                            class="server-item"
                            data-server-id="${guild.id}"
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

                })
                .join("");

        document
            .querySelectorAll(
                ".server-item"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        selectServer(
                            button.dataset.serverId
                        );

                    }
                );

            });

    } catch (error) {

        console.error(
            "Server loading failed:",
            error
        );

        serverList.innerHTML =
            "<p>❌ Failed to load servers.</p>";
    }
}


function selectServer(serverId) {

    localStorage.setItem(
        "selectedServer",
        serverId
    );

    console.log(
        "Selected server:",
        serverId
    );

    const event =
        new CustomEvent(
            "serverSelected",
            {
                detail: {
                    serverId
                }
            }
        );

    document.dispatchEvent(event);
}


/*
 * LOGOUT
 */

function logout() {
    window.location.href =
        "/api/logout";
}


/*
 * SECURITY
 */

function escapeHtml(value) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        String(value);

    return div.innerHTML;
}