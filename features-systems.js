/**
 * Systems master switches — enable/disable each bot system per guild.
 */
(function () {
  "use strict";
  if (window.__featuresSystemsV1) return;
  window.__featuresSystemsV1 = true;

  var SYSTEMS = [
    { key: "ai", label: "AI Chat / Operator", emoji: "☕" },
    { key: "automod", label: "Automod", emoji: "🛡️" },
    { key: "tickets", label: "Tickets", emoji: "🎫" },
    { key: "verification", label: "Verification", emoji: "✅" },
    { key: "applications", label: "Applications", emoji: "📋" },
    { key: "fishing", label: "Fishing", emoji: "🎣" },
    { key: "currency", label: "Economy / Beans", emoji: "🫘" },
    { key: "loa", label: "LOA", emoji: "🏖️" },
    { key: "activitycheck", label: "Activity Check", emoji: "📊" },
    { key: "help", label: "Help", emoji: "❓" },
    { key: "birthday", label: "Birthday", emoji: "🎂" },
    { key: "bump", label: "Bump", emoji: "📢" },
    { key: "achievements", label: "Achievements", emoji: "🏆" },
    { key: "qotd", label: "Question of the Day", emoji: "💭" },
    { key: "selfroles", label: "Self Roles", emoji: "🎭" },
    { key: "memberPresence", label: "Member Presence", emoji: "👁️" },
    { key: "analytics", label: "Analytics", emoji: "📈" }
  ];

  function $(id) { return document.getElementById(id); }

  function ensureSection() {
    var content = document.querySelector(".content");
    if (!content) return false;
    if ($("systems")) return true;

    var html =
      '<section id="systems" class="page-section"><div class="card form-card wide">' +
      '<span class="eyebrow">SYSTEMS</span>' +
      "<h2>System toggles</h2>" +
      '<p class="form-hint">Turn whole bot systems on or off for this server. Off = commands and features for that system do nothing.</p>' +
      '<div id="systems-list" class="config-grid" style="grid-template-columns:1fr"></div>' +
      '<div style="margin-top:1rem;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="button" type="button" id="systems-all-on">Enable all</button>' +
      '<button class="button" type="button" id="systems-all-off">Disable all</button>' +
      '<button class="button" type="button" id="save-systems">Save system toggles</button>' +
      "</div>" +
      '<p class="form-hint" id="systems-status"></p>' +
      "</div></section>";

    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    while (wrap.firstChild) content.appendChild(wrap.firstChild);
    return true;
  }

  function renderList() {
    var list = $("systems-list");
    if (!list) return;
    var cfg = ((window.currentConfig || {}).systems) || {};
    list.innerHTML = SYSTEMS.map(function (s) {
      var on = cfg[s.key] !== false;
      return (
        '<label class="toggle" style="padding:10px 0;border-bottom:1px solid rgba(128,128,128,.15)">' +
        '<input type="checkbox" data-sys-key="' + s.key + '"' + (on ? " checked" : "") + "> ' +
        "<span>" + s.emoji + " <strong>" + s.label + "</strong></span></label>"
      );
    }).join("");
  }

  function collect() {
    var out = {};
    document.querySelectorAll("[data-sys-key]").forEach(function (el) {
      out[el.getAttribute("data-sys-key")] = !!el.checked;
    });
    return out;
  }

  function setStatus(msg, ok) {
    var el = $("systems-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  async function save() {
    if (!window.saveConfig) {
      setStatus("Save not ready — refresh once.", false);
      return;
    }
    try {
      setStatus("Saving…", true);
      var systems = collect();
      await window.saveConfig({ systems: systems });
      if (!window.currentConfig) window.currentConfig = {};
      window.currentConfig.systems = systems;
      setStatus("✅ System toggles saved. Bot applies them on the next config push.", true);
    } catch (e) {
      setStatus("❌ " + (e && e.message ? e.message : "Save failed"), false);
    }
  }

  function bind() {
    var saveBtn = $("save-systems");
    if (saveBtn && !saveBtn.__bound) {
      saveBtn.__bound = true;
      saveBtn.addEventListener("click", function (e) {
        e.preventDefault();
        save();
      });
    }
    var on = $("systems-all-on");
    if (on && !on.__bound) {
      on.__bound = true;
      on.addEventListener("click", function () {
        document.querySelectorAll("[data-sys-key]").forEach(function (el) { el.checked = true; });
      });
    }
    var off = $("systems-all-off");
    if (off && !off.__bound) {
      off.__bound = true;
      off.addEventListener("click", function () {
        document.querySelectorAll("[data-sys-key]").forEach(function (el) { el.checked = false; });
      });
    }
  }

  function mount() {
    ensureSection();
    renderList();
    bind();
  }

  // Drawer nav entry
  function ensureDrawerLink() {
    var drawer = document.getElementById("nav-drawer");
    if (!drawer) return;
    if (drawer.querySelector('[data-tab="systems"]')) return;
    var a = document.createElement("button");
    a.type = "button";
    a.className = "nav-drawer-item";
    a.setAttribute("data-tab", "systems");
    a.textContent = "⚙️ Systems";
    a.addEventListener("click", function () {
      if (typeof window.showSection === "function") window.showSection("systems");
      mount();
    });
    drawer.appendChild(a);
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-tab="systems"]');
    if (t) setTimeout(mount, 40);
  }, true);

  [0, 500, 1500, 4000].forEach(function (ms) {
    setTimeout(function () {
      mount();
      ensureDrawerLink();
    }, ms);
  });

  console.log("[features-systems] v1 ready");
})();
