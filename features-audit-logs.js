/**
 * Deprecated — central logging (features-logging.js) owns the Logs tab.
 * Kept as a no-op so old cache loads don't break.
 */
(function () {
  "use strict";
  if (window.__featuresAuditLogsV4) return;
  window.__featuresAuditLogsV4 = true;
  window.__featuresAuditLogsV3 = true;
  // Remove any leftover panel if present
  try {
    var el = document.getElementById("audit-log-panel");
    if (el) el.remove();
  } catch (_) {}
  console.log("[features-audit-logs] disabled — use central logging");
})();
