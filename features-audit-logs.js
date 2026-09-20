/**
 * Audit log settings inside #logs tab.
 * v3 — dropdowns keep selection; no MutationObserver thrash.
 */
(function () {
  "use strict";
  if (window.__featuresAuditLogsV3) return;
  window.__featuresAuditLogsV3 = true;

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

  /**
   * Fill a select once (or when channel list grew).
   * Never clears the current selection while the user is choosing.
   */
  function fillSelect(el, preferredValue, noneLabel) {
    if (!el || el.tagName !== "SELECT") return;

    // User is interacting — don't touch
    if (el === document.activeElement) return;

    var list = channels();
    var textChannels = list.filter(function (x) {
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
    if (!textChannels.length) textChannels = list;

    // Already has real options and enough channels loaded
    var hasOptions = el.options.length > 1;
    var optionCount = el.options.length - 1; // minus placeholder
    if (hasOptions && textChannels.length && optionCount >= Math.min(textChannels.length, 5)) {
      // Only update value if empty and we have a preferred from config
      if (!el.value && preferredValue) {
        el.value = String(preferredValue);
      }
      return;
    }

    if (!textChannels.length) {
      // Keep a placeholder so the control is usable later
      if (!hasOptions) {
        el.innerHTML =
          '<option value="">' +
          (noneLabel || "— Loading channels… —") +
          "</option>";
      }
      return;
    }

    var cur =
      el.value ||
      (preferredValue != null && preferredValue !== ""
        ? String(preferredValue)
        : "");

    var html =
      '<option value="">' + (noneLabel || "— None —") + "</option>";
    textChannels.forEach(function (x) {
      html +=
        '<option value="' +
        String(x.id) +
        '">#' +
        String(x.name || x.id).replace(/</g, "<") +
        "</option>";
    });
    el.innerHTML = html;
    if (cur) {
      el.value = cur;
      // If id wasn't in list, leave blank rather than forcing wrong option
      if (el.value !== cur) el.value = "";
    }
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
      '<p class="form-hint">Staff / config / moderation only — normal member commands are not logged.</p>' +
      '<label class="toggle" style="margin:10px 0;display:flex;align-items:center;gap:8px">' +
      '<input type="checkbox" id="audit-enabled" checked> <span><strong>Enable audit logs</strong></span></label>' +
      '<div id="audit-type-list"></div>' +
      "</div>";

    var card = section.querySelector(".card, .form-card") || section;
    card.appendChild(host);

    var h2 = card.querySelector("h2");
    if (h2 && /dashboard logs/i.test(h2.textContent || "")) {
      h2.textContent = "Log channels";
    }
    var lab = card.querySelector('label[for="dashboard-log-channel"]');
    if (lab) lab.textContent = "Default log channel (fallback)";

    return host;
  }

  function buildTypeRowsOnce() {
    var list = $("audit-type-list");
    if (!list) return;
    if (list.dataset.built === "1") return;

    list.innerHTML = TYPES.map(function (t) {
      return (
        '<div class="input-group" style="margin-bottom:12px">' +
        '<label for="audit-ch-' +
        t.key +
        '"><strong>' +
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
    list.dataset.built = "1";

    // Remember user picks so save works even if something re-fills later
    list.addEventListener("change", function (e) {
      var sel = e.target;
      if (!sel || !sel.getAttribute) return;
      var key = sel.getAttribute("data-audit-type");
      if (!key) return;
      if (!window.__auditLogPicks) window.__auditLogPicks = {};
      window.__auditLogPicks[key] = sel.value || null;
    });
  }

  function fillAllSelects() {
    var cfg = getCfg();
    var picks = window.__auditLogPicks || {};

    var en = $("audit-enabled");
    if (en && document.activeElement !== en) {
      // only set from config if user hasn't toggled this session
      if (!en.dataset.userTouched) {
        en.checked = cfg.enabled !== false;
      }
    }
    if (en && !en.__auditTouchBound) {
      en.__auditTouchBound = true;
      en.addEventListener("change", function () {
        en.dataset.userTouched = "1";
      });
    }

    TYPES.forEach(function (t) {
      var el = $("audit-ch-" + t.key);
      var preferred =
        picks[t.key] != null
          ? picks[t.key]
          : (cfg.channels && cfg.channels[t.key]) || "";
      fillSelect(el, preferred, "— Use default / none —");
    });

    var def = $("dashboard-log-channel");
    var defPref =
      picks.__default != null ? picks.__default : cfg.defaultChannelId || "";
    fillSelect(def, defPref, "Select a channel…");
    if (def && !def.__auditPickBound) {
      def.__auditPickBound = true;
      def.addEventListener("change", function () {
        if (!window.__auditLogPicks) window.__auditLogPicks = {};
        window.__auditLogPicks.__default = def.value || null;
      });
    }
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
      window.__auditLogPicks = {
        __default: auditLog.defaultChannelId,
        systems: auditLog.channels.systems,
        ai: auditLog.channels.ai,
        moderation: auditLog.channels.moderation,
        config: auditLog.channels.config
      };
      setStatus("✅ Log channels saved.", true);
    } catch (e) {
      setStatus("❌ " + (e && e.message ? e.message : "Save failed"), false);
    }
  }

  function bind() {
    var saveBtn = $("save-logs");
    if (saveBtn && !saveBtn.__auditBound) {
      saveBtn.__auditBound = true;
      saveBtn.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          save();
        },
        true
      );
    }
    var testBtn = $("test-log");
    if (testBtn && !testBtn.__auditBound) {
      testBtn.__auditBound = true;
      testBtn.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          setStatus(
            "After the bot is redeployed, change a system toggle or AI setting — the matching log channel should get an embed.",
            true
          );
        },
        true
      );
    }
  }

  function mount() {
    if (!$("logs")) return;
    ensurePanel();
    buildTypeRowsOnce();
    fillAllSelects();
    bind();
  }

  function wrapShowSection() {
    if (typeof window.showSection !== "function" || window.showSection.__auditLogsV3)
      return;
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      if (String(tab) === "logs") {
        setTimeout(mount, 40);
        setTimeout(mount, 400);
      }
      return r;
    };
    window.showSection.__auditLogsV3 = true;
  }

  document.addEventListener(
    "click",
    function (e) {
      var t =
        e.target &&
        e.target.closest &&
        e.target.closest('[data-tab="logs"], [data-section-link="logs"]');
      if (t) {
        setTimeout(mount, 50);
        setTimeout(mount, 500);
      }
    },
    true
  );

  // When channels load (channelsCache fills), refresh options WITHOUT wiping picks
  var lastChannelCount = 0;
  setInterval(function () {
    var n = channels().length;
    if (n && n !== lastChannelCount) {
      lastChannelCount = n;
      if ($("audit-type-list")) fillAllSelects();
    }
  }, 1500);

  [0, 500, 1500, 4000].forEach(function (ms) {
    setTimeout(function () {
      wrapShowSection();
      mount();
    }, ms);
  });

  console.log("[features-audit-logs] v3 — stable dropdowns");
})();
