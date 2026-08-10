let currentGuild = null;
let currentUser = null;


/* ========================================
   AUTHENTICATION
======================================== */

async function loadUser() {

    console.log("Checking Discord authentication...");

    try {

        const response = await fetch(
            "/api/user",
            {
                method: "GET",

                credentials: "include",

                cache: "no-store"
            }
        );


        const data =
            await response.json();


        console.log(
            "Authentication response:",
            data
        );


        if (
            response.ok &&
            data.authenticated === true
        ) {

            currentUser =
                data.user;

            hideLogin();

            await loadGuilds();

            return;
        }


        showLogin();

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        showLogin();
    }
}


/* ========================================
   LOGIN SCREEN
======================================== */

function showLogin() {

    const login =
        document.getElementById(
            "login-screen"
        );

    if (!login)
        return;


    login.style.display =
        "grid";
}


function hideLogin() {

    const login =
        document.getElementById(
            "login-screen"
        );

    if (!login)
        return;


    login.style.display =
        "none";
}


function loginWithDiscord() {

    window.location.href =
        "/api/login";
}


/* ========================================
   GUILD LOADING
======================================== */

async function loadGuilds() {

    console.log(
        "Loading Discord servers..."
    );


    try {

        const response =
            await fetch(
                "/api/guilds",
                {
                    credentials:
                        "include",

                    cache:
                        "no-store"
                }
            );


        const data =
            await response.json();


        console.log(
            "Guild response:",
            data
        );


        if (!response.ok) {

            console.error(
                "Could not load guilds:",
                data
            );

            showGuildError();

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

        showGuildError();
    }
}


/* ========================================
   SERVER SELECTOR
======================================== */

function createGuildSelector(
    guilds
) {

    const selector =
        document.getElementById(
            "server-selector"
        );


    if (!selector)
        return;


    if (
        !Array.isArray(guilds) ||
        guilds.length === 0
    ) {

        selector.innerHTML = `
            <div class="loading-server">
                No manageable servers found.
            </div>
        `;

        return;
    }


    const savedGuild =
        localStorage.getItem(
            "selectedGuild"
        );


    let selectedGuild =
        guilds.find(
            guild =>
                guild.id ===
                savedGuild
        );


    if (!selectedGuild) {

        selectedGuild =
            guilds[0];

    }


    currentGuild =
        selectedGuild.id;


    localStorage.setItem(
        "selectedGuild",
        currentGuild
    );


    selector.innerHTML = `

        <div class="server-select-wrapper">

            <div class="server-icon">

                ${
                    selectedGuild.icon

                    ? `
                        <img
                            src="https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png?size=128"
                            alt=""
                        >
                    `

                    : escapeHtml(
                        selectedGuild.name
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


            console.log(
                "Selected server:",
                currentGuild
            );


            /*
             * This is where we will
             * load that server's bot data.
             */

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


function showGuildError() {

    const selector =
        document.getElementById(
            "server-selector"
        );


    if (!selector)
        return;


    selector.innerHTML = `
        <div class="loading-server">
            Unable to load servers.
        </div>
    `;
}


/* ========================================
   SERVER DATA
======================================== */

async function loadServerData(
    guildId
) {

    console.log(
        "Loading data for server:",
        guildId
    );

    /*
     * Backend connection to the
     * Railway bot will go here.
     *
     * For now the dashboard uses
     * placeholder statistics.
     */
}


/* ========================================
   PAGE NAVIGATION
======================================== */

function showPage(
    page
) {

    document
        .querySelectorAll(
            ".page"
        )
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
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            button =>
                button.classList.remove(
                    "active"
                )
        );


    const activeButton =
        document.querySelector(
            `.nav-item[data-page="${page}"]`
        );


    if (activeButton) {

        activeButton.classList.add(
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
            "Configure your Discord bot."
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


/* ========================================
   MODALS
======================================== */

function openModal(
    id
) {

    const modal =
        document.getElementById(
            id
        );


    if (modal) {

        modal.classList.add(
            "open"
        );

    }
}


function closeModal(
    id
) {

    const modal =
        document.getElementById(
            id
        );


    if (modal) {

        modal.classList.remove(
            "open"
        );

    }
}


/* ========================================
   INVITE ADJUSTMENT
======================================== */

function adjustInvites() {

    const user =
        document.getElementById(
            "invite-user"
        ).value.trim();


    const amount =
        Number(
            document.getElementById(
                "invite-amount"
            ).value
        );


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


    console.log(
        "Invite adjustment:",
        {
            guildId:
                currentGuild,

            user,

            amount
        }
    );


    alert(
        "Invite adjustment ready for the bot API."
    );


    closeModal(
        "invite-modal"
    );
}


/* ========================================
   REWARDS
======================================== */

function addReward() {

    const goal =
        Number(
            document.getElementById(
                "reward-goal"
            ).value
        );


    const role =
        document.getElementById(
            "reward-role"
        ).value.trim();


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


    console.log(
        "Reward:",
        {
            guildId:
                currentGuild,

            goal,

            role
        }
    );


    alert(
        "Reward configuration ready for the bot API."
    );


    closeModal(
        "reward-modal"
    );
}


/* ========================================
   HTML ESCAPING
======================================== */

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


/* ========================================
   EVENT LISTENERS
======================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
         * Navigation
         */

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


        /*
         * Dashboard buttons
         */

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


        /*
         * Login
         */

        document
            .getElementById(
                "login-button"
            )
            .addEventListener(
                "click",
                loginWithDiscord
            );


        /*
         * Invite modal
         */

        document
            .getElementById(
                "open-invite-modal"
            )
            .addEventListener(
                "click",
                () => {

                    openModal(
                        "invite-modal"
                    );

                }
            );


        /*
         * Reward modal
         */

        document
            .getElementById(
                "open-reward-modal"
            )
            .addEventListener(
                "click",
                () => {

                    openModal(
                        "reward-modal"
                    );

                }
            );


        /*
         * Close buttons
         */

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            closeModal(
                                button.dataset.close
                            );

                        }
                    );

                }
            );


        /*
         * Invite adjustment
         */

        document
            .getElementById(
                "adjust-invites"
            )
            .addEventListener(
                "click",
                adjustInvites
            );


        /*
         * Add reward
         */

        document
            .getElementById(
                "add-reward"
            )
            .addEventListener(
                "click",
                addReward
            );


        /*
         * Click outside modal
         */

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
         * Finally check authentication.
         */

        loadUser();

    }
);