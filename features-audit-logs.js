/**
 * Audit log settings — lives in the existing #logs tab (not a new tab).
 * systems | ai | moderation | config (+ optional default channel)
 */
(function () {
  "use strict";
  if (window.__featuresAuditLogsV2) return;
  window.__featuresAuditLogsV2 = true;

  var TYPES = [
    {
      key: "systems",
      label: "System toggles",
      hint: "AI / economy / other systems turned on or off"
    },
    {
      key: "ai",
      label: "AI settings",
      hint: "Enabled, reply chance, channels, limits changed on the website"
    },
    {
      key: "moderation",
      label: "Moderation (bot actions)",
      hint: "Warn / kick / ban / timeout done through Coffee Shop"
    },
    {
      key: "config",
      label: "Other config",
      hint: "Reserved for more config events later"
    }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function channels() {
    try {
      if (typeof channelsCache !== "undefined" && channelsCache && channelsCache.length)
        return channelsCache;
    } catch (_) {}
    try {
      if (window.syncGlobals) window.syncGlobals();
    } catch (_) {}
    return (
      window.channelsCache ||
      window.__channels ||
      window.dashboardChannels ||
      []
    );
  }

  function fillSelect(el, selected, noneLabel) {
    if (!el) return;
    var list = channels();
    var cur = selected != null && selected !== "" ? String(selected) : el.value || "";
    var html =
      '<option value="">' +
      (noneLabel || "— None —") +
      "</option>";
    var filtered = list.filter(function (x) {
      if (!x) return false;
      var t = x.type;
      return (
        t === 0 ||
        t === 5 ||
        t == null ||
        t === "GUILD_TEXT" ||
        t === "GUILD_ANNOUNCEMENT" ||
        String(t) === "0" ||
        String(t) === "5"
      );
    });
    if (!filtered.length) filtered = list;
    filtered.forEach(function (x) {
      html +=
        '<option value="' +
        String(x.id) +
        '">#' +
        String(x.name || x.id).replace(/</g, "<") +
        "</option>";
    });
    el.innerHTML = html;
    if (cur) el.value = cur;
  }

  function getCfg() {
    var c = (window.currentConfig || {}).auditLog || {};
    var legacy =
      (window.currentConfig || {}).dashboardLogChannelId ||
      (window.currentConfig || {}).logChannelId ||
      "";
    return {
      enabled: c.enabled !== false,
      defaultChannelId: c.defaultChannelId || legacy || "",
      channels: c.channels || {}
    };
  }

  function ensurePanel() {
    var section = $("logs");
    if (!section) return null;

    // Remove the separate audit-logs section if an older build added it
    var orphan = $("audit-logs");
    if (orphan && orphan !== section) orphan.remove();
    document.querySelectorAll('[data-tab="audit-logs"]').forEach(function (el) {
      el.remove();
    });

    var host = $("audit-log-panel");
    if (host && section.contains(host)) return host;

    host = document.createElement("div");
    host.id = "audit-log-panel";
    host.style.marginTop = "20px";
    host.innerHTML =
      '<div style="border-top:1px solid rgba(128,128,128,.25);padding-top:16px;margin-top:8px">' +
      "<h2 style=\"margin:0 0 6px\">Coffee Shop audit logs</h2>" +
      '<p class="form-hint">Staff / config / moderation only — normal member commands are not logged. Set a channel per type (or use the default above).</p>' +
      '<label class="toggle" style="margin:10px 0;display:flex;align-items:center;gap:8px">' +
      '<input type="checkbox" id="audit-enabled" checked> <span><strong>Enable audit logs</strong></span></label>' +
      '<div id="audit-type-list"></div>' +
      "</div>";

    // Prefer after existing log card content
    var card = section.querySelector(".card, .form-card") || section;
    card.appendChild(host);

    // Retitle / clarify the original single channel as default
    var h2 = card.querySelector("h2");
    if (h2 && /dashboard logs/i.test(h2.textContent || "")) {
      h2.textContent = "Log channels";
    }
    var lab = card.querySelector('label[for="dashboard-log-channel"]');
    if (lab) lab.textContent = "Default log channel (fallback)";

    return host;
  }

  function renderTypes() {
    ensurePanel();
    var cfg = getCfg();
    var en = $("audit-enabled");
    if (en) en.checked = cfg.enabled !== false;

    var list = $("audit-type-list");
    if (!list) return;

    list.innerHTML = TYPES.map(function (t) {
      return (
        '<div class="input-group" style="margin-bottom:12px">' +
        "<label for=\"audit-ch-" +
        t.key +
        '\"><strong>' +
        t.label +
        "</strong></label>" +
        '<p class="form-hint" style="margin:2px 0 6px">' +
        t.hint +
        "</p>" +
        '<select id="audit-ch-' +
        t.key +
        '" data-audit-type="' +
        t.key +
        '"></select></div>'
      );
    }).join("");

    TYPES.forEach(function (t) {
      var el = $("audit-ch-" + t.key);
      fillSelect(
        el,
        (cfg.channels && cfg.channels[t.key]) || "",
        "— Use default / none —"
      );
    });

    // Fill original default select too
    var def = $("dashboard-log-channel");
    if (def) fillSelect(def, cfg.defaultChannelId, "Select a channel…");
  }

  function collect() {
    var channels = {};
    document.querySelectorAll("[data-audit-type]").forEach(function (sel) {
      var k = sel.getAttribute("data-audit-type");
      channels[k] = sel.value || null;
    });
    var defEl = $("dashboard-log-channel");
    return {
      enabled: $("audit-enabled") ? $("audit-enabled").checked : true,
      defaultChannelId: defEl && defEl.value ? defEl.value : null,
      channels: channels
    };
  }

  function setStatus(msg, ok) {
    var el = $("logs-status");
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
      var auditLog = collect();
      await window.saveConfig({ auditLog: auditLog });
      if (!window.currentConfig) window.currentConfig = {};
      window.currentConfig.auditLog = auditLog;
      setStatus("✅ Log channels saved.", true);
    } catch (e) {
      setStatus("❌ " + (e && e.message ? e.message : "Save failed"), false);
    }
  }

  async function testLog() {
    setStatus(
      "Test: after the bot redeploys, flip any system toggle (or change AI settings) — you should see an embed in the channel you set for that type.",
      true
    );
  }

  function bind() {
    var saveBtn = $("save-logs");
    if (saveBtn && !saveBtn.__auditBound) {
      saveBtn.__auditBound = true;
      saveBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        save();
      });
    }
    var testBtn = $("test-log");
    if (testBtn && !testBtn.__auditBound) {
      testBtn.__auditBound = true;
      testBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        testLog();
      });
    }
  }

  function mount() {
    if (!$("logs")) return;
    ensurePanel();
    renderTypes();
    bind();
  }

  function wrapShowSection() {
    if (typeof window.showSection !== "function" || window.showSection.__auditLogsV2)
      return;
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      if (String(tab) === "logs") {
        setTimeout(mount, 30);
        setTimeout(mount, 200);
        setTimeout(mount, 800);
      }
      return r;
    };
    window.showSection.__auditLogsV2 = true;
  }

  document.addEventListener(
    "click",
    function (e) {
      var t =
        e.target &&
        e.target.closest &&
        e.target.closest('[data-tab="logs"], [data-section-link="logs"]');
      if (t) {
        setTimeout(mount, 40);
        setTimeout(mount, 300);
      }
    },
    true
  );

  // When channel list loads later, refresh dropdowns
  try {
    var obs = new MutationObserver(function () {
      if ($("logs") && $("logs").classList.contains("active")) {
        clearTimeout(window.__auditLogFillT);
        window.__auditLogFillT = setTimeout(function () {
          renderTypes();
          bind();
        }, 100);
      }
    });
    setTimeout(function () {
      var root = document.querySelector(".content") || document.body;
      if (root && !root.__auditLogObs) {
        root.__auditLogObs = true;
        obs.observe(root, { childList: true, subtree: true });
      }
    }, 1000);
  } catch (_) {}

  [0, 400, 1200, 3000, 7000].forEach(function (ms) {
    setTimeout(function () {
      wrapShowSection();
      mount();
    }, ms);
  });

  console.log("[features-audit-logs] v2 — inside Logs tab");
})();
