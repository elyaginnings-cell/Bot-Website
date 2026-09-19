/**
 * Nav drawer v8 — never lose hamburger; always kill original nav
 */
(function () {
  "use strict";
  // Allow re-init if older version was loaded
  if (window.__navDrawerV8) return;
  window.__navDrawerV8 = true;
  window.__navDrawerV7 = true;
  window.__navDrawerV6 = true;
  window.__navDrawerV5 = true;

  var BOT_NAME = "Coffee Shop";
  var BOT_SUB = "Bot Control";
  var BOT_ICON = "☕";
  var COLLAPSE_KEY = "navDrawerCollapsedGroups";

  var GROUP_ORDER = [
    "dashboard", "moderation", "ai", "economy", "community", "staff", "tools", "settings", "other"
  ];

  var GROUP_META = {
    dashboard: { label: "Dashboard", icon: "🏠" },
    moderation: { label: "Moderation", icon: "⚖️" },
    ai: { label: "AI", icon: "🤖" },
    economy: { label: "Economy", icon: "💰" },
    community: { label: "Community", icon: "🌿" },
    staff: { label: "Staff", icon: "📋" },
    tools: { label: "Tools", icon: "🧰" },
    settings: { label: "Settings", icon: "⚙️" },
    other: { label: "More", icon: "✨" }
  };

  var TAB_GROUP = {
    overview: "dashboard", home: "dashboard",
    moderation: "moderation", mod: "moderation", logs: "moderation",
    invites: "community",
    leveling: "economy", currency: "economy", beans: "economy", shop: "economy",
    fishing: "economy", fish: "economy", bump: "economy",
    birthday: "community", verification: "community", verify: "community",
    suggestions: "community", suggest: "community", qotd: "community", selfroles: "community",
    tickets: "tools", server: "tools", "server-view": "tools", serverview: "tools",
    applications: "staff", apply: "staff", loa: "staff", activitycheck: "staff", active: "staff",
    automod: "ai", aistaff: "ai", aichat: "ai", ai: "ai",
    settings: "settings", themes: "settings", theme: "settings"
  };

  function loadCollapsed() {
    try {
      var raw = localStorage.getItem(COLLAPSE_KEY);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return o && typeof o === "object" ? o : {};
    } catch (_) {
      return {};
    }
  }

  function saveCollapsed(map) {
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(map));
    } catch (_) {}
  }

  function groupFor(tab, label) {
    var t = String(tab || "").toLowerCase().replace(/\s+/g, "");
    var l = String(label || "").toLowerCase();
    if (TAB_GROUP[t]) return TAB_GROUP[t];
    if (/fish|shop|bean|currency|level|bump|economy|bank/.test(t + " " + l)) return "economy";
    if (/ai\s*chat|ai\s*staff|automod|sudo|operator/.test(t + " " + l) || t === "ai") return "ai";
    if (/mod|warn|ban|mute|punish|log/.test(t + " " + l)) return "moderation";
    if (/loa|apply|application|activity|staff/.test(t + " " + l)) return "staff";
    if (/ticket|server\s*view/.test(t + " " + l)) return "tools";
    if (/verify|invite|birthday|suggest|qotd|self\s*role|welcome/.test(t + " " + l)) return "community";
    if (/setting|theme/.test(t + " " + l)) return "settings";
    if (/home|overview|dashboard/.test(t + " " + l)) return "dashboard";
    return "other";
  }

  function injectCriticalCss() {
    var style = document.getElementById("nav-drawer-critical");
    if (!style) {
      style = document.createElement("style");
      style.id = "nav-drawer-critical";
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = [
      "body.drawer-nav-only .sidebar,body.drawer-nav-only aside.sidebar,",
      "body.drawer-nav-only .navigation,body.drawer-nav-only.mode-mobile .navigation,",
      "body.drawer-nav-only.mode-auto .navigation,body.drawer-nav-only.mode-desktop .navigation,",
      "body.drawer-nav-only nav.navigation,body.drawer-nav-only .nav-tabs,body.drawer-nav-only .tab-bar{",
      "display:none!important;visibility:hidden!important;pointer-events:none!important;",
      "height:0!important;max-height:0!important;overflow:hidden!important;opacity:0!important;",
      "position:absolute!important;left:-9999px!important;width:0!important;}",
      "#nav-hamburger{",
      "position:fixed!important;top:max(12px,env(safe-area-inset-top))!important;",
      "left:max(12px,env(safe-area-inset-left))!important;z-index:2147483000!important;",
      "width:48px!important;height:48px!important;border-radius:14px!important;",
      "display:flex!important;flex-direction:column!important;align-items:center!important;",
      "justify-content:center!important;gap:5px!important;padding:0!important;",
      "opacity:1!important;visibility:visible!important;pointer-events:auto!important;",
      "-webkit-tap-highlight-color:transparent!important;}",
      "#nav-hamburger span{display:block!important;width:18px!important;height:2.5px!important;border-radius:2px!important;}",
      "body.nav-drawer-open #nav-hamburger span:nth-child(1){transform:translateY(7.5px) rotate(45deg);}",
      "body.nav-drawer-open #nav-hamburger span:nth-child(2){opacity:0;}",
      "body.nav-drawer-open #nav-hamburger span:nth-child(3){transform:translateY(-7.5px) rotate(-45deg);}",
      "#nav-drawer-backdrop{position:fixed!important;inset:0!important;z-index:2147482000!important;background:rgba(0,0,0,.55)!important;opacity:0;visibility:hidden;pointer-events:none;}",
      "body.nav-drawer-open #nav-drawer-backdrop{opacity:1;visibility:visible;pointer-events:auto;}",
      "#nav-drawer{position:fixed!important;top:0!important;left:0!important;bottom:0!important;z-index:2147482500!important;",
      "width:min(310px,88vw)!important;transform:translateX(-105%);transition:transform .28s;",
      "display:flex!important;flex-direction:column!important;overflow:hidden!important;",
      "padding:max(18px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));}",
      "body.nav-drawer-open #nav-drawer{transform:translateX(0);}",
      "body.drawer-nav-only .header{padding-left:58px!important;}",
      ".nav-drawer-group-items.is-collapsed{display:none!important;}"
    ].join("\n");
  }

  function loadCss() {
    injectCriticalCss();
    var link = document.getElementById("nav-drawer-css");
    if (!link) {
      link = document.createElement("link");
      link.id = "nav-drawer-css";
      link.rel = "stylesheet";
      (document.head || document.documentElement).appendChild(link);
    }
    link.href = "/nav-drawer.css?v=8";
  }

  function killOriginalNav() {
    if (!document.body) return;
    document.body.classList.add("drawer-nav-only");
    [
      ".sidebar", "aside.sidebar", ".navigation", "nav.navigation",
      ".nav-tabs", ".tab-bar", ".tabs-row", ".sidebar-brand"
    ].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        // Don't hide our drawer if someone mis-classed it
        if (el.id === "nav-drawer" || el.closest && el.closest("#nav-drawer")) return;
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.style.setProperty("pointer-events", "none", "important");
        el.style.setProperty("height", "0", "important");
        el.style.setProperty("max-height", "0", "important");
        el.style.setProperty("overflow", "hidden", "important");
        el.style.setProperty("opacity", "0", "important");
        el.setAttribute("aria-hidden", "true");
      });
    });
  }

  function detectBotName() {
    try {
      var el = document.querySelector(".sidebar .brand strong, .sidebar-brand strong, .brand strong, #bot-name");
      if (el && el.textContent.trim()) BOT_NAME = el.textContent.trim();
    } catch (_) {}
  }

  function ensureUI() {
    if (!document.body) return false;

    var btn = document.getElementById("nav-hamburger");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "nav-hamburger";
      btn.type = "button";
      btn.title = "Open navigation";
      btn.setAttribute("aria-label", "Open navigation menu");
      btn.setAttribute("aria-expanded", "false");
      btn.innerHTML = "<span></span><span></span><span></span>";
      document.body.appendChild(btn);
      function onHam(e) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
      btn.addEventListener("click", onHam, { passive: false });
      btn.addEventListener("touchend", onHam, { passive: false });
    }
    // Force visible every pass
    btn.style.setProperty("display", "flex", "important");
    btn.style.setProperty("visibility", "visible", "important");
    btn.style.setProperty("opacity", "1", "important");
    btn.style.setProperty("pointer-events", "auto", "important");
    btn.style.setProperty("z-index", "2147483000", "important");

    if (!document.getElementById("nav-drawer-backdrop")) {
      var backdrop = document.createElement("div");
      backdrop.id = "nav-drawer-backdrop";
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", function () { close(); });
    }

    if (!document.getElementById("nav-drawer")) {
      var drawer = document.createElement("aside");
      drawer.id = "nav-drawer";
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-label", "Navigation");
      drawer.innerHTML =
        '<button type="button" id="nav-drawer-header" class="nav-brand-btn" title="Go to overview">' +
        '<div class="brand-icon">' + BOT_ICON + "</div>" +
        '<div><strong id="nav-bot-title">' + BOT_NAME + "</strong><span>" + BOT_SUB + "</span></div>" +
        "</button>" +
        '<div id="nav-drawer-list"></div>' +
        '<div id="nav-drawer-footer">Tap a category name to collapse</div>';
      document.body.appendChild(drawer);

      var brand = document.getElementById("nav-drawer-header");
      if (brand) {
        brand.addEventListener("click", function (e) {
          e.preventDefault();
          activateTab({
            tab: "overview",
            label: "Overview",
            el: document.querySelector('.nav-item[data-tab="overview"]')
          });
          close();
        });
      }
    }

    if (!window.__navDrawerEsc) {
      window.__navDrawerEsc = true;
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") close();
      });
    }

    return true;
  }

  function collectTabs() {
    var items = [];
    var seen = {};
    var nav = document.querySelector(".navigation");
    if (nav) {
      nav.querySelectorAll(".nav-item").forEach(function (el) {
        var tab = el.getAttribute("data-tab") || el.id || "";
        if (tab === "nav-server-view") tab = "server-view";
        var label =
          (el.querySelector("em") && el.querySelector("em").textContent) ||
          el.getAttribute("title") ||
          el.textContent ||
          tab;
        var icon =
          (el.querySelector("span") && el.querySelector("span").textContent) || "•";
        label = String(label).trim();
        icon = String(icon).trim();
        if (!tab && !label) return;
        var key = (tab || label).toLowerCase();
        if (key === "overview" || key === "home" || label.toLowerCase() === "home") return;
        if (seen[key]) return;
        seen[key] = true;
        items.push({
          tab: tab,
          label: label || tab,
          icon: icon,
          el: el,
          active: el.classList.contains("active"),
          group: groupFor(tab, label)
        });
      });
    }

    document.querySelectorAll(".page-section[id]").forEach(function (sec) {
      var id = sec.id;
      if (!id || seen[id.toLowerCase()]) return;
      if (id === "overview" || id === "home") return;
      var known = TAB_GROUP[id.toLowerCase()];
      if (!known && !/^(automod|aistaff|aichat|loa|activitycheck|applications|fishing|bump|verification|suggestions|tickets|qotd|selfroles|themes)$/i.test(id)) return;
      seen[id.toLowerCase()] = true;
      var pretty = id.replace(/[-_]/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      items.push({
        tab: id,
        label: pretty,
        icon: (GROUP_META[groupFor(id, pretty)] || {}).icon || "•",
        el: null,
        active: sec.classList.contains("active"),
        group: groupFor(id, pretty)
      });
    });

    if (!seen["themes"]) {
      items.push({ tab: "themes", label: "Themes", icon: "🎨", el: null, active: false, group: "settings" });
    }
    return items;
  }

  function renderList() {
    var list = document.getElementById("nav-drawer-list");
    if (!list) return;
    var items = collectTabs();
    list.innerHTML = "";
    var byGroup = {};
    items.forEach(function (item) {
      var g = item.group || "other";
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(item);
    });

    var collapsedMap = loadCollapsed();

    GROUP_ORDER.forEach(function (gid) {
      var groupItems = byGroup[gid];
      if (!groupItems || !groupItems.length) return;
      var meta = GROUP_META[gid] || { label: gid, icon: "•" };
      var isCollapsed = !!collapsedMap[gid];
      if (groupItems.some(function (it) { return it.active; })) isCollapsed = false;

      var head = document.createElement("button");
      head.type = "button";
      head.className = "nav-drawer-group" + (isCollapsed ? " is-collapsed" : "");
      head.setAttribute("data-group", gid);
      head.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
      head.innerHTML =
        '<span class="ndg-icon">' + meta.icon + "</span>" +
        '<span class="ndg-label">' + meta.label + "</span>" +
        '<span class="ndg-chevron" aria-hidden="true">▼</span>';

      var wrap = document.createElement("div");
      wrap.className = "nav-drawer-group-items" + (isCollapsed ? " is-collapsed" : "");
      wrap.setAttribute("data-group-items", gid);

      groupItems.forEach(function (item) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "nav-drawer-item" + (item.active ? " active" : "");
        if (item.tab) b.setAttribute("data-tab", item.tab);
        b.innerHTML =
          '<span class="ndi-icon">' + item.icon + '</span><span class="ndi-label">' + item.label + "</span>";
        b.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          activateTab(item);
          close();
        });
        wrap.appendChild(b);
      });

      head.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var nowCollapsed = !wrap.classList.contains("is-collapsed");
        if (nowCollapsed) {
          wrap.classList.add("is-collapsed");
          head.classList.add("is-collapsed");
          head.setAttribute("aria-expanded", "false");
        } else {
          wrap.classList.remove("is-collapsed");
          head.classList.remove("is-collapsed");
          head.setAttribute("aria-expanded", "true");
        }
        var map = loadCollapsed();
        if (nowCollapsed) map[gid] = true;
        else delete map[gid];
        saveCollapsed(map);
      });

      list.appendChild(head);
      list.appendChild(wrap);
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
    if (tab === "server-view" || tab === "serverview") {
      var sv = document.getElementById("open-server-view") || document.getElementById("nav-server-view");
      if (sv) { sv.click(); return; }
    }
    if (typeof window.showSection === "function") {
      try { window.showSection(tab); return; } catch (_) {}
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
    detectBotName();
    var titleEl = document.getElementById("nav-bot-title");
    if (titleEl) titleEl.textContent = BOT_NAME;
    killOriginalNav();
    ensureUI();
    renderList();
    // Paisley footer if sweetheart theme
    try {
      if ((localStorage.getItem("dashboardTheme") || "") === "sweetheart") {
        var foot = document.getElementById("nav-drawer-footer");
        if (foot) foot.textContent = "Paisley ❤️  ·  🌻 ⭐ 🐱 ❄️ 🍓";
      }
    } catch (_) {}
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
    if (!document.body) return;
    loadCss();
    detectBotName();
    killOriginalNav();
    ensureUI();
    try {
      if (!window.__navKillObsV8) {
        window.__navKillObsV8 = true;
        var obs = new MutationObserver(function () {
          killOriginalNav();
          ensureUI();
        });
        obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
      }
    } catch (_) {}
  }

  var n = 0;
  function retry() {
    n++;
    boot();
    if (n < 100) setTimeout(retry, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", retry);
  } else {
    retry();
  }
  setTimeout(boot, 300);
  setTimeout(boot, 1000);
  setTimeout(boot, 2500);
  setTimeout(boot, 5000);

  window.__openNavDrawer = open;
  window.__closeNavDrawer = close;
  console.log("[nav-drawer] v8 — hamburger forced, original nav killed");
})();
