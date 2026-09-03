function setLoginError(message) {
  const el = document.getElementById("login-error");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || "";
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

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("password-login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    submitPasswordAuth("/api/auth-login");
  });
  document.getElementById("password-signup-button")?.addEventListener("click", () => {
    submitPasswordAuth("/api/signup");
  });
});
