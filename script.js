const loginButton =
    document.querySelector(".discord-login");


async function loadUser() {
    try {
        const response =
            await fetch("/api/auth/me");

        const data =
            await response.json();

        if (!data.loggedIn) {
            return;
        }

        if (loginButton) {
            loginButton.textContent =
                `Logged in as ${
                    data.user.global_name ||
                    data.user.username
                }`;

            loginButton.onclick = () => {
                window.location.href =
                    "/api/auth/logout";
            };
        }

        console.log(
            "Logged in Discord user:",
            data.user
        );

        console.log(
            "Available Discord servers:",
            data.guilds
        );

    } catch (error) {
        console.error(
            "Failed to load Discord user:",
            error
        );
    }
}


if (loginButton) {
    loginButton.addEventListener(
        "click",
        () => {
            window.location.href =
                "/api/auth/login";
        }
    );
}


loadUser();