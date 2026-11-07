(function () {
  "use strict";
  if (window.__coffeeShopDesignSystem) return;
  window.__coffeeShopDesignSystem = true;

  var icons = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20.8 14A8.5 8.5 0 0 1 10 3.2 8.7 8.7 0 1 0 20.8 14Z"/></svg>'
  };
  function button(action, label, icon) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "ds-toolbar-button"; b.dataset.action = action;
    b.setAttribute("aria-label", label); b.title = label;
    b.innerHTML = icon + '<span>' + label + '</span>';
    return b;
  }
  function setup() {
    var sidebar = document.querySelector(".sidebar");
    var brand = document.querySelector(".sidebar-brand");
    var headerText = document.querySelector(".header-text");
    var app = document.getElementById("app");
    if (!sidebar || !brand || !headerText || !app) return false;

    var collapse = button("sidebar", "Collapse navigation", icons.panel);
    collapse.classList.add("ds-sidebar-toggle");
    brand.appendChild(collapse);

    var mobile = button("mobile-nav", "Open navigation", icons.menu);
    mobile.classList.add("ds-mobile-toggle");
    headerText.insertBefore(mobile, headerText.firstChild);

    var theme = button("theme", "Switch to light theme", icons.sun);
    theme.classList.add("ds-theme-toggle");
    var actions = document.querySelector(".header-actions");
    if (actions) actions.insertBefore(theme, actions.firstChild);

    var searchWrap = document.createElement("div");
    searchWrap.className = "ds-nav-search";
    searchWrap.innerHTML = '<input type="search" id="ds-nav-search" aria-label="Search dashboard sections" placeholder="Search sections…">';
    var nav = document.querySelector(".navigation");
    if (nav) nav.insertBefore(searchWrap, nav.firstChild);

    var backdrop = document.createElement("div");
    backdrop.id = "ds-mobile-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    document.body.appendChild(backdrop);

    var savedTheme = "dark";
    try { savedTheme = localStorage.getItem("coffee-dashboard-theme") || "dark"; } catch (_) {}
    applyTheme(savedTheme);

    collapse.addEventListener("click", function () {
      var isCollapsed = document.body.classList.toggle("ds-sidebar-collapsed");
      collapse.setAttribute("aria-label", isCollapsed ? "Expand navigation" : "Collapse navigation");
      collapse.title = isCollapsed ? "Expand navigation" : "Collapse navigation";
      try { localStorage.setItem("coffee-dashboard-sidebar-collapsed", isCollapsed ? "1" : "0"); } catch (_) {}
    });
    try {
      if (localStorage.getItem("coffee-dashboard-sidebar-collapsed") === "1" && matchMedia("(min-width: 961px)").matches) {
        document.body.classList.add("ds-sidebar-collapsed");
      }
    } catch (_) {}
    mobile.addEventListener("click", function () { document.body.classList.add("ds-mobile-nav-open"); });
    backdrop.addEventListener("click", closeMobileNav);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMobileNav(); });
    theme.addEventListener("click", function () {
      var next = document.documentElement.dataset.dashboardTheme === "light" ? "dark" : "light";
      applyTheme(next);
      try { localStorage.setItem("coffee-dashboard-theme", next); } catch (_) {}
    });
    function applyTheme(value) {
      var light = value === "light";
      document.documentElement.dataset.dashboardTheme = light ? "light" : "dark";
      theme.innerHTML = (light ? icons.moon : icons.sun) + '<span>' + (light ? "Dark theme" : "Light theme") + '</span>';
      theme.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
      theme.title = light ? "Switch to dark theme" : "Switch to light theme";
    }
    function closeMobileNav() { document.body.classList.remove("ds-mobile-nav-open"); }
    var search = searchWrap.querySelector("input");
    if (search && nav) search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase(), shown = 0;
      nav.querySelectorAll(".nav-item").forEach(function (item) {
        var text = (item.textContent || "") + " " + (item.getAttribute("title") || "") + " " + (item.dataset.tab || "");
        var match = !q || text.toLowerCase().indexOf(q) !== -1;
        item.hidden = !match;
        if (match) shown++;
      });
      var empty = nav.querySelector(".ds-nav-empty");
      if (!empty) { empty = document.createElement("div"); empty.className = "ds-nav-empty"; empty.textContent = "No matching sections"; nav.appendChild(empty); }
      empty.hidden = !q || shown > 0;
    });
    if (nav) nav.addEventListener("click", function (e) {
      if (e.target.closest(".nav-item")) closeMobileNav();
    });
    window.addEventListener("resize", function () {
      if (matchMedia("(min-width: 961px)").matches) closeMobileNav();
    });
    return true;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();