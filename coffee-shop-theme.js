(function () {
  "use strict";

  var STORAGE_KEY = "coffeeShopTheme";
  var THEMES = ["cafe", "dark-roast"];
  var initialized = false;

  function isTheme(value) {
    return THEMES.indexOf(value) !== -1;
  }

  function readTheme() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      return isTheme(stored) ? stored : "cafe";
    } catch (_) {
      return "cafe";
    }
  }

  function updateControl(theme) {
    var button = document.getElementById("coffee-shop-theme-toggle");
    if (!button) return;
    var isDark = theme === "dark-roast";
    button.textContent = isDark ? "🌙 Dark Roast" : "☀ Café au Lait";
    button.setAttribute("aria-label", isDark ? "Switch to Café au Lait theme" : "Switch to Dark Roast theme");
    button.setAttribute("aria-pressed", isDark ? "true" : "false");
    button.title = isDark ? "Switch to Café au Lait" : "Switch to Dark Roast";
    button.dataset.theme = theme;
  }

  function applyTheme(theme) {
    var selected = isTheme(theme) ? theme : "cafe";
    if (document.body) document.body.dataset.coffeeTheme = selected;
    if (document.documentElement) document.documentElement.dataset.coffeeTheme = selected;
    if (document.documentElement && document.documentElement.style) {
      document.documentElement.style.colorScheme = selected === "dark-roast" ? "dark" : "light";
    }
    updateControl(selected);
    try {
      window.localStorage.setItem(STORAGE_KEY, selected);
    } catch (_) {
      // The theme still applies for this visit when storage is unavailable.
    }
    return selected;
  }

  function getTheme() {
    var active = document.body && document.body.dataset.coffeeTheme;
    return isTheme(active) ? active : readTheme();
  }

  function setTheme(theme) {
    return applyTheme(theme);
  }

  function toggleTheme() {
    return applyTheme(getTheme() === "cafe" ? "dark-roast" : "cafe");
  }

  function init() {
    applyTheme(readTheme());
    var button = document.getElementById("coffee-shop-theme-toggle");
    if (button && !button.dataset.themeBound) {
      button.dataset.themeBound = "1";
      button.addEventListener("click", toggleTheme);
    }
    initialized = true;
    return getTheme();
  }

  window.CoffeeShopTheme = Object.freeze({
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    init: init
  });

  if (document.readyState === "loading" && !initialized) {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
