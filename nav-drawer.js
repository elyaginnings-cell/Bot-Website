/**
 * Nav drawer v3 — grouped tabs; bot title replaces Home
 */
(function () {
  "use strict";
  if (window.__navDrawerV3) return;
  window.__navDrawerV3 = true;

  var BOT_NAME = "Coffee Shop";
  var BOT_SUB = "Bot Control";
  var BOT_ICON = "☕";

  /** tab id / label keywords → group */
  var GROUP_ORDER = [
    "dashboard",
    "moderation",
    "ai",
    "economy",
    "community",
    "staff",
    "tools",
    "settings",
    "other"
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

  /** explicit tab → group */
  var TAB_GROUP = {
    overview: "dashboard",
    home: "dashboard",
    moderation: "moderation",
    mod: "moderation",
    logs: "moderation",
    invites: "community",
    leveling: "economy",
    currency: "economy",
    beans: "economy",
    shop: "economy",
    fishing: "economy",
    fish: "economy",
    bump: "economy",
    birthday: "community",
    verification: "community",
    verify: "community",
    suggestions: "community",
    suggest: "community",
    qotd: "community",
    selfroles: "community",
    tickets: "tools",
    server: "tools",
    "server-view": "tools",
    serverview: "tools",
    applications: "staff",
    apply: "staff",
    loa: "staff",
    activitycheck: "staff",
    active: "staff",
    automod: "ai",
    aistaff: "ai",
    aichat: "ai",
    ai: "ai",
    settings: "settings",
    themes: "settings",
    theme: "settings"
  };

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

  function loadCss() {
    if (document.getElementById("nav-drawer-css")) return;
    var link = document.createElement("link");
    link.id = "nav-drawer-css";
    link.rel = "stylesheet";
    link.href = "/nav-drawer.css?v=3";
    document.head.appendChild(link);
  }

  function detectBotName() {
    try {
      var el = document.querySelector(".sidebar .brand strong, .brand strong, #bot-name");
      if (el && el.textContent.trim()) BOT_NAME = el.textContent.trim();
    } catch (_) {}
    try {
      var t = document.title || "";
      if (/coffee/i.test(t)) BOT_NAME = "Coffee Shop";
    } catch (_) {}
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
      '<button type="button" id="nav-drawer-header" class="nav-brand-btn" title="Go to overview">' +
      '<div class="brand-icon">' + BOT_ICON + "</div>" +
      "<div><strong id="nav-bot-title">" + BOT_NAME + "</strong><span>" + BOT_SUB + "</span></div>" +
      "</button>" +
      '<div id="nav-drawer-list"></div>' +
      '<div id="nav-drawer-footer">Grouped menu · Esc to close</div>';
    document.body.appendChild(drawer);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    backdrop.addEventListener("click", function () { close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });

    var brand = document.getElementById("nav-drawer-header");
    if (brand) {
      brand.addEventListener("click", function (e) {
        e.preventDefault();
        activateTab({ tab: "overview", label: "Overview", el: document.querySelector('.nav-item[data-tab="overview"]') });
        close();
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
        // Home / Overview removed from list — brand title replaces it
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

    // Feature-injected sections not always in .navigation
    document.querySelectorAll(".page-section[id]").forEach(function (sec) {
      var id = sec.id;
      if (!id || seen[id.toLowerCase()]) return;
      if (id === "overview" || id === "home") return;
      // skip if no real nav hook and unknown
      var known = TAB_GROUP[id.toLowerCase()];
      if (!known && !/^(automod|aistaff|aichat|loa|activitycheck|applications|fishing|bump|verification|suggestions|tickets|qotd|selfroles|themes)$/i.test(id)) return;
      seen[id.toLowerCase()] = true;
      var pretty = id.replace(/[-_]/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      items.push({
        tab: id,
        label: pretty,
        icon: GROUP_META[groupFor(id, pretty)] ? GROUP_META[groupFor(id, pretty)].icon : "•",
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

    GROUP_ORDER.forEach(function (gid) {
      var groupItems = byGroup[gid];
      if (!groupItems || !groupItems.length) return;
      var meta = GROUP_META[gid] || { label: gid, icon: "•" };

      var head = document.createElement("div");
      head.className = "nav-drawer-group";
      head.innerHTML =
        '<span class="ndg-icon">' + meta.icon + "</span>" +
        '<span class="ndg-label">' + meta.label + "</span>";
      list.appendChild(head);

      groupItems.forEach(function (item) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "nav-drawer-item" + (item.active ? " active" : "");
        if (item.tab) b.setAttribute("data-tab", item.tab);
        b.innerHTML =
          '<span class="ndi-icon">' + item.icon + '</span><span class="ndi-label">' + item.label + "</span>";
        b.addEventListener("click", function (e) {
          e.preventDefault();
          activateTab(item);
          close();
        });
        list.appendChild(b);
      });
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
    detectBotName();
    document.body.classList.add("drawer-nav-only");
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
    if (n < 50) setTimeout(retry, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", retry);
  } else {
    retry();
  }

  window.__openNavDrawer = open;
  window.__closeNavDrawer = close;
  console.log("[nav-drawer] v3 — grouped tabs, bot title replaces Home");
})();
