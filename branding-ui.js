/** Settings: tab title only */
(function () {
  function ensureSettingsForm() {
    var section = document.getElementById("settings");
    if (!section) return;
    if (document.getElementById("save-branding")) return;
    section.innerHTML =
      '<div class="card form-card wide">' +
      '<span class="eyebrow">SETTINGS</span>' +
      '<h2>Browser tab title</h2>' +
      '<p class="form-hint">This only changes the name in the browser tab. Your dashboard stays Coffee Shop / your bot.</p>' +
      '<div class="input-group"><label for="site-name">Tab title</label>' +
      '<input id="site-name" type="text" maxlength="120" placeholder="Amazon.com. Spend Less. Smile More."></div>' +
      '<button class="button" id="save-branding" type="button">Save tab title</button> ' +
      '<button class="button secondary" id="reset-branding" type="button">Reset default</button>' +
      '<p class="form-hint" id="branding-status"></p>' +
      '<h3 class="subhead">Layout</h3>' +
      '<p class="form-hint">Use the View selector in the header for Auto / Desktop / Mobile.</p>' +
      "</div>";
  }
  function boot() {
    ensureSettingsForm();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-tab="settings"]');
    if (t) setTimeout(ensureSettingsForm, 0);
  });
})();
