/* Legacy theme-picker cleanup.
   The dashboard now uses the persistent Café au Lait / Dark Roast preference.
   Keep removing obsolete cached theme UI without touching coffeeShopTheme. */
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
      "themes-server-view-css",
      "server-view-theme-garden-css",
      "server-view-themes-extra-css"
    ].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.remove();
    });

    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      var href = link.getAttribute("href") || "";
      if (/(?:themes-(packs|force|radical|insane|extra|server-view)|theme-sweetheart|server-view-theme-garden|server-view-themes-extra)\.css/i.test(href)) {
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
