/**
 * Per-tab system toggles v3 — every feature tab gets On/Off, except pure UI.
 * Server View is never toggleable (dashboard chrome, not a bot system).
 */
(function () {
  "use strict";
  if (window.__featuresTabTogglesV3) return;
  window.__featuresTabTogglesV3 = true;

  // Explicit allowlist: only real bot-system pages get an Enabled toggle.
  var ALLOWED_SYSTEM_TABS = {
    aichat:"ai", "ai-chat":"ai", aistaff:"ai",
    automod:"automod", moderation:"automod", mod:"automod",
    tickets:"tickets", verification:"verification", verify:"verification",
    applications:"applications", application:"applications", apply:"applications",
    fishing:"fishing", fish:"fishing",
    currency:"currency", beans:"currency", shop:"currency", leveling:"currency", economy:"currency",
    loa:"loa", activitycheck:"activitycheck", activity:"activitycheck", active:"activitycheck",
    birthday:"birthday", bump:"bump", achievements:"achievements", qotd:"qotd",
    selfroles:"selfroles", selfrole:"selfroles", analytics:"analytics",
    suggestions:"suggestions", suggest:"suggestions", invites:"invites", logs:"logs"
  };
  var LABELS = {
    ai:"AI Chat / Staff", automod:"Automod / Moderation", tickets:"Tickets",
    verification:"Verification", applications:"Applications", fishing:"Fishing",
    currency:"Economy / Beans / Shop / Leveling", loa:"LOA",
    activitycheck:"Activity Check", birthday:"Birthday", bump:"Bump",
    achievements:"Achievements", qotd:"Question of the Day", selfroles:"Self Roles",
    analytics:"Analytics", suggestions:"Suggestions", invites:"Invites", logs:"Logs"
  };
  function systemKeyFor(tabId) {
    var id = String(tabId || "").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    return ALLOWED_SYSTEM_TABS[id] || null;
  }
  function shouldSkip(tabId) { return !systemKeyFor(tabId); }

  function systemKeyFor(tabId) {
    var id = String(tabId || "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    if (!id) return null;
    if (ALIAS[id]) return ALIAS[id];
    return id;
  }

  function shouldSkip(tabId, sysKey) { return !systemKeyFor(tabId); }

  function prettyLabel(key, tabId) {
    if (LABELS[key]) return LABELS[key];
    var raw = tabId || key;
    return String(raw)
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      });
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


  function stripSkippedToggles() {
    document.querySelectorAll("[data-system-toggle]").forEach(function (el) {
      var key = el.getAttribute("data-system-toggle") || "";
      var tab = el.getAttribute("data-tab-for") || "";
      if (shouldSkip(tab, key)) el.remove();
    });
    // Also strip if sitting inside #server-view
    var sv = document.getElementById("server-view");
    if (sv) {
      sv.querySelectorAll("[data-system-toggle]").forEach(function (el) {
        el.remove();
      });
    }
  }

  function collectSections() {
    var found = [];
    var seen = {};

    function add(id, el) {
      if (!id || !el) return;
      var key = systemKeyFor(id);
      if (!key) return;
      if (shouldSkip(id, key)) return;
      var mark = key + "::" + (el.id || id);
      if (seen[mark]) return;
      seen[mark] = true;
      found.push({ tabId: id, key: key, el: el });
    }

    document.querySelectorAll("section.page-section, .page-section, section[id]").forEach(function (sec) {
      if (sec.id) add(sec.id, sec);
    });

    document.querySelectorAll("[data-tab]").forEach(function (btn) {
      var tab = btn.getAttribute("data-tab");
      if (!tab) return;
      var sec =
        document.getElementById(tab) ||
        document.querySelector('section[id="' + tab + '"]');
      if (sec) add(tab, sec);
    });

    return found;
  }

  function injectToggle(section, tabId, sysKey) {
    if (!section || !sysKey) return;
    if (shouldSkip(tabId, sysKey)) return;

    var existing = section.querySelector('[data-system-toggle="' + sysKey + '"]');
    if (existing) {
      return;
    }

    var card =
      section.querySelector(
        ".card, .form-card, .tickets-v3, [data-tickets-panel], [data-tickets-host]"
      ) ||
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

    var label = prettyLabel(sysKey, tabId);
    wrap.innerHTML =
      "<div style=\"min-width:140px;flex:1\">" +
      '<div style="font-weight:700;font-size:14px">System: ' +
      label +
      "</div>" +
      '<p class="form-hint" style="margin:4px 0 0">Off = this feature does nothing on the bot for this server.</p>' +
      "</div>" +
      '<label class="toggle" style="margin:0;white-space:nowrap;flex-shrink:0">' +
      '<input type="checkbox" data-sys-key="' +
      sysKey +
      '"' +
      (isOn(sysKey) ? " checked" : "") +
      "> <span>Enabled</span></label>" +
      '<p class="form-hint" data-system-toggle-status style="width:100%;margin:0"></p>';

    var h2 = card.querySelector("h2");
    if (h2) h2.insertAdjacentElement("afterend", wrap);
    else card.insertBefore(wrap, card.firstChild);

    var checkbox = wrap.querySelector('input[type="checkbox"]');
    if (checkbox) {
      checkbox.addEventListener("change", function () {
        setStatus(section, "Unsaved changes — use the Save or Cancel bar below.", true);
        if (window.updateDashboardDraftBar) window.updateDashboardDraftBar();
      });
      if (window.captureDashboardDraft) window.captureDashboardDraft();
    }
  }

  function setStatus(section, msg, ok) {
    if (!section) return;
    var el = section.querySelector("[data-system-toggle-status]");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  async function saveSystem(key, on, section) {
    if (shouldSkip(null, key)) return;
    if (!window.saveConfig) {
      setStatus(section, "Save not ready — refresh once.", false);
      return;
    }
    try {
      var payload = { systems: Object.assign({}, systemsCfg()) };
      payload.systems[key] = !!on;
      // Never persist serverview as off
      delete payload.systems.serverview;
      await window.saveConfig(payload);
      window.currentConfig.systems = payload.systems;
      setStatus(
        section,
        on ? "✅ Enabled & saved" : "✅ Disabled & saved",
        true
      );
    } catch (e) {
      setStatus(section, "❌ " + (e && e.message ? e.message : "Save failed"), false);
    }
  }

  async function saveSystemDraft() {
    var input = document.querySelector(".page-section.active [data-system-toggle] input[data-sys-key]");
    if (!input) return true;
    if (!window.saveConfig) throw new Error("Save is not ready. Refresh and try again.");
    var systems = Object.assign({}, systemsCfg());
    systems[input.getAttribute("data-sys-key")] = !!input.checked;
    delete systems.serverview;
    await window.saveConfig({ systems: systems });
    window.currentConfig.systems = systems;
    if (window.syncGlobals) window.syncGlobals();
    return true;
  }
  function restoreSystemDraft() {
    var input = document.querySelector(".page-section.active [data-system-toggle] input[data-sys-key]");
    if (input) input.checked = isOn(input.getAttribute("data-sys-key"));
  }
  window.saveSystemTabDraft = saveSystemDraft;
  window.restoreSystemTabDraft = restoreSystemDraft;

  function scanAndInject() {
    stripSkippedToggles();
    collectSections().forEach(function (item) {
      injectToggle(item.el, item.tabId, item.key);
    });
  }

  function wrapShowSection() {
    if (typeof window.showSection !== "function" || window.showSection.__tabToggleV3) return;
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      setTimeout(scanAndInject, 20);
      setTimeout(scanAndInject, 150);
      setTimeout(scanAndInject, 500);
      return r;
    };
    window.showSection.__tabToggleV3 = true;
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest && e.target.closest("[data-tab]");
      if (t) {
        setTimeout(scanAndInject, 30);
        setTimeout(scanAndInject, 200);
        setTimeout(scanAndInject, 600);
      }
    },
    true
  );

  try {
    var obs = new MutationObserver(function () {
      clearTimeout(window.__tabToggleDebounce);
      window.__tabToggleDebounce = setTimeout(scanAndInject, 80);
    });
    function watchContent() {
      var content = document.querySelector(".content") || document.body;
      if (!content || content.__tabToggleObsV3) return;
      content.__tabToggleObsV3 = true;
      obs.observe(content, { childList: true, subtree: true });
    }
    watchContent();
    setTimeout(watchContent, 2000);
  } catch (_) {}

  [0, 300, 1000, 2500, 6000, 12000].forEach(function (ms) {
    setTimeout(function () {
      wrapShowSection();
      scanAndInject();
    }, ms);
  });

  console.log("[features-tab-toggles] v4 — allowlisted systems; shared draft bar");
})();
