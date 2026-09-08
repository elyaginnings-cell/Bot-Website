/**
 * Server View - Members tab (compat wrapper → sv-members-load)
 */
(function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Keep escape helper available if older code expects it on this file's path
  window.__svEscMember = esc;

  // Prefer the newer loader if present; otherwise minimal fallback is already in sv-members-load.js
  console.log("[server-view-members] ready (escape fixed)");
})();
