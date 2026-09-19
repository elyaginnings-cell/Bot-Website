/**
 * Dashboard themes v15 — + Sweetheart special theme
 */
(function () {
  "use strict";
  if (window.__themeBootV15) return;
  window.__themeBootV15 = true;

  var THEMES = [
    {
      id: "sweetheart",
      name: "Sweetheart",
      emoji: "🌻",
      blurb: "Made for her — sunflowers, hearts, stars, soft nature",
      group: "Special"
    },
    { id: "default", name: "Default", emoji: "💜", blurb: "Original neon violet", group: "Original" },
    { id: "mocha", name: "Mocha", emoji: "☕", blurb: "Warm coffee house", group: "Original" },
    { id: "neon", name: "Neon", emoji: "💖", blurb: "Pink / cyan glow", group: "Original" },
    { id: "midnight", name: "Midnight", emoji: "🌙", blurb: "Cool night blue", group: "Original" },
    { id: "sakura", name: "Sakura", emoji: "🌸", blurb: "Soft cherry blossom", group: "Original" },
    { id: "sunflower", name: "Sunflower", emoji: "🌼", blurb: "Golden garden", group: "Original" },
    { id: "bloodmoon", name: "Bloodmoon", emoji: "🩸", blurb: "Crimson horror UI", group: "Original" },
    { id: "terminal", name: "Terminal", emoji: "💻", blurb: "CRT scanlines + mono console", group: "Original" },
    { id: "ocean", name: "Ocean", emoji: "🌊", blurb: "Deep sea dashboard", group: "Nature" },
    { id: "forest", name: "Forest", emoji: "🌲", blurb: "Moss canopy UI", group: "Nature" },
    { id: "mint", name: "Mint", emoji: "🍃", blurb: "Fresh soft green", group: "Nature" },
    { id: "bamboo", name: "Bamboo", emoji: "🎋", blurb: "Lime grove", group: "Nature" },
    { id: "arctic", name: "Arctic", emoji: "🧊", blurb: "Light ice + snow sparkles", group: "Nature" },
    { id: "aurora", name: "Aurora", emoji: "🌌", blurb: "Northern glow blobs", group: "Nature" },
    { id: "cyberpunk", name: "Cyberpunk", emoji: "🤖", blurb: "Angled chrome + neon grid", group: "Neon" },
    { id: "synthwave", name: "Synthwave", emoji: "🕹️", blurb: "80s perspective grid", group: "Neon" },
    { id: "vaporwave", name: "Vaporwave", emoji: "🌴", blurb: "Double-border aesthetic", group: "Neon" },
    { id: "lava", name: "Lava", emoji: "🌋", blurb: "Molten bottom glow", group: "Neon" },
    { id: "candy", name: "Candy", emoji: "🍬", blurb: "Pastel pill product", group: "Neon" },
    { id: "nord", name: "Nord", emoji: "❄️", blurb: "Flat pro IDE slate", group: "Dev" },
    { id: "dracula", name: "Dracula", emoji: "🧛", blurb: "Editor purple", group: "Dev" },
    { id: "catppuccin", name: "Catppuccin", emoji: "🐱", blurb: "Soft mocha code", group: "Dev" },
    { id: "gruvbox", name: "Gruvbox", emoji: "🐻", blurb: "Warm retro code", group: "Dev" },
    { id: "tokyonight", name: "Tokyo Night", emoji: "🌃", blurb: "Soft city blues", group: "Dev" },
    { id: "solarized", name: "Solarized", emoji: "☀️", blurb: "Classic terminal tones", group: "Dev" },
    { id: "rosegold", name: "Rose Gold", emoji: "✨", blurb: "Luxury serif dark", group: "Soft" },
    { id: "amethyst", name: "Amethyst", emoji: "🔮", blurb: "Royal purple", group: "Soft" },
    { id: "coral", name: "Coral", emoji: "🪸", blurb: "Soft rose pills", group: "Soft" },
    { id: "honey", name: "Honey", emoji: "🍯", blurb: "Golden amber site", group: "Soft" },
    { id: "icecream", name: "Ice Cream", emoji: "🍦", blurb: "Super-rounded dessert UI", group: "Soft" },
    { id: "clay", name: "Clay", emoji: "🧱", blurb: "Chunky offset-shadow toy UI", group: "Soft" },
    { id: "emerald", name: "Emerald", emoji: "💎", blurb: "Luxury green", group: "Pro" },
    { id: "coffee", name: "Coffeehouse", emoji: "🫘", blurb: "Espresso & cream", group: "Pro" },
    { id: "paper", name: "Paper", emoji: "📄", blurb: "Editorial magazine / journal", group: "Pro" },
    { id: "slate", name: "Slate", emoji: "🪨", blurb: "Flat gray pro", group: "Pro" },
    { id: "obsidian", name: "Obsidian", emoji: "⬛", blurb: "Hard minimal black", group: "Pro" },
    { id: "steel", name: "Steel", emoji: "🛡️", blurb: "Flat metal", group: "Pro" },
    { id: "sunset", name: "Sunset", emoji: "🌇", blurb: "Dusk gradient site", group: "Pro" },
    { id: "mono", name: "Mono", emoji: "⬛", blurb: "Brutalist newspaper zero-radius", group: "Pro" }
  ];

  var ALL_IDS = THEMES.map(function (t) { return t.id; });

  function loadCss() {
    function ensure(id, href) {
      var el = document.getElementById(id);
      if (el) { el.href = href; return; }
      var link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
    ensure("themes-packs-css", "/themes-packs.css?v=7");
    ensure("themes-force-base-css", "/themes-force-base.css?v=9");
    ensure("themes-force-struct-css", "/themes-force-struct.css?v=10");
    ensure("themes-radical-css", "/themes-radical.css?v=2");
    ensure("themes-insane-css", "/themes-insane.css?v=1");
    ensure("theme-sweetheart-css", "/theme-sweetheart.css?v=1");
  }

  function applyTheme(name) {
    name = name || "default";
    if (ALL_IDS.indexOf(name) < 0) name = "default";
    var toRemove = [];
    document.body.classList.forEach(function (c) {
      if (c.indexOf("theme-") === 0) toRemove.push(c);
    });
    toRemove.forEach(function (c) { document.body.classList.remove(c); });
    if (name !== "default") document.body.classList.add("theme-" + name);
    document.body.setAttribute("data-theme", name);
    try { localStorage.setItem("dashboardTheme", name); } catch (_) {}
    var select = document.getElementById("dashboard-theme");
    if (select && select.value !== name) select.value = name;
    document.querySelectorAll(".theme-card").forEach(function (card) {
      card.classList.toggle("active", card.getAttribute("data-theme") === name);
    });
    var cur = document.getElementById("themes-current-label");
    if (cur) {
      var meta = THEMES.find(function (t) { return t.id === name; });
      cur.textContent = meta ? meta.emoji + " " + meta.name : name;
    }
  }

  function openThemesSection() {
    if (typeof window.showSection === "function") {
      try { window.showSection("themes"); } catch (_) {}
    }
    document.querySelectorAll(".page-section").forEach(function (el) {
      el.classList.remove("active");
    });
    var sec = document.getElementById("themes");
    if (sec) sec.classList.add("active");
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === "themes");
    });
    var title = document.getElementById("page-title");
    if (title) title.textContent = "Themes";
    var desc = document.getElementById("page-description");
    if (desc) desc.textContent = "Each theme is a different website — plus a special Sweetheart pack.";
    renderCards();
  }

  function ensureDropdown() {
    if (document.getElementById("dashboard-theme")) {
      var sel = document.getElementById("dashboard-theme");
      if (sel && sel.options.length < THEMES.length) {
        var v = sel.value;
        sel.innerHTML = THEMES.map(function (t) {
          return '<option value="' + t.id + '">' + t.emoji + " " + t.name + "</option>";
        }).join("");
        sel.value = v || localStorage.getItem("dashboardTheme") || "default";
      }
      return true;
    }
    var options = THEMES.map(function (t) {
      return '<option value="' + t.id + '">' + t.emoji + " " + t.name + "</option>";
    }).join("");
    var box = document.createElement("div");
    box.className = "view-mode-wrap";
    box.id = "theme-dropdown-wrap";
    box.innerHTML =
      '<label class="view-mode-label" for="dashboard-theme">Theme</label>' +
      '<select id="dashboard-theme" class="view-mode-select" title="Dashboard theme">' +
      options +
      "</select>";
    var actions = document.querySelector(".header-actions");
    var viewWrap = document.querySelector(".view-mode-wrap");
    if (actions) {
      if (viewWrap && viewWrap.parentElement === actions) {
        actions.insertBefore(box, viewWrap.nextSibling);
      } else {
        actions.insertBefore(box, actions.firstChild);
      }
    } else if (viewWrap && viewWrap.parentElement) {
      viewWrap.parentElement.insertBefore(box, viewWrap.nextSibling);
    } else {
      return false;
    }
    var select = document.getElementById("dashboard-theme");
    select.value = localStorage.getItem("dashboardTheme") || "default";
    select.addEventListener("change", function () { applyTheme(select.value); });
    return true;
  }

  function ensureNav() {
    var nav =
      document.querySelector(".navigation") ||
      document.querySelector("nav.navigation") ||
      document.querySelector(".sidebar nav") ||
      document.querySelector("aside.sidebar .navigation");
    if (!nav) return false;
    var existing = nav.querySelector('[data-tab="themes"]');
    if (existing) return true;
    var settingsBtn = nav.querySelector('[data-tab="settings"]');
    var btn = document.createElement("button");
    btn.className = "nav-item";
    btn.type = "button";
    btn.setAttribute("data-tab", "themes");
    btn.id = "nav-themes";
    btn.title = "Dashboard themes";
    btn.innerHTML = "<span>🎨</span><em>Themes</em>";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openThemesSection();
    });
    if (settingsBtn) nav.insertBefore(btn, settingsBtn);
    else nav.appendChild(btn);
    return true;
  }

  function ensureFloatingFallback() {
    if (document.getElementById("theme-fab")) return true;
    var fab = document.createElement("button");
    fab.id = "theme-fab";
    fab.type = "button";
    fab.title = "Themes";
    fab.setAttribute("aria-label", "Open themes");
    fab.innerHTML = "🎨";
    fab.style.cssText =
      "position:fixed;bottom:20px;right:20px;z-index:99999;width:48px;height:48px;" +
      "border-radius:50%;border:1px solid rgba(255,77,240,.4);background:linear-gradient(135deg,#ff4df0,#d63dff);" +
      "color:#fff;font-size:22px;cursor:pointer;box-shadow:0 6px 20px rgba(255,77,240,.35);" +
      "display:flex;align-items:center;justify-content:center;line-height:1;";
    fab.addEventListener("click", function (e) {
      e.preventDefault();
      openThemesSection();
    });
    document.body.appendChild(fab);
    return true;
  }

  function ensureSection() {
    var content =
      document.querySelector(".content") ||
      document.querySelector("main .content") ||
      document.querySelector("#app .content") ||
      document.querySelector("main.main > .content") ||
      document.querySelector("main.main");
    if (!content) return false;
    if (document.getElementById("themes")) return true;
    var section = document.createElement("section");
    section.id = "themes";
    section.className = "page-section";
    section.innerHTML =
      '<div class="card form-card wide">' +
      '<span class="eyebrow">APPEARANCE</span>' +
      "<h2>Dashboard themes</h2>" +
      '<p class="form-hint">Full website packs — plus <strong>Sweetheart</strong>, a special soft garden theme.</p>' +
      '<p class="form-hint">Current: <strong id="themes-current-label">—</strong></p>' +
      '<div id="themes-grid" class="themes-grid"></div>' +
      "</div>";
    content.appendChild(section);
    return true;
  }

  function renderCards() {
    var grid = document.getElementById("themes-grid");
    if (!grid) return;
    var current = localStorage.getItem("dashboardTheme") || "default";
    var groups = {};
    THEMES.forEach(function (t) {
      if (!groups[t.group]) groups[t.group] = [];
      groups[t.group].push(t);
    });
    var order = ["Special", "Original", "Nature", "Neon", "Dev", "Soft", "Pro"];
    var html = "";
    order.forEach(function (g) {
      if (!groups[g]) return;
      html += '<h3 class="subhead themes-group-title">' + g + '</h3><div class="themes-row">';
      groups[g].forEach(function (t) {
        html +=
          '<button type="button" class="theme-card' + (t.id === current ? " active" : "") +
          '" data-theme="' + t.id + '">' +
          '<span class="theme-card-swatch theme-swatch-' + t.id + '"></span>' +
          '<span class="theme-card-emoji">' + t.emoji + "</span>" +
          '<span class="theme-card-name">' + t.name + "</span>" +
          '<span class="theme-card-blurb">' + t.blurb + "</span></button>";
      });
      html += "</div>";
    });
    grid.innerHTML = html;
    grid.querySelectorAll(".theme-card").forEach(function (card) {
      card.addEventListener("click", function () {
        applyTheme(card.getAttribute("data-theme"));
      });
    });
  }

  function boot() {
    loadCss();
    ensureDropdown();
    ensureNav();
    ensureSection();
    ensureFloatingFallback();
    var saved = "default";
    try { saved = localStorage.getItem("dashboardTheme") || "default"; } catch (_) {}
    applyTheme(saved);
    renderCards();
  }

  var n = 0;
  function retry() {
    n++;
    boot();
    if (n < 80) setTimeout(retry, 250);
  }

  try {
    var obs = new MutationObserver(function () {
      ensureNav();
      ensureDropdown();
      ensureSection();
      ensureFloatingFallback();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", retry);
  else retry();

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;
    if (t.id === "login-button" || (t.closest && t.closest("#login-button"))) {
      setTimeout(boot, 500);
      setTimeout(boot, 1500);
      setTimeout(boot, 3000);
    }
  }, true);

  window.__applyDashboardTheme = applyTheme;
  window.__dashboardThemes = THEMES;
  window.__openThemes = openThemesSection;
  console.log("[theme-boot] v15 — " + THEMES.length + " themes incl. Sweetheart");
})();
