let currentGuild = null;


/* ================================
   AUTHENTICATION
================================ */

async function loadUser() {

    try {

        const response =
            await fetch("/api/user");


        if (!response.ok) {

            showLogin();

            return;

        }


        const data =
            await response.json();


        if (!data.authenticated) {

            showLogin();

            return;

        }


        showDashboard(
            data.user
        );


        await loadGuilds();

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        showLogin();

    }

}



/* ================================
   LOGIN
================================ */

function showLogin() {

    document.body.innerHTML = `

        <div class="login-screen">

            <div class="login-card">

                <div class="login-logo">
                    🤖
                </div>

                <h1>
                    Gatto Bot
                </h1>

                <p>
                    Manage your Discord bot
                    from one dashboard.
                </p>

                <button
                    class="primary-button login-button"
                    onclick="loginWithDiscord()"
                >
                    Login with Discord
                </button>

            </div>

        </div>

    `;

}


function loginWithDiscord() {

    window.location.href =
        "/api/login";

}



/* ================================
   DASHBOARD
================================ */

function showDashboard(user) {

    console.log(
        "Logged in as:",
        user
    );

}



/* ================================
   LOAD SERVERS
================================ */

async function loadGuilds() {

    try {

        const response =
            await fetch("/api/guilds");


        if (!response.ok) {

            console.error(
                "Could not load guilds."
            );

            return;

        }


        const guilds =
            await response.json();


        createGuildSelector(
            guilds
        );

    } catch (error) {

        console.error(
            "Guild loading error:",
            error
        );

    }

}



/* ================================
   SERVER SELECTOR
================================ */

function createGuildSelector(guilds) {

    const selector =
        document.querySelector(
            ".server-selector"
        );


    if (!selector)
        return;


    if (!guilds.length) {

        selector.innerHTML = `

            <strong>
                No manageable servers
            </strong>

        `;

        return;

    }


    selector.innerHTML = `

        <select
            id="guild-select"
            class="guild-select"
        >

            ${guilds.map(
                guild => `

                    <option
                        value="${guild.id}"
                    >
                        ${escapeHtml(
                            guild.name
                        )}
                    </option>

                `
            ).join("")}

        </select>

    `;


    const select =
        document.getElementById(
            "guild-select"
        );


    select.addEventListener(
        "change",
        () => {

            currentGuild =
                select.value;

            localStorage.setItem(
                "selectedGuild",
                currentGuild
            );

            console.log(
                "Selected server:",
                currentGuild
            );

        }
    );


    const saved =
        localStorage.getItem(
            "selectedGuild"
        );


    if (
        saved &&
        guilds.some(
            guild =>
                guild.id === saved
        )
    ) {

        select.value =
            saved;

        currentGuild =
            saved;

    } else {

        currentGuild =
            guilds[0].id;

    }

}



/* ================================
   PAGE NAVIGATION
================================ */

function showPage(page) {

    document
        .querySelectorAll(".page")
        .forEach(
            element =>
                element.classList.remove(
                    "active-page"
                )
        );


    const target =
        document.getElementById(
            page
        );


    if (target) {

        target.classList.add(
            "active-page"
        );

    }


    document
        .querySelectorAll(".nav-item")
        .forEach(
            button =>
                button.classList.remove(
                    "active"
                )
        );


    const buttons =
        document.querySelectorAll(
            ".nav-item"
        );


    const indexes = {

        overview: 0,

        invites: 1,

        rewards: 2,

        settings: 3

    };


    if (
        buttons[indexes[page]]
    ) {

        buttons[
            indexes[page]
        ].classList.add(
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
            "Track who is bringing members into your server."
        ],

        rewards: [
            "Automatic Rewards",
            "Give members roles when they reach invite milestones."
        ],

        settings: [
            "Settings",
            "Configure your bot dashboard."
        ]

    };


    document.getElementById(
        "page-title"
    ).textContent =
        titles[page][0];


    document.getElementById(
        "page-description"
    ).textContent =
        titles[page][1];

}



/* ================================
   MODALS
================================ */

function openInviteModal() {

    document
        .getElementById(
            "invite-modal"
        )
        .classList.add(
            "open"
        );

}


function openRewardModal() {

    document
        .getElementById(
            "reward-modal"
        )
        .classList.add(
            "open"
        );

}


function closeModal(id) {

    document
        .getElementById(id)
        .classList.remove(
            "open"
        );

}



/* ================================
   HELPERS
================================ */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}



/* ================================
   START
================================ */

window.addEventListener("DOMContentLoaded", () => {
    loadUser();
});