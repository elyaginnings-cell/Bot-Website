/**
 * Dashboard themes v8 — packs + structural force overrides
 */
(function () {
  "use strict";
  if (window.__themeBootV8) return;
  window.__themeBootV8 = true;

  var THEMES = [
    { id: "default", name: "Default", emoji: "💜", blurb: "Original neon violet", group: "Original" },
    { id: "mocha", name: "Mocha", emoji: "☕", blurb: "Warm coffee shop", group: "Original" },
    { id: "neon", name: "Neon", emoji: "💖", blurb: "Pink / cyan glow", group: "Original" },
    { id: "midnight", name: "Midnight", emoji: "🌙", blurb: "Cool night blue", group: "Original" },
    { id: "sakura", name: "Sakura", emoji: "🌸", blurb: "Soft cherry blossom", group: "Original" },
    { id: "sunflower", name: "Sunflower", emoji: "🌻", blurb: "Golden yellow", group: "Original" },
    { id: "bloodmoon", name: "Bloodmoon", emoji: "🩸", blurb: "Deep crimson", group: "Original" },
    { id: "terminal", name: "Terminal", emoji: "💻", blurb: "CRT scanlines + mono", group: "Original" },
    { id: "ocean", name: "Ocean", emoji: "🌊", blurb: "Deep sea waves", group: "Nature" },
    { id: "forest", name: "Forest", emoji: "🌲", blurb: "Moss & canopy", group: "Nature" },
    { id: "mint", name: "Mint", emoji: "🍃", blurb: "Fresh soft green", group: "Nature" },
    { id: "bamboo", name: "Bamboo", emoji: "🎋", blurb: "Lime grove", group: "Nature" },
    { id: "arctic", name: "Arctic", emoji: "🧊", blurb: "Ice & frost", group: "Nature" },
    { id: "aurora", name: "Aurora", emoji: "🌌", blurb: "Glow blobs", group: "Nature" },
    { id: "cyberpunk", name: "Cyberpunk", emoji: "🤖", blurb: "Cut corners + grid", group: "Neon" },
    { id: "synthwave", name: "Synthwave", emoji: "🕹️", blurb: "Retro grid", group: "Neon" },
    { id: "vaporwave", name: "Vaporwave", emoji: "🌴", blurb: "80s gradient edge", group: "Neon" },
    { id: "lava", name: "Lava", emoji: "🌋", blurb: "Molten bottom glow", group: "Neon" },
    { id: "candy", name: "Candy", emoji: "🍬", blurb: "Pill buttons", group: "Neon" },
    { id: "nord", name: "Nord", emoji: "❄️", blurb: "Flat pro slate", group: "Dev" },
    { id: "dracula", name: "Dracula", emoji: "🧛", blurb: "Editor purple", group: "Dev" },
    { id: "catppuccin", name: "Catppuccin", emoji: "🐱", blurb: "Soft mocha", group: "Dev" },
    { id: "gruvbox", name: "Gruvbox", emoji: "🐻", blurb: "Warm retro code", group: "Dev" },
    { id: "tokyonight", name: "Tokyo Night", emoji: "🌃", blurb: "Soft city blues", group: "Dev" },
    { id: "solarized", name: "Solarized", emoji: "☀️", blurb: "Classic terminal", group: "Dev" },
    { id: "rosegold", name: "Rose Gold", emoji: "✨", blurb: "Pill elegant", group: "Soft" },
    { id: "amethyst", name: "Amethyst", emoji: "🔮", blurb: "Royal purple", group: "Soft" },
    { id: "coral", name: "Coral", emoji: "🪸", blurb: "Pill soft rose", group: "Soft" },
    { id: "honey", name: "Honey", emoji: "🍯", blurb: "Golden amber", group: "Soft" },
    { id: "icecream", name: "Ice Cream", emoji: "🍦", blurb: "Super rounded", group: "Soft" },
    { id: "clay", name: "Clay", emoji: "🧱", blurb: "Chunky offset shadow", group: "Soft" },
    { id: "emerald", name: "Emerald", emoji: "💎", blurb: "Luxury green", group: "Pro" },
    { id: "coffee", name: "Coffeehouse", emoji: "🫘", blurb: "Espresso & cream", group: "Pro" },
    { id: "paper", name: "Paper", emoji: "📄", blurb: "Light ink page", group: "Pro" },
    { id: "slate", name: "Slate", emoji: "🪨", blurb: "Flat gray pro", group: "Pro" },
    { id: "obsidian", name: "Obsidian", emoji: "⬛", blurb: "Hard minimal", group: "Pro" },
    { id: "steel", name: "Steel", emoji: "🛡️", blurb: "Flat metal", group: "Pro" },
    { id: "sunset", name: "Sunset", emoji: "🌇", blurb: "Orange dusk", group: "Pro" },
    { id: "mono", name: "Mono", emoji: "⬛", blurb: "Brutalist zero radius", group: "Pro" },
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
    ensure("themes-force-base-css", "/themes-force-base.css?v=8");
    ensure("themes-force-struct-css", "/themes-force-struct.css?v=8");
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
      return;
    }
    var wrap = document.querySelector(".view-mode-wrap");
    if (!wrap || !wrap.parentElement) return;
    var box = document.createElement("div");
    box.className = "view-mode-wrap";
    box.innerHTML =
      '<label class="view-mode-label" for="dashboard-theme">Theme</label>' +
      '<select id="dashboard-theme" class="view-mode-select" title="Dashboard theme">' +
      THEMES.map(function (t) {
        return '<option value="' + t.id + '">' + t.emoji + " " + t.name + "</option>";
      }).join("") +
      "</select>";
    wrap.parentElement.insertBefore(box, wrap.nextSibling);
    var select = document.getElementById("dashboard-theme");
    select.value = localStorage.getItem("dashboardTheme") || "default";
    select.addEventListener("change", function () { applyTheme(select.value); });
  }

  function ensureNav() {
    var nav = document.querySelector(".navigation");
    if (!nav) return false;
    if (nav.querySelector('[data-tab="themes"]')) return true;
    var settingsBtn = nav.querySelector('[data-tab="settings"]');
    var btn = document.createElement("button");
    btn.className = "nav-item";
    btn.type = "button";
    btn.setAttribute("data-tab", "themes");
    btn.title = "Dashboard themes";
    btn.innerHTML = "<span>🎨</span><em>Themes</em>";
    btn.addEventListener("click", function () {
      if (typeof window.showSection === "function") window.showSection("themes");
      else {
        document.querySelectorAll(".page-section").forEach(function (el) {
          el.classList.remove("active");
        });
        var sec = document.getElementById("themes");
        if (sec) sec.classList.add("active");
        document.querySelectorAll(".nav-item").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-tab") === "themes");
        });
      }
      renderCards();
    });
    if (settingsBtn) nav.insertBefore(btn, settingsBtn);
    else nav.appendChild(btn);
    return true;
  }

  function ensureSection() {
    var content = document.querySelector(".content");
    if (!content) return false;
    if (document.getElementById("themes")) return true;
    var section = document.createElement("section");
    section.id = "themes";
    section.className = "page-section";
    section.innerHTML =
      '<div class="card form-card wide">' +
      '<span class="eyebrow">APPEARANCE</span>' +
      "<h2>Dashboard themes</h2>" +
      '<p class="form-hint">Each pack changes shape, not just color — grids, sharp corners, pill buttons, CRT scanlines, chunky shadows, light paper, etc.</p>' +
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
    var order = ["Original", "Nature", "Neon", "Dev", "Soft", "Pro"];
    var html = "";
    order.forEach(function (g) {
      if (!groups[g]) return;
      html += '<h3 class="subhead themes-group-title">' + g + "</h3><div class="themes-row">';
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
    var saved = "default";
    try { saved = localStorage.getItem("dashboardTheme") || "default"; } catch (_) {}
    applyTheme(saved);
    renderCards();
  }

  var n = 0;
  function retry() {
    n++;
    boot();
    if (n < 40) setTimeout(retry, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", retry);
  else retry();

  window.__applyDashboardTheme = applyTheme;
  window.__dashboardThemes = THEMES;
  console.log("[theme-boot] v8 — " + THEMES.length + " structural themes");
})();
