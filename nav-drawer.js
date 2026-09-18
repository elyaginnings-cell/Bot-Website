/**
 * Nav drawer — 3-line hamburger pulls all tabs from the side
 * Mobile + desktop
 */
(function () {
  "use strict";
  if (window.__navDrawerV1) return;
  window.__navDrawerV1 = true;

  function loadCss() {
    if (document.getElementById("nav-drawer-css")) return;
    var link = document.createElement("link");
    link.id = "nav-drawer-css";
    link.rel = "stylesheet";
    link.href = "/nav-drawer.css?v=1";
    document.head.appendChild(link);
  }

  function ensureUI() {
    if (document.getElementById("nav-hamburger")) return true;

    var btn = document.createElement("button");
    btn.id = "nav-hamburger";
    btn.type = "button";
    btn.title = "Open navigation";
    btn.setAttribute("aria-label", "Open navigation menu");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = "<span></span><span></span><span></span>";
    document.body.appendChild(btn);

    var backdrop = document.createElement("div");
    backdrop.id = "nav-drawer-backdrop";
    document.body.appendChild(backdrop);

    var drawer = document.createElement("aside");
    drawer.id = "nav-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-label", "Navigation");
    drawer.innerHTML =
      '<div id="nav-drawer-header">' +
      '<div class="brand-icon">☕</div>' +
      "<div><strong>Coffee Shop</strong><span>Bot Control</span></div>" +
      "</div>" +
      '<div id="nav-drawer-list"></div>' +
      '<div id="nav-drawer-footer">Tap a tab to jump · Esc to close</div>';
    document.body.appendChild(drawer);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    backdrop.addEventListener("click", function () {
      close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    return true;
  }

  function collectTabs() {
    var items = [];
    var seen = {};

    var nav = document.querySelector(".navigation");
    if (nav) {
      nav.querySelectorAll(".nav-item").forEach(function (el) {
        var tab = el.getAttribute("data-tab") || el.id || "";
        var label =
          (el.querySelector("em") && el.querySelector("em").textContent) ||
          el.textContent ||
          tab;
        var icon =
          (el.querySelector("span") && el.querySelector("span").textContent) || "•";
        label = String(label).trim();
        icon = String(icon).trim();
        if (!tab && !label) return;
        var key = tab || label;
        if (seen[key]) return;
        seen[key] = true;
        items.push({
          tab: tab,
          label: label || tab,
          icon: icon,
          el: el,
          active: el.classList.contains("active"),
        });
      });
    }

    if (!seen["themes"] && !seen["Themes"]) {
      items.push({
        tab: "themes",
        label: "Themes",
        icon: "🎨",
        el: null,
        active: false,
      });
    }

    return items;
  }

  function renderList() {
    var list = document.getElementById("nav-drawer-list");
    if (!list) return;
    var items = collectTabs();
    list.innerHTML = "";

    items.forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "nav-drawer-item" + (item.active ? " active" : "");
      if (item.tab) b.setAttribute("data-tab", item.tab);
      b.innerHTML =
        '<span class="ndi-icon">' +
        item.icon +
        '</span><span class="ndi-label">' +
        item.label +
        "</span>";
      b.addEventListener("click", function (e) {
        e.preventDefault();
        activateTab(item);
        close();
      });
      list.appendChild(b);
    });
  }

  function activateTab(item) {
    if (item.el && document.body.contains(item.el)) {
      item.el.click();
      return;
    }

    var tab = item.tab;
    if (!tab) return;

    if (tab === "themes" && typeof window.__openThemes === "function") {
      window.__openThemes();
      return;
    }

    if (typeof window.showSection === "function") {
      try {
        window.showSection(tab);
        return;
      } catch (_) {}
    }

    document.querySelectorAll(".page-section").forEach(function (el) {
      el.classList.remove("active");
    });
    var sec = document.getElementById(tab);
    if (sec) sec.classList.add("active");
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    var title = document.getElementById("page-title");
    if (title) title.textContent = item.label || tab;
  }

  function open() {
    renderList();
    document.body.classList.add("nav-drawer-open");
    var btn = document.getElementById("nav-hamburger");
    if (btn) {
      btn.setAttribute("aria-expanded", "true");
      btn.title = "Close navigation";
    }
  }

  function close() {
    document.body.classList.remove("nav-drawer-open");
    var btn = document.getElementById("nav-hamburger");
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      btn.title = "Open navigation";
    }
  }

  function toggle() {
    if (document.body.classList.contains("nav-drawer-open")) close();
    else open();
  }

  function boot() {
    loadCss();
    ensureUI();
    try {
      var nav = document.querySelector(".navigation");
      if (nav && !nav.__drawerObserved) {
        nav.__drawerObserved = true;
        var obs = new MutationObserver(function () {
          if (document.body.classList.contains("nav-drawer-open")) renderList();
        });
        obs.observe(nav, { childList: true, subtree: true });
      }
    } catch (_) {}
  }

  var n = 0;
  function retry() {
    n++;
    boot();
    if (n < 40) setTimeout(retry, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", retry);
  } else {
    retry();
  }

  window.__openNavDrawer = open;
  window.__closeNavDrawer = close;
  console.log("[nav-drawer] v1 — hamburger side drawer ready");
})();
