/**
 * Expand Server View theme dropdown + apply classes generically.
 * Does not depend on dashboard themes.
 */
(function () {
  "use strict";
  if (window.__svThemesExpandV1) return;
  window.__svThemesExpandV1 = true;

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
    { id: "garden", label: "Garden \ud83c\udf3b" },
  ];

  var ALL_IDS = THEMES.map(function (t) { return t.id; });

  function loadCss() {
    if (document.getElementById("sv-themes-extra-css")) return;
    var link = document.createElement("link");
    link.id = "sv-themes-extra-css";
    link.rel = "stylesheet";
    link.href = "/server-view-themes-extra.css?v=1";
    document.head.appendChild(link);
  }

  function fillSelect() {
    var sel = document.getElementById("sv-theme");
    if (!sel) return false;
    var current = sel.value || localStorage.getItem("svTheme") || "discord";
    sel.innerHTML = THEMES.map(function (t) {
      return '<option value="' + t.id + '">' + t.label + "</option>";
    }).join("");
    if (ALL_IDS.indexOf(current) < 0) current = "discord";
    sel.value = current;
    return true;
  }

  function applyThemeClass(theme) {
    var view = document.getElementById("server-view");
    if (!view) return;
    var toRemove = [];
    view.classList.forEach(function (c) {
      if (c.indexOf("theme-") === 0) toRemove.push(c);
    });
    toRemove.forEach(function (c) { view.classList.remove(c); });
    if (theme && theme !== "discord") {
      view.classList.add("theme-" + theme);
    }
  }

  function hook() {
    var sel = document.getElementById("sv-theme");
    if (!sel || sel.__svThemesHooked) return !!sel;
    sel.__svThemesHooked = true;

    sel.addEventListener("change", function () {
      var theme = sel.value || "discord";
      applyThemeClass(theme);
      try { localStorage.setItem("svTheme", theme); } catch (_) {}
    });

    var theme = sel.value || localStorage.getItem("svTheme") || "discord";
    applyThemeClass(theme);

    var view = document.getElementById("server-view");
    if (view) {
      var obs = new MutationObserver(function () {
        var t = localStorage.getItem("svTheme") || "discord";
        if (t !== "discord" && !view.classList.contains("theme-" + t)) {
          var has = false;
          view.classList.forEach(function (c) {
            if (c.indexOf("theme-") === 0) has = true;
          });
          if (!has) applyThemeClass(t);
        }
      });
      obs.observe(view, { attributes: true, attributeFilter: ["class"] });
    }
    return true;
  }

  function boot() {
    loadCss();
    fillSelect();
    hook();
  }

  var n = 0;
  function retry() {
    n++;
    boot();
    if (n < 50) setTimeout(retry, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", retry);
  } else {
    retry();
  }

  console.log("[sv-themes-expand] v1 — " + THEMES.length + " Server View themes");
})();
