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

  function decorateSection(section) {
    if (!section || section.dataset.workspaceDecorated === "true") return;
    var cards = Array.prototype.filter.call(section.children || [], function (child) {
      return child.classList && child.classList.contains("form-card");
    });
    if (!cards.length) return;

    cards.forEach(function (card) { card.classList.add("settings-panel"); });

    if (!section.querySelector(".page-heading")) {
      var sourceTitle = cards[0].querySelector("h2");
      var sourceDescription = cards[0].querySelector(".form-hint");
      var heading = document.createElement("div");
      var title = document.createElement("h2");
      var description = document.createElement("p");
      heading.className = "page-heading";
      title.textContent = sourceTitle ? sourceTitle.textContent.trim() : "Server system";
      description.textContent = sourceDescription ? sourceDescription.textContent.trim() : "Configure this system for your server.";
      heading.appendChild(title);
      heading.appendChild(description);
      section.insertBefore(heading, section.firstChild);
    }

    if (!section.querySelector(".settings-layout")) {
      var layout = document.createElement("div");
      layout.className = "settings-layout";
      section.insertBefore(layout, cards[0]);
      cards.forEach(function (card) { layout.appendChild(card); });
    }
    section.dataset.workspaceDecorated = "true";
  }

  function decorateAllSections() {
    document.querySelectorAll(".content .page-section").forEach(decorateSection);
    var content = document.querySelector("#app .content");
    if (content && window.MutationObserver) {
      var observer = new window.MutationObserver(function (records) {
        records.forEach(function (record) {
          record.addedNodes.forEach(function (node) {
            if (!node || node.nodeType !== 1) return;
            if (node.matches && node.matches(".page-section")) decorateSection(node);
            if (node.querySelectorAll) node.querySelectorAll(".page-section").forEach(decorateSection);
          });
        });
      });
      observer.observe(content, { childList: true, subtree: true });
    }
  }

  function init() {
    if (initialized) return;
    toggle = document.getElementById("dashboard-menu-toggle");
    backdrop = document.getElementById("dashboard-nav-backdrop");
    sidebar = document.querySelector("#app .sidebar");
    if (!toggle || !backdrop || !sidebar) return;
    initialized = true;
    decorateAllSections();
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
