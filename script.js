let currentGuild = null;
let currentUser = null;


/* =========================================
   AUTH
========================================= */

async function checkAuthentication() {

    console.log("Checking authentication...");

    try {

        const response = await fetch(
            "/api/user",
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );


        const data = await response.json();


        console.log(
            "Auth result:",
            data
        );


        if (
            response.ok &&
            data.authenticated === true
        ) {

            currentUser = data.user;

            showAuthenticatedUI();

            await loadGuilds();

            return true;
        }


        showLoggedOutUI();

        return false;

    } catch (error) {

        console.error(
            "Authentication check failed:",
            error
        );

        showLoggedOutUI();

        return false;
    }
}


/* =========================================
   LOGGED IN UI
========================================= */

function showAuthenticatedUI() {

    const loginButton =
        document.getElementById(
            "login-button"
        );

    const userInfo =
        document.getElementById(
            "user-info"
        );

    const serverSelector =
        document.getElementById(
            "server-selector"
        );


    loginButton.classList.add(
        "hidden"
    );

    userInfo.classList.remove(
        "hidden"
    );

    serverSelector.classList.remove(
        "hidden"
    );


    const username =
        document.getElementById(
            "username"
        );

    const avatar =
        document.getElementById(
            "user-avatar"
        );


    username.textContent =
        currentUser.global_name ||
        currentUser.username;


    if (currentUser.avatar) {

        avatar.innerHTML = `
            <img
                src="https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png?size=128"
                alt=""
            >
        `;

    } else {

        avatar.textContent =
            (
                currentUser.global_name ||
                currentUser.username ||
                "?"
            )
                .charAt(0)
                .toUpperCase();
    }
}


/* =========================================
   LOGGED OUT UI
========================================= */

function showLoggedOutUI() {

    const loginButton =
        document.getElementById(
            "login-button"
        );

    const userInfo =
        document.getElementById(
            "user-info"
        );

    const serverSelector =
        document.getElementById(
            "server-selector"
        );


    loginButton.classList.remove(
        "hidden"
    );

    userInfo.classList.add(
        "hidden"
    );

    serverSelector.classList.add(
        "hidden"
    );
}


/* =========================================
   LOGIN
========================================= */

function loginWithDiscord() {

    window.location.assign(
        "/api/login"
    );
}


/* =========================================
   SERVERS
========================================= */

async function loadGuilds() {

    console.log(
        "Loading Discord servers..."
    );


    const selector =
        document.getElementById(
            "server-selector"
        );


    selector.innerHTML = `
        <div class="loading-server">
            Loading servers...
        </div>
    `;


    try {

        const response = await fetch(
            "/api/guilds",
            {
                method: "GET",
                credentials: "include",
                cache: "no-store"
            }
        );


        const data =
            await response.json();


        console.log(
            "Guilds:",
            data
        );


        if (!response.ok) {

            selector.innerHTML = `
                <div class="loading-server">
                    Unable to load servers.
                </div>
            `;

            return;
        }


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            selector.innerHTML = `
                <div class="loading-server">
                    No manageable servers.
                </div>
            `;

            return;
        }


        createGuildSelector(
            data
        );

    } catch (error) {

        console.error(
            "Guild loading error:",
            error
        );

        selector.innerHTML = `
            <div class="loading-server">
                Failed to load servers.
            </div>
        `;
    }
}


function createGuildSelector(
    guilds
) {

    const selector =
        document.getElementById(
            "server-selector"
        );


    const saved =
        localStorage.getItem(
            "selectedGuild"
        );


    let selected =
        guilds.find(
            guild =>
                guild.id === saved
        );


    if (!selected) {

        selected =
            guilds[0];

    }


    currentGuild =
        selected.id;


    localStorage.setItem(
        "selectedGuild",
        currentGuild
    );


    selector.innerHTML = `

        <div class="server-select-wrapper">

            <div class="server-icon">

                ${
                    selected.icon

                    ? `
                        <img
                            src="https://cdn.discordapp.com/icons/${selected.id}/${selected.icon}.png?size=128"
                            alt=""
                        >
                    `

                    : escapeHtml(
                        selected.name
                            .charAt(0)
                            .toUpperCase()
                    )
                }

            </div>


            <select
                id="guild-select"
                class="server-select"
            >

                ${guilds.map(
                    guild => `

                        <option
                            value="${guild.id}"
                            ${
                                guild.id ===
                                currentGuild
                                    ? "selected"
                                    : ""
                            }
                        >
                            ${escapeHtml(
                                guild.name
                            )}
                        </option>

                    `
                ).join("")}

            </select>

        </div>
    `;


    const guildSelect =
        document.getElementById(
            "guild-select"
        );


    guildSelect.addEventListener(
        "change",
        () => {

            currentGuild =
                guildSelect.value;


            localStorage.setItem(
                "selectedGuild",
                currentGuild
            );


            const guild =
                guilds.find(
                    item =>
                        item.id ===
                        currentGuild
                );


            if (guild) {

                updateServerIcon(
                    guild
                );

            }


            loadServerData(
                currentGuild
            );
        }
    );


    loadServerData(
        currentGuild
    );
}


