/**
 * Tickets bridge — runs when Tickets tab opens (nav drawer / showSection)
 * Ensures features-tickets panel replaces the legacy ticket form.
 */
(function () {
  "use strict";
  if (window.__ticketsBridgeV1) return;
  window.__ticketsBridgeV1 = true;

  function upgrade() {
    try {
      if (typeof window.__featuresTicketsV6Boot === "function") {
        window.__featuresTicketsV6Boot(true);
        return;
      }
      if (typeof window.__featuresTicketsV3Boot === "function") {
        window.__featuresTicketsV3Boot(true);
        return;
      }
    } catch (_) {}
    try {
      document.dispatchEvent(new Event("tickets:upgrade"));
    } catch (_) {}
  }

  function wrapShowSection() {
    if (typeof window.showSection !== "function") return false;
    if (window.showSection.__ticketsBridge) return true;
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      if (String(tab) === "tickets") setTimeout(upgrade, 30);
      return r;
    };
    window.showSection.__ticketsBridge = true;
    return true;
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-tab="tickets"]');
      if (t) setTimeout(upgrade, 50);
    },
    true
  );

  var n = 0;
  function boot() {
    n++;
    wrapShowSection();
    if (n < 60) setTimeout(boot, 250);
  }
  boot();
  console.log("[tickets-bridge] watching Tickets tab");
})();
