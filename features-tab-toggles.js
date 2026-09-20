/**
 * Per-tab system toggles — inject an On/Off switch at the top of each feature tab.
 * Saves to config.systems[key] (same as the Systems page).
 */
(function () {
  "use strict";
  if (window.__featuresTabTogglesV1) return;
  window.__featuresTabTogglesV1 = true;

  /** tab id (section id / data-tab) → systems key */
  var TAB_TO_SYSTEM = {
    aichat: "ai",
    ai: "ai",
    "ai-chat": "ai",
    automod: "automod",
    tickets: "tickets",
    verification: "verification",
    verify: "verification",
    applications: "applications",
    application: "applications",
    fishing: "fishing",
    fish: "fishing",
    currency: "currency",
    beans: "currency",
    shop: "currency",
    leveling: "currency",
    economy: "currency",
    loa: "loa",
    activitycheck: "activitycheck",
    activity: "activitycheck",
    help: "help",
    birthday: "birthday",
    bump: "bump",
    achievements: "achievements",
    qotd: "qotd",
    selfroles: "selfroles",
    selfrole: "selfroles",
    analytics: "analytics",
    moderation: "automod",
    mod: "automod"
  };

  var LABELS = {
    ai: "AI system",
    automod: "Automod",
    tickets: "Tickets",
    verification: "Verification",
    applications: "Applications",
    fishing: "Fishing",
    currency: "Economy / Beans",
    loa: "LOA",
    activitycheck: "Activity Check",
    help: "Help",
    birthday: "Birthday",
    bump: "Bump",
    achievements: "Achievements",
    qotd: "QOTD",
    selfroles: "Self Roles",
    analytics: "Analytics"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function systemsCfg() {
    if (!window.currentConfig) window.currentConfig = {};
    if (!window.currentConfig.systems || typeof window.currentConfig.systems !== "object") {
      window.currentConfig.systems = {};
    }
    return window.currentConfig.systems;
  }

  function isOn(key) {
    return systemsCfg()[key] !== false;
  }

  function setOn(key, on) {
    systemsCfg()[key] = !!on;
  }

  function findSection(tabId) {
    return $("" + tabId) || document.querySelector('section[id="' + tabId + '"]');
  }

  function injectToggle(section, tabId, sysKey) {
    if (!section || !sysKey) return;
    var existing = section.querySelector('[data-system-toggle="' + sysKey + '"]');
    if (existing) {
      var inp = existing.querySelector('input[type="checkbox"]');
      if (inp) inp.checked = isOn(sysKey);
      return;
    }

    var card =
      section.querySelector(".card, .form-card, .tickets-v3, [data-tickets-panel]") ||
      section.firstElementChild ||
      section;

    var wrap = document.createElement("div");
    wrap.setAttribute("data-system-toggle", sysKey);
    wrap.setAttribute("data-tab-for", tabId);
    wrap.className = "system-tab-toggle";
    wrap.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;gap:12px;" +
      "flex-wrap:wrap;margin:0 0 14px;padding:12px 14px;border-radius:12px;" +
      "border:1px solid rgba(128,128,128,.28);background:rgba(0,0,0,.12);";

    var label = LABELS[sysKey] || sysKey;
    wrap.innerHTML =
      "<div>" +
      '<div style="font-weight:700;font-size:14px">System: ' +
      label +
      "</div>" +
      '<p class="form-hint" style="margin:4px 0 0">Turn this whole feature on or off for the server.</p>' +
      "</div>" +
      '<label class="toggle" style="margin:0;white-space:nowrap">' +
      '<input type="checkbox" data-sys-key="' +
      sysKey +
      '"' +
      (isOn(sysKey) ? " checked" : "") +
      "> <span>Enabled</span></label>";

    // Prefer after eyebrow/title
    var eyebrow = card.querySelector(".eyebrow, h2");
    if (eyebrow && eyebrow.parentNode === card) {
      // insert after h2 if present
      var h2 = card.querySelector("h2");
      if (h2 && h2.nextSibling) card.insertBefore(wrap, h2.nextSibling);
      else if (h2) h2.insertAdjacentElement("afterend", wrap);
      else card.insertBefore(wrap, card.firstChild);
    } else {
      card.insertBefore(wrap, card.firstChild);
    }

    var checkbox = wrap.querySelector('input[type="checkbox"]');
    if (checkbox) {
      checkbox.addEventListener("change", function () {
        setOn(sysKey, checkbox.checked);
        saveSystem(sysKey, checkbox.checked);
      });
    }
  }

  function setStatusNear(section, msg, ok) {
    if (!section) return;
    var el = section.querySelector("[data-system-toggle-status]");
    if (!el) {
      el = document.createElement("p");
      el.className = "form-hint";
      el.setAttribute("data-system-toggle-status", "1");
      var box = section.querySelector("[data-system-toggle]");
      if (box) box.appendChild(el);
      else section.appendChild(el);
    }
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  async function saveSystem(key, on) {
    if (!window.saveConfig) {
      setStatusNear(findSectionForKey(key), "Save not ready — refresh once.", false);
      return;
    }
    try {
      var payload = { systems: Object.assign({}, systemsCfg(), {}) };
      payload.systems[key] = !!on;
      await window.saveConfig(payload);
      window.currentConfig.systems = payload.systems;
      setStatusNear(
        findSectionForKey(key),
        on ? "✅ " + (LABELS[key] || key) + " enabled" : "✅ " + (LABELS[key] || key) + " disabled",
        true
      );
    } catch (e) {
      setStatusNear(
        findSectionForKey(key),
        "❌ " + (e && e.message ? e.message : "Save failed"),
        false
      );
    }
  }

  function findSectionForKey(key) {
    var el = document.querySelector('[data-system-toggle="' + key + '"]');
    return el ? el.closest(".page-section, section") : null;
  }

  function scanAndInject() {
    // By known section ids
    Object.keys(TAB_TO_SYSTEM).forEach(function (tabId) {
      var section = findSection(tabId);
      if (section) injectToggle(section, tabId, TAB_TO_SYSTEM[tabId]);
    });

    // By data-tab links that have matching sections
    document.querySelectorAll("[data-tab]").forEach(function (btn) {
      var tab = btn.getAttribute("data-tab");
      if (!tab || !TAB_TO_SYSTEM[tab]) return;
      var section = findSection(tab);
      if (section) injectToggle(section, tab, TAB_TO_SYSTEM[tab]);
    });
  }

  function onShowSection() {
    if (typeof window.showSection !== "function" || window.showSection.__tabToggleWrap) return;
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      setTimeout(scanAndInject, 30);
      setTimeout(scanAndInject, 200);
      return r;
    };
    window.showSection.__tabToggleWrap = true;
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest && e.target.closest("[data-tab]");
      if (t) {
        setTimeout(scanAndInject, 40);
        setTimeout(scanAndInject, 250);
      }
    },
    true
  );

  [0, 400, 1200, 3000, 7000].forEach(function (ms) {
    setTimeout(function () {
      onShowSection();
      scanAndInject();
    }, ms);
  });

  console.log("[features-tab-toggles] v1 ready");
})();
