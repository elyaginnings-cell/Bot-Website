/**
 * Site branding — ONLY the browser tab title is customizable.
 * The rest of the dashboard stays as Coffee Shop / your bot.
 */
(function () {
  var DEFAULT_TAB_TITLE = "Amazon.com. Spend Less. Smile More.";

  function loadTabTitle() {
    try {
      var raw = localStorage.getItem("siteTabTitle");
      if (raw && String(raw).trim()) return String(raw).trim();
    } catch (e) {}
    return DEFAULT_TAB_TITLE;
  }

  function saveTabTitle(title) {
    var next = (title && String(title).trim()) || DEFAULT_TAB_TITLE;
    try {
      localStorage.setItem("siteTabTitle", next);
    } catch (e) {}
    return next;
  }

  function applyTabTitle(title) {
    document.title = title || loadTabTitle();
    var nameEl = document.getElementById("site-name");
    if (nameEl) nameEl.value = document.title;
  }

  function bindSettings() {
    var saveBtn = document.getElementById("save-branding");
    if (saveBtn && !saveBtn.__bound) {
      saveBtn.__bound = true;
      saveBtn.addEventListener("click", function () {
        var nameEl = document.getElementById("site-name");
        var next = saveTabTitle(nameEl && nameEl.value);
        applyTabTitle(next);
        var status = document.getElementById("branding-status");
        if (status) {
          status.textContent = "Tab title saved.";
          status.style.color = "#57F287";
        }
      });
    }
    var resetBtn = document.getElementById("reset-branding");
    if (resetBtn && !resetBtn.__bound) {
      resetBtn.__bound = true;
      resetBtn.addEventListener("click", function () {
        try {
          localStorage.removeItem("siteTabTitle");
        } catch (e) {}
        applyTabTitle(DEFAULT_TAB_TITLE);
        var status = document.getElementById("branding-status");
        if (status) {
          status.textContent = "Tab title reset to default.";
          status.style.color = "#57F287";
        }
      });
    }
  }

  function boot() {
    applyTabTitle(loadTabTitle());
    bindSettings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-tab="settings"]');
    if (t) setTimeout(bindSettings, 0);
  });
})();
