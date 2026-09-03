function setLoginError(message) {
  const el = document.getElementById("login-error");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || "";
}

function wireDiscordLogin() {
  const discordBtn = document.getElementById("login-button");
  if (!discordBtn || discordBtn.dataset.wired === "1") return;
  discordBtn.dataset.wired = "1";
  discordBtn.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.href = "/api/login";
  });
}

function wireLogout() {
  const logoutBtn = document.getElementById("logout-button");
  if (!logoutBtn || logoutBtn.dataset.wired === "1") return;
  logoutBtn.dataset.wired = "1";
  logoutBtn.addEventListener("click", () => {
    window.location.href = "/api/logout";
  });
}

function showDiscordReconnectBanner(opts = {}) {
  const existing = document.getElementById("link-discord-banner");
  if (existing) existing.remove();

  const title = opts.title || "Reconnect Discord";
  const body =
    opts.body ||
    "Your account is linked, but this browser needs a fresh Discord login to load servers.";
  const btnLabel = opts.btnLabel || "Reconnect Discord";

  const banner = document.createElement("div");
  banner.id = "link-discord-banner";
  banner.className = "card";
  banner.style.cssText =
    "margin-bottom:12px;border-color:rgba(255,77,240,0.55);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;";
  banner.innerHTML = `
    <div>
      <strong style="color:#ff4df0">${title}</strong>
      <p style="color:#b89cd9;font-size:13px;margin-top:4px">${body}</p>
    </div>
    <button class="button" id="link-discord-btn" type="button">${btnLabel}</button>
  `;

  const main = document.querySelector(".main");
  const header = document.querySelector(".header");
  if (main && header) {
    main.insertBefore(banner, header.nextSibling);
  } else if (main) {
    main.prepend(banner);
  }

  document.getElementById("link-discord-btn")?.addEventListener("click", () => {
    window.location.href = "/api/login?state=link";
  });
}

function ensureLinkDiscordBanner(user) {
  const existing = document.getElementById("link-discord-banner");
  const needsFirstLink = user && !user.discord_id && !user.linked;

  if (needsFirstLink) {
    showDiscordReconnectBanner({
      title: "Connect Discord",
      body: "Your email is logged in, but Discord isn't linked yet — link it to load your servers.",
      btnLabel: "Link Discord",
    });
    return;
  }

  // Linked in DB is not enough — we still need a live Discord token cookie in this browser.
  // Probe guilds lightly; if token missing, show reconnect.
  if (user?.discord_id) {
    fetch("/api/guilds", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (res.ok) {
          if (existing && existing.querySelector("#link-discord-btn")) {
            // keep banner only if it was a forced reconnect
          }
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (
          data.code === "DISCORD_NOT_LINKED" ||
          data.code === "DISCORD_EXPIRED" ||
          /not linked|expired|Discord is not linked/i.test(data.error || "")
        ) {
          showDiscordReconnectBanner();
        }
      })
      .catch(() => {});
  } else if (existing) {
    existing.remove();
  }
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
        <input id="login-email" name="email" type="email" inputmode="email" autocomplete="email" required placeholder="you@example.com">
      </label>
      <label class="login-field">
        <span>Password</span>
        <input id="login-password" name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="At least 8 characters">
      </label>
      <p class="login-error" id="login-error" hidden></p>
      <button class="button login-btn" id="password-login-button" type="submit">Log in</button>
      <button class="button secondary login-btn" id="password-signup-button" type="button">Create account</button>
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
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitPasswordAuth("/api/auth-login");
    });
    document.getElementById("password-signup-button")?.addEventListener("click", () => {
      submitPasswordAuth("/api/signup");
    });
  }

  wireDiscordLogin();
  wireLogout();
}

async function submitPasswordAuth(endpoint) {
  const email = document.getElementById("login-email")?.value?.trim();
  const password = document.getElementById("login-password")?.value || "";
  const loginBtn = document.getElementById("password-login-button");
  const signupBtn = document.getElementById("password-signup-button");
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setLoginError(data.error || "Login failed.");
      return;
    }

    // Account is linked in DB, but email login does not create a Discord access token.
    // Bounce through Discord OAuth once so guilds/API work in this browser.
    if (data.user?.discord_id || data.user?.linked) {
      window.location.href = "/api/login?state=link";
      return;
    }

    window.location.reload();
  } catch {
    setLoginError("Could not reach the login server.");
  } finally {
    if (loginBtn) loginBtn.disabled = false;
    if (signupBtn) signupBtn.disabled = false;
  }
}

async function checkLogin() {
  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");
  try {
    const response = await fetch("/api/user", { credentials: "include", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.authenticated || !data?.user) {
      if (loginScreen) loginScreen.hidden = false;
      if (app) app.hidden = true;
      return;
    }
    if (loginScreen) loginScreen.hidden = true;
    if (app) app.hidden = false;

    const user = data.user;
    const name = user.global_name || user.username || user.email || "Account";
    const usernameEl = document.getElementById("username");
    const welcomeEl = document.getElementById("welcome-name");
    if (usernameEl) usernameEl.textContent = name;
    if (welcomeEl) welcomeEl.textContent = name;

    const accountLabel = document.querySelector(".account-info span");
    if (accountLabel) {
      accountLabel.textContent = user.discord_id
        ? "Discord linked"
        : user.email
          ? "Email account"
          : "Account";
    }

    const avatar = document.getElementById("user-avatar");
    if (avatar) {
      if (user.discord_id && user.avatar) {
        avatar.src = `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=128`;
      } else {
        avatar.src = "https://cdn.discordapp.com/embed/avatars/0.png";
      }
    }

    ensureLinkDiscordBanner(user);
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
  document.addEventListener("DOMContentLoaded", startEmailLogin);
} else {
  startEmailLogin();
}

// Expose for script.js loadServers errors
window.showDiscordReconnectBanner = showDiscordReconnectBanner;
