function setLoginError(message) {
  const el = document.getElementById("login-error");

  if (!el) return;

  el.hidden = !message;
  el.textContent = message || "";
}

function wireDiscordLogin() {
  const discordBtn = document.getElementById("login-button");

  if (!discordBtn || discordBtn.dataset.wired === "1") {
    return;
  }

  discordBtn.dataset.wired = "1";

  discordBtn.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = "/api/login";
  });
}

function wireLogout() {
  const logoutBtn = document.getElementById("logout-button");

  if (!logoutBtn || logoutBtn.dataset.wired === "1") {
    return;
  }

  logoutBtn.dataset.wired = "1";

  logoutBtn.addEventListener("click", () => {
    window.location.href = "/api/logout";
  });
}

function ensureEmailLoginForm() {
  const card = document.querySelector(".login-card");

  if (!card) return;

  if (!document.getElementById("password-login-form")) {
    const discordBtn = document.getElementById("login-button");

    const form = document.createElement("form");

    form.id = "password-login-form";
    form.className = "login-form";
    form.autocomplete = "on";

    form.innerHTML = `
      <label class="login-field">
        <span>Email</span>
        <input
          id="login-email"
          name="email"
          type="email"
          inputmode="email"
          autocomplete="email"
          required
          placeholder="you@example.com"
        >
      </label>

      <label class="login-field">
        <span>Password</span>
        <input
          id="login-password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          minlength="8"
          placeholder="At least 8 characters"
        >
      </label>

      <p class="login-error" id="login-error" hidden></p>

      <button
        class="button login-btn"
        id="password-login-button"
        type="submit"
      >
        Log in
      </button>

      <button
        class="button secondary login-btn"
        id="password-signup-button"
        type="button"
      >
        Create account
      </button>
    `;

    const divider = document.createElement("div");

    divider.className = "login-divider";
    divider.innerHTML = "<span>or</span>";

    if (discordBtn) {
      discordBtn.classList.add("secondary");

      card.insertBefore(form, discordBtn);
      card.insertBefore(divider, discordBtn);
    } else {
      card.appendChild(form);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitPasswordAuth("/api/auth-login");
    });

    document
      .getElementById("password-signup-button")
      ?.addEventListener("click", () => {
        submitPasswordAuth("/api/signup");
      });
  }

  wireDiscordLogin();
  wireLogout();
}

async function submitPasswordAuth(endpoint) {
  const email =
    document.getElementById("login-email")?.value?.trim();

  const password =
    document.getElementById("login-password")?.value || "";

  const loginBtn =
    document.getElementById("password-login-button");

  const signupBtn =
    document.getElementById("password-signup-button");

  setLoginError("");

  if (!email || !password) {
    setLoginError("Enter an email and password.");
    return;
  }

  if (password.length < 8) {
    setLoginError("Password must be at least 8 characters.");
    return;
  }

  if (loginBtn) loginBtn.disabled = true;
  if (signupBtn) signupBtn.disabled = true;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      setLoginError(data.error || "Login failed.");
      return;
    }

    /*
     * IMPORTANT:
     *
     * Email login is now completely independent from Discord OAuth.
     *
     * If this account has a linked Discord account, that's fine.
     * We DO NOT redirect to /api/login.
     */
    window.location.reload();
  } catch {
    setLoginError("Could not reach the login server.");
  } finally {
    if (loginBtn) loginBtn.disabled = false;
    if (signupBtn) signupBtn.disabled = false;
  }
}

async function checkLogin() {
  const loginScreen =
    document.getElementById("login-screen");

  const app =
    document.getElementById("app");

  try {
    const response = await fetch("/api/user", {
      credentials: "include",
      cache: "no-store",
    });

    const data =
      await response.json().catch(() => ({}));

    if (
      !response.ok ||
      !data?.authenticated ||
      !data?.user
    ) {
      if (loginScreen) loginScreen.hidden = false;
      if (app) app.hidden = true;
      return;
    }

    if (loginScreen) loginScreen.hidden = true;
    if (app) app.hidden = false;

    const user = data.user;

    const name =
      user.global_name ||
      user.username ||
      user.email ||
      "Account";

    const usernameEl =
      document.getElementById("username");

    const welcomeEl =
      document.getElementById("welcome-name");

    if (usernameEl) {
      usernameEl.textContent = name;
    }

    if (welcomeEl) {
      welcomeEl.textContent = name;
    }

    const accountLabel =
      document.querySelector(".account-info span");

    if (accountLabel) {
      accountLabel.textContent =
        user.discord_id
          ? "Discord linked"
          : user.email
            ? "Email account"
            : "Account";
    }

    const avatar =
      document.getElementById("user-avatar");

    if (avatar) {
      if (user.discord_id && user.avatar) {
        avatar.src =
          `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`;
      } else {
        avatar.src =
          "https://cdn.discordapp.com/embed/avatars/0.png";
      }
    }
  } catch {
    if (loginScreen) loginScreen.hidden = false;
    if (app) app.hidden = true;
  }
}

function startEmailLogin() {
  ensureEmailLoginForm();
  checkLogin();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startEmailLogin
  );
} else {
  startEmailLogin();
}