let currentPage = "overview";


function showPage(page) {

    document
        .querySelectorAll(".page")
        .forEach(
            element =>
                element.classList.remove(
                    "active-page"
                )
        );


    document
        .getElementById(page)
        .classList.add(
            "active-page"
        );


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


    const pageIndex = {

        overview: 0,

        invites: 1,

        rewards: 2,

        settings: 3

    };


    if (
        buttons[pageIndex[page]]
    ) {

        buttons[
            pageIndex[page]
        ].classList.add(
            "active"
        );

    }


    const titles = {

        overview:
            [
                "Overview",
                "Manage your Discord server."
            ],

        invites:
            [
                "Invite Tracker",
                "Track who is bringing members into your server."
            ],

        rewards:
            [
                "Automatic Rewards",
                "Give members roles when they reach invite milestones."
            ],

        settings:
            [
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


    currentPage = page;

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
   DEMO INVITE ADJUSTMENT
================================ */

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


    /*
     * Backend connection comes next.
     */

    console.log(
        "Adjust invites:",
        {
            user,
            amount
        }
    );


    alert(
        `Would ${amount > 0 ? "add" : "remove"} ${Math.abs(amount)} invite(s).`
    );


    closeModal(
        "invite-modal"
    );

}



/* ================================
   DEMO REWARD
================================ */

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
        "Create reward:",
        {
            goal,
            role
        }
    );


    alert(
        `Reward created at ${goal} invites.`
    );


    closeModal(
        "reward-modal"
    );

}



/* ================================
   CLOSE MODAL WHEN CLICKING OUTSIDE
================================ */

document
    .querySelectorAll(".modal")
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