/**
 * Server View themes v2 — expand settings dropdown + apply theme classes.
 */
(function () {
  "use strict";
  if (window.__svThemesExpandV2) return;
  window.__svThemesExpandV2 = true;

  var THEMES = [
    { id: "discord", label: "Discord" },
    { id: "darker", label: "Darker" },
    { id: "amoled", label: "AMOLED" },
    { id: "ash", label: "Ash" },
    { id: "blurple", label: "Blurple" },
    { id: "light", label: "Light" },
    { id: "midnight", label: "Midnight" },
    { id: "nord", label: "Nord" },
    { id: "dracula", label: "Dracula" },
    { id: "catppuccin", label: "Catppuccin" },
    { id: "tokyo", label: "Tokyo Night" },
    { id: "gruvbox", label: "Gruvbox" },
    { id: "forest", label: "Forest" },
    { id: "ocean", label: "Ocean" },
    { id: "crimson", label: "Crimson" },
    { id: "cyber", label: "Cyber" },
    { id: "vapor", label: "Vapor" },
    { id: "soft", label: "Soft" },
    { id: "mono", label: "Mono" },
    { id: "terminal", label: "Terminal" },
    { id: "garden", label: "Garden" },
  ];

  var ALL = THEMES.map(function (t) { return t.id; });

  function ensureCss() {
    if (!document.getElementById("sv-themes-extra-css")) {
      var a = document.createElement("link");
      a.id = "sv-themes-extra-css";
      a.rel = "stylesheet";
      a.href = "/server-view-themes-extra.css?v=2";
      document.head.appendChild(a);
    }
    var links = document.querySelectorAll('link[href*="server-view-theme-garden"]');
    if (links.length) {
      links.forEach(function (l) { l.href = "/server-view-theme-garden.css?v=3"; });
    } else if (!document.getElementById("sv-theme-garden-css")) {
      var g = document.createElement("link");
      g.id = "sv-theme-garden-css";
      g.rel = "stylesheet";
      g.href = "/server-view-theme-garden.css?v=3";
      document.head.appendChild(g);
    }
  }

  function fillSelect() {
    var sel = document.getElementById("sv-theme");
    if (!sel) return false;
    var saved = "discord";
    try { saved = localStorage.getItem("svTheme") || "discord"; } catch (_) {}
    var current = sel.value || saved;
    if (ALL.indexOf(current) < 0) current = "discord";
    if (sel.options.length < THEMES.length) {
      sel.innerHTML = THEMES.map(function (t) {
        return '<option value="' + t.id + '">' + t.label + "</option>";
      }).join("");
    }
    sel.value = current;
    return true;
  }

  function applyTheme(theme) {
    var view = document.getElementById("server-view");
    if (!view) return;
    theme = theme || "discord";
    if (ALL.indexOf(theme) < 0) theme = "discord";
    var rm = [];
    view.classList.forEach(function (c) {
      if (c.indexOf("theme-") === 0) rm.push(c);
    });
    rm.forEach(function (c) { view.classList.remove(c); });
    if (theme !== "discord") view.classList.add("theme-" + theme);
    try { localStorage.setItem("svTheme", theme); } catch (_) {}
    var sel = document.getElementById("sv-theme");
    if (sel && sel.value !== theme) sel.value = theme;
  }

  function onThemeChange() {
    var sel = document.getElementById("sv-theme");
    if (!sel) return;
    applyTheme(sel.value || "discord");
  }

  function hookSelect() {
    var sel = document.getElementById("sv-theme");
    if (!sel) return false;
    fillSelect();
    if (!sel.__svThemeBound) {
      sel.__svThemeBound = true;
      sel.addEventListener("change", onThemeChange);
    }
    var t = sel.value;
    try { t = t || localStorage.getItem("svTheme") || "discord"; } catch (_) { t = t || "discord"; }
    applyTheme(t);
    return true;
  }

  function hookSettingsBtn() {
    var btn = document.getElementById("sv-settings-btn");
    if (!btn || btn.__svThemeBound) return !!btn;
    btn.__svThemeBound = true;
    btn.addEventListener("click", function () {
      setTimeout(function () { ensureCss(); fillSelect(); hookSelect(); }, 0);
      setTimeout(fillSelect, 50);
    }, true);
    return true;
  }

  function boot() {
    ensureCss();
    hookSelect();
    hookSettingsBtn();
  }

  setInterval(function () {
    var view = document.getElementById("server-view");
    if (!view || view.hidden) return;
    var t = "discord";
    try { t = localStorage.getItem("svTheme") || "discord"; } catch (_) {}
    if (t !== "discord" && !view.classList.contains("theme-" + t)) applyTheme(t);
    fillSelect();
  }, 1500);

  var n = 0;
  function retry() {
    n++;
    boot();
    if (n < 60) setTimeout(retry, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", retry);
  else retry();

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "sv-settings-btn" || (t.closest && t.closest("#sv-settings-btn"))) {
      setTimeout(function () { fillSelect(); hookSelect(); }, 0);
    }
  }, true);

  window.__svApplyTheme = applyTheme;
  window.__svFillThemes = fillSelect;
  console.log("[sv-themes-expand] v2 — " + THEMES.length + " themes in SV settings");
})();
