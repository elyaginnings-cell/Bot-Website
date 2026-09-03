function setLoginError(message) {
  const el = document.getElementById("login-error");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || "";
}

function ensureEmailLoginForm() {
  const card = document.querySelector(".login-card");
  if (!card || document.getElementById("password-login-form")) return;

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
    window.location.reload();
  } catch {
    setLoginError("Could not reach the login server.");
  } finally {
    if (loginBtn) loginBtn.disabled = false;
    if (signupBtn) signupBtn.disabled = false;
  }
}

function startEmailLogin() {
  ensureEmailLoginForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startEmailLogin);
} else {
  startEmailLogin();
}
