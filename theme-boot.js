(function () {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "themes-extra.css";
  document.head.appendChild(link);

  const saved = localStorage.getItem("dashboardTheme") || "default";
  applyTheme(saved);

  function applyTheme(name) {
    document.body.classList.remove(
      "theme-mocha",
      "theme-neon",
      "theme-midnight",
      "theme-sakura",
      "theme-sunflower",
      "theme-bloodmoon",
      "theme-terminal"
    );
    if (name && name !== "default") {
      document.body.classList.add(`theme-${name}`);
    }
    localStorage.setItem("dashboardTheme", name || "default");
    const select = document.getElementById("dashboard-theme");
    if (select && select.value !== name) select.value = name;
  }

  function ensureThemeControl() {
    if (document.getElementById("dashboard-theme")) return;
    const wrap = document.querySelector(".view-mode-wrap");
    if (!wrap || !wrap.parentElement) return;

    const box = document.createElement("div");
    box.className = "view-mode-wrap";
    box.innerHTML = `
      <label class="view-mode-label" for="dashboard-theme">Theme</label>
      <select id="dashboard-theme" class="view-mode-select" title="Dashboard theme">
        <option value="default">Default</option>
        <option value="mocha">Mocha</option>
        <option value="neon">Neon</option>
        <option value="midnight">Midnight</option>
        <option value="sakura">Sakura</option>
        <option value="sunflower">Sunflower</option>
        <option value="bloodmoon">Bloodmoon</option>
        <option value="terminal">Terminal</option>
      </select>
    `;
    wrap.parentElement.insertBefore(box, wrap.nextSibling);
    const select = document.getElementById("dashboard-theme");
    select.value = localStorage.getItem("dashboardTheme") || "default";
    select.addEventListener("change", () => applyTheme(select.value));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureThemeControl);
  } else {
    ensureThemeControl();
  }

  window.__applyDashboardTheme = applyTheme;
})();
