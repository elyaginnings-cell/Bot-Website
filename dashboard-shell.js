/* Accessible mobile navigation for the Coffee Shop dashboard. */
(function () {
  "use strict";
  if (window.DashboardShell) return;

  var initialized = false;
  var toggle;
  var backdrop;
  var sidebar;

  function setOpen(open, restoreFocus) {
    if (!sidebar || !toggle) return;
    document.body.classList.toggle("dashboard-nav-open", !!open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    toggle.title = open ? "Close navigation" : "Open navigation";
    if (!open && restoreFocus && typeof toggle.focus === "function") toggle.focus();
  }

  function openNavigation() { setOpen(true, false); }
  function closeNavigation(restoreFocus) { setOpen(false, !!restoreFocus); }

  function onKeydown(event) {
    if (event.key === "Escape" && document.body.classList.contains("dashboard-nav-open")) {
      closeNavigation(true);
    }
  }

  function init() {
    if (initialized) return;
    toggle = document.getElementById("dashboard-menu-toggle");
    backdrop = document.getElementById("dashboard-nav-backdrop");
    sidebar = document.querySelector("#app .sidebar");
    if (!toggle || !backdrop || !sidebar) return;
    initialized = true;
    toggle.addEventListener("click", function () {
      var open = document.body.classList.contains("dashboard-nav-open");
      setOpen(!open, false);
    });
    backdrop.addEventListener("click", function () { closeNavigation(true); });
    sidebar.addEventListener("click", function (event) {
      if (event.target.closest(".nav-item")) closeNavigation(false);
    });
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", function () {
      if (window.matchMedia && window.matchMedia("(min-width: 769px)").matches) {
        closeNavigation(false);
      }
    });
    setOpen(false, false);
  }

  window.DashboardShell = {
    init: init,
    openNavigation: openNavigation,
    closeNavigation: closeNavigation
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
