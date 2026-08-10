let user = null;
let guilds = [];

let selectedGuild = null;


const loginScreen =
    document.getElementById("loginScreen");

const dashboard =
    document.getElementById("dashboard");

const loginButton =
    document.getElementById("loginButton");

const logoutButton =
    document.getElementById("logoutButton");

const serverButton =
    document.getElementById("serverButton");

const serverModal =
    document.getElementById("serverModal");

const closeModal =
    document.getElementById("closeModal");

const serverList =
    document.getElementById("serverList");

const serverName =
    document.getElementById("serverName");

const serverIcon =
    document.getElementById("serverIcon");

const username =
    document.getElementById("username");

const userAvatar =
    document.getElementById("userAvatar");

const noServer =
    document.getElementById("noServer");

const serverContent =
    document.getElementById("serverContent");

const botServerName =
    document.getElementById("botServerName");

const botId =
    document.getElementById("botId");



/* =========================
   DISCORD LOGIN
========================= */

async function loadUser() {

    try {

        const response =
            await fetch("/api/auth/me");

        if (!response.ok) {

            showLogin();

            return;
        }


        const data =
            await response.json();


        if (!data.loggedIn) {

            showLogin();

            return;
        }


        user = data.user;

        guilds = data.guilds || [];


        showDashboard();

        displayUser();

        loadServers();


    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        showLogin();
    }
}



/* =========================
   LOGIN SCREEN
========================= */

function showLogin() {

    loginScreen.classList.remove(
        "hidden"
    );

    dashboard.classList.add(
        "hidden"
    );
}


function showDashboard() {

    loginScreen.classList.add(
        "hidden"
    );

    dashboard.classList.remove(
        "hidden"
    );
}



/* =========================
   DISPLAY USER
========================= */

function displayUser() {

    if (!user) return;


    username.textContent =
        user.global_name ||
        user.username;


    /*
     * Discord avatar
     */

    if (user.avatar) {

        userAvatar.innerHTML = `
            <img
                src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128"
                alt="Discord Avatar"
            >
        `;

    } else {

        userAvatar.textContent =
            (
                user.global_name ||
                user.username
            )
            .charAt(0)
            .toUpperCase();

    }
}



/* =========================
   SERVER LIST
========================= */

function loadServers() {

    serverList.innerHTML = "";


    /*
     * Discord returns servers the user
     * belongs to.
     *
     * We only show servers where the user
     * has administrator permissions or
     * the Manage Server permission.
     */

    const manageableGuilds =
        guilds.filter(guild => {

            const permissions =
                BigInt(
                    guild.permissions || "0"
                );


            const ADMINISTRATOR =
                BigInt("8");

            const MANAGE_GUILD =
                BigInt("32");


            return (
                guild.owner ||
                (permissions &
                    ADMINISTRATOR) !==
                    BigInt(0) ||
                (permissions &
                    MANAGE_GUILD) !==
                    BigInt(0)
            );

        });


    if (
        manageableGuilds.length === 0
    ) {

        noServer.classList.remove(
            "hidden"
        );

        serverContent.classList.add(
            "hidden"
        );

        return;
    }


    noServer.classList.add(
        "hidden"
    );


    manageableGuilds.forEach(
        guild => {

            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "server-option";


            const icon =
                getGuildIcon(guild);


            button.innerHTML = `

                <div class="server-option-icon">
                    ${icon}
                </div>

                <div class="server-option-info">

                    <strong>
                        ${escapeHtml(guild.name)}
                    </strong>

                    <small>
                        ${guild.owner
                            ? "Owner"
                            : "Manage Server"}
                    </small>

                </div>

            `;


            button.addEventListener(
                "click",
                () => {

                    selectServer(guild);

                }
            );


            serverList.appendChild(
                button
            );

        }
    );


    /*
     * Automatically select the first
     * manageable server.
     */

    if (!selectedGuild) {

        selectServer(
            manageableGuilds[0]
        );

    }
}



/* =========================
   SERVER SELECTION
========================= */

function selectServer(guild) {

    selectedGuild = guild;


    serverName.textContent =
        guild.name;


    serverIcon.innerHTML =
        getGuildIcon(guild);


    botServerName.textContent =
        guild.name;


    /*
     * IMPORTANT:
     *
     * This is the Discord SERVER ID.
     *
     * We'll use this later to communicate
     * with your bot/database.
     */

    botId.textContent =
        guild.id;


    serverModal.classList.add(
        "hidden"
    );


    serverContent.classList.remove(
        "hidden"
    );


    console.log(
        "Selected Discord server:",
        guild
    );


    /*
     * For now these are placeholders.
     *
     * Next we'll replace these with
     * REAL data from your bot.
     */

    loadServerData(guild);
}



/* =========================
   SERVER ICON
========================= */

function getGuildIcon(guild) {

    if (guild.icon) {

        return `
            <img
                src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128"
                style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    border-radius:inherit;
                "
            >
        `;

    }


    return escapeHtml(
        guild.name
            .charAt(0)
            .toUpperCase()
    );
}



/* =========================
   SERVER DATA
========================= */

function loadServerData(guild) {

    console.log(
        "Loading data for:",
        guild.name
    );


    /*
     * PLACEHOLDER FOR NOW
     *
     * The next backend endpoint will
     * pull this information from your
     * Discord bot.
     */

    document.getElementById(
        "memberCount"
    ).textContent = "—";

    document.getElementById(
        "inviteCount"
    ).textContent = "—";

    document.getElementById(
        "rewardCount"
    ).textContent = "—";


    document.getElementById(
        "leaderboard"
    ).innerHTML = `
        <div class="loading">
            Invite tracking will appear here
            once the bot database is connected.
        </div>
    `;
}



/* =========================
   SERVER MODAL
========================= */

serverButton.addEventListener(
    "click",
    () => {

        serverModal.classList.remove(
            "hidden"
        );

    }
);


closeModal.addEventListener(
    "click",
    () => {

        serverModal.classList.add(
            "hidden"
        );

    }
);


document
    .querySelector(".modal-backdrop")
    .addEventListener(
        "click",
        () => {

            serverModal.classList.add(
                "hidden"
            );

        }
    );



/* =========================
   LOGOUT
========================= */

logoutButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "/api/auth/logout";

    }
);



/* =========================
   LOGIN BUTTON
========================= */

loginButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "/api/auth/login";

    }
);



/* =========================
   NAVIGATION
========================= */

document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".nav-item"
                    )
                    .forEach(item => {

                        item.classList.remove(
                            "active"
                        );

                    });


                button.classList.add(
                    "active"
                );


                const page =
                    button.dataset.page;


                const title =
                    document.getElementById(
                        "pageTitle"
                    );


                const titles = {

                    overview:
                        "Server Overview",

                    invites:
                        "Invite Tracker",

                    rewards:
                        "Invite Rewards",

                    settings:
                        "Bot Settings"

                };


                title.textContent =
                    titles[page] ||
                    "Dashboard";

            }
        );

    });



/* =========================
   HTML SAFETY
========================= */

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}



/* =========================
   START
========================= */

loadUser();