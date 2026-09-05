/** Inject Settings branding form if missing */
(function () {
  function ensureSettingsForm() {
    var section = document.getElementById("settings");
    if (!section) return;
    if (document.getElementById("save-branding")) return;
    section.innerHTML =
      '<div class="card form-card wide">' +
      '<span class="eyebrow">SETTINGS</span>' +
      '<h2>Website branding</h2>' +
      '<p class="form-hint">Change the tab name, sidebar name, and tab icon. Defaults match Amazon.</p>' +
      '<div class="input-group"><label for="site-name">Browser tab title</label>' +
      '<input id="site-name" type="text" maxlength="120" placeholder="Amazon.com. Spend Less. Smile More."></div>' +
      '<div class="input-group"><label for="site-short-name">Short name (sidebar &amp; login)</label>' +
      '<input id="site-short-name" type="text" maxlength="40" placeholder="Amazon"></div>' +
      '<div class="input-group"><label for="site-tagline">Tagline</label>' +
      '<input id="site-tagline" type="text" maxlength="80" placeholder="Spend Less. Smile More."></div>' +
      '<div class="input-group"><label for="site-icon-url">Tab icon URL (optional)</label>' +
      '<input id="site-icon-url" type="url" placeholder="Leave blank to keep current / default Amazon icon"></div>' +
      '<div class="input-group"><label for="site-icon-file">Or upload icon</label>' +
      '<input id="site-icon-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"></div>' +
      '<div class="input-group" style="display:flex;align-items:center;gap:12px">' +
      '<img id="site-icon-preview" alt="Icon preview" width="48" height="48" style="border-radius:8px;background:#fff;object-fit:contain">' +
      '<span class="form-hint" style="margin:0">Preview</span></div>' +
      '<button class="button" id="save-branding" type="button">Save branding</button> ' +
      '<button class="button secondary" id="reset-branding" type="button">Reset to Amazon</button>' +
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