function updateServerIcon(
    guild
) {

    const icon =
        document.querySelector(
            ".server-icon"
        );


    if (!icon)
        return;


    if (guild.icon) {

        icon.innerHTML = `
            <img
                src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128"
                alt=""
            >
        `;

    } else {

        icon.textContent =
            guild.name
                .charAt(0)
                .toUpperCase();
    }
}


/* =========================================
   SERVER DATA
========================================= */

async function loadServerData(
    guildId
) {

    console.log(
        "Selected server:",
        guildId
    );


    /*
     * This is where we connect
     * the website to the Railway bot API.
     *
     * Authentication itself is already
     * handled separately.
     */
}


/* =========================================
   NAVIGATION
========================================= */

function showPage(
    page
) {

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


    const active =
        document.querySelector(
            `.nav-item[data-page="${page}"]`
        );


    if (active) {

        active.classList.add(
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


    if (titles[page]) {

        document.getElementById(
            "page-title"
        ).textContent =
            titles[page][0];


        document.getElementById(
            "page-description"
        ).textContent =
            titles[page][1];
    }
}


/* =========================================
   MODALS
========================================= */

function openModal(
    id
) {

    document
        .getElementById(id)
        ?.classList.add("open");
}


function closeModal(
    id
) {

    document
        .getElementById(id)
        ?.classList.remove("open");
}


/* =========================================
   INVITES
========================================= */

function adjustInvites() {

    const user =
        document
            .getElementById(
                "invite-user"
            )
            .value
            .trim();


    const amount =
        Number(
            document
                .getElementById(
                    "invite-amount"
                )
                .value
        );


    if (!currentGuild) {

        alert(
            "Select a server first."
        );

        return;
    }


    if (!user) {

        alert(
            "Enter a Discord User ID."
        );

        return;
    }


    if (
        !Number.isInteger(amount) ||
        amount === 0
    ) {

        alert(
            "Enter a valid amount."
        );

        return;
    }


    console.log({
        guildId:
            currentGuild,

        user,

        amount
    });


    alert(
        "Ready to connect to the bot API."
    );


    closeModal(
        "invite-modal"
    );
}


/* =========================================
   REWARDS
========================================= */

function addReward() {

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


    if (!currentGuild) {

        alert(
            "Select a server first."
        );

        return;
    }


    if (
        !Number.isInteger(goal) ||
        goal <= 0
    ) {

        alert(
            "Enter a valid invite goal."
        );

        return;
    }


    if (!role) {

        alert(
            "Enter a Discord Role ID."
        );

        return;
    }


    console.log({

        guildId:
            currentGuild,

        goal,

        role

    });


    alert(
        "Reward ready to connect to the bot API."
    );


    closeModal(
        "reward-modal"
    );
}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(
    value
) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /* Navigation */

        document
            .querySelectorAll(
                ".nav-item"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            showPage(
                                button.dataset.page
                            );

                        }
                    );

                }
            );


        /* Dashboard buttons */

        document
            .querySelectorAll(
                "[data-page-button]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            showPage(
                                button.dataset.pageButton
                            );

                        }
                    );

                }
            );


        /* Login */

        document
            .getElementById(
                "login-button"
            )
            .addEventListener(
                "click",
                loginWithDiscord
            );


        /* Invite modal */

        document
            .getElementById(
                "open-invite-modal"
            )
            .addEventListener(
                "click",
                () =>
                    openModal(
                        "invite-modal"
                    )
            );


        /* Reward modal */

        document
            .getElementById(
                "open-reward-modal"
            )
            .addEventListener(
                "click",
                () =>
                    openModal(
                        "reward-modal"
                    )
            );


        /* Close modal */

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () =>
                            closeModal(
                                button.dataset.close
                            )
                    );

                }
            );


        /* Invite adjustment */

        document
            .getElementById(
                "adjust-invites"
            )
            .addEventListener(
                "click",
                adjustInvites
            );


        /* Reward */

        document
            .getElementById(
                "add-reward"
            )
            .addEventListener(
                "click",
                addReward
            );


        /* Outside modal */

        document
            .querySelectorAll(
                ".modal"
            )
            .forEach(
                modal => {

                    modal.addEventListener(
                        "click",
                        event => {

                            if (
                                event.target ===
                                modal
                            ) {

                                modal.classList.remove(
                                    "open"
                                );

                            }

                        }
                    );

                }
            );


        /*
         * THIS IS THE ONLY AUTH CHECK.
         *
         * There is no login page.
         */

        checkAuthentication();

    }
);