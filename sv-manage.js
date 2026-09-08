/**
 * sv-manage v4 — management moved to server settings menu (sv-discord-pack).
 * Keep @mention helpers minimal; pack owns the full autocomplete.
 */
(function () {
  "use strict";
  if (window.__svManageV4) return;
  window.__svManageV4 = true;

  // Strip legacy channel-list manage UI if an older tab still has it cached
  function cleanup() {
    var bar = document.getElementById("sv-manage-bar");
    if (bar) bar.remove();
  }

  setInterval(cleanup, 3000);
  console.log("[sv-manage] v4 — deferred to sv-discord-pack settings menu");
})();
