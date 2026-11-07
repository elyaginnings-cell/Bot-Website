/* Theme system retired.
   The dashboard now uses one fixed purple design. This file remains as a
   compatibility kill-switch for older cached pages that still request it. */
(function () {
  "use strict";

  function removeLegacyThemes() {
    var selectors = [
      "#theme-fab",
      "#themes",
      "#theme-dropdown-wrap",
      "#dashboard-theme",
      '[data-tab="themes"]',
      "#themes-current-label",
      "#themes-grid"
    ];

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        node.remove();
      });
    });

    [
      "themes-packs-css",
      "themes-force-base-css",
      "themes-force-struct-css",
      "themes-radical-css",
      "themes-insane-css",
      "theme-sweetheart-css",
      "themes-extra-css",
      "themes-server-view-css"
    ].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.remove();
    });

    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (/themes-(packs|force|radical|insane|extra|server-view)\.css|theme-sweetheart\.css/i.test(href)) {
        link.remove();
      }
    });

    if (document.body) {
      Array.from(document.body.classList).forEach(function (name) {
        if (name.indexOf("theme-") === 0) document.body.classList.remove(name);
      });
      document.body.removeAttribute("data-theme");
    }

    try { localStorage.removeItem("dashboardTheme"); } catch (_) {}
  }

  removeLegacyThemes();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeLegacyThemes, { once: true });
  }

  if (window.MutationObserver && document.documentElement) {
    var observer = new MutationObserver(removeLegacyThemes);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("pagehide", function () { observer.disconnect(); }, { once: true });
  }
})();
