(function () {
  "use strict";
  if (window.__ticketsGuardV1) return;
  window.__ticketsGuardV1 = true;
  function ownSaveButton() {
    var btn = document.getElementById("save-tickets");
    if (!btn) return;
    if (!document.querySelector('[data-tickets-panel="v6"]')) return;
    if (btn.__tv6owned) {
      btn.__p26 = 1;
      return;
    }
    var fresh = btn.cloneNode(true);
    fresh.__tv6owned = true;
    fresh.__p26 = 1;
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener(
      "click",
      function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (typeof window.__ticketSaveNow === "function") window.__ticketSaveNow(e);
      },
      true
    );
  }
  setInterval(ownSaveButton, 400);
  [200, 800, 2000].forEach(function (ms) { setTimeout(ownSaveButton, ms); });
})();
