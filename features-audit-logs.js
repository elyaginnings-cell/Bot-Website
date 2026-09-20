/**
 * Audit logs settings — pick a channel for each log type.
 * systems | ai | moderation | config
 */
(function () {
  "use strict";
  if (window.__featuresAuditLogsV1) return;
  window.__featuresAuditLogsV1 = true;

  var TYPES = [
    {
      key: "systems",
      label: "System toggles",
      hint: "When AI / economy / other systems are turned on or off"
    },
    {
      key: "ai",
      label: "AI settings",
      hint: "Enabled, reply chance, channels, limits changed on the website"
    },
    {
      key: "moderation",
      label: "Moderation actions",
      hint: "Warn / kick / ban / timeout done through the Coffee Shop bot"
    },
    {
      key: "config",
      label: "Other config",
      hint: "Reserved for future important config changes"
    }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function channels() {
    return window.dashboardChannels || window.channelsList || [];
  }

  function channelOptions(selected) {
    var list = channels();
    var opts =
      '<option value="">— None (don’t log this type) —</option>';
    if (!list.length) {
      opts +=
        '<option value="" disabled>Load the dashboard once so channels appear</option>';
    }
    list.forEach(function (c) {
      var id = String(c.id || c.value || "");
      var name = c.name || c.label || id;
      opts +=
        '<option value="' +
        id +
        '"' +
        (String(selected || "") === id ? " selected" : "") +
        ">#" +
        String(name).replace(/</g, "<") +
        "</option>";
    });
    return opts;
  }

  function ensureSection() {
    var content = document.querySelector(".content");
    if (!content) return false;
    if ($("audit-logs")) return true;

    var html =
      '<section id="audit-logs" class="page-section"><div class="card form-card wide">' +
      '<span class="eyebrow">AUDIT LOGS</span>' +
      "<h2>Coffee Shop logs</h2>" +
      '<p class="form-hint">Staff / config / moderation only — normal member commands are <strong>not</strong> logged. Pick where each type goes (or leave blank to skip).</p>' +
      '<label class="toggle" style="margin-bottom:12px">' +
      '<input type="checkbox" id="audit-enabled" checked> <span><strong>Enable audit logs</strong></span></label>' +
      '<div class="input-group" style="margin-bottom:14px">' +
      "<label>Default channel (used if a type has no channel)</label>" +
      '<select id="audit-default-channel"></select></div>' +
      '<div id="audit-type-list"></div>' +
      '<div style="margin-top:1rem;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="button" type="button" id="save-audit-logs">Save log channels</button>' +
      "</div>" +
      '<p class="form-hint" id="audit-logs-status"></p>' +
      "</div></section>";

    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    while (wrap.firstChild) content.appendChild(wrap.firstChild);
    return true;
  }

  function getCfg() {
    var c = (window.currentConfig || {}).auditLog || {};
    return {
      enabled: c.enabled !== false,
      defaultChannelId: c.defaultChannelId || "",
      channels: c.channels || {}
    };
  }

  function render() {
    ensureSection();
    var cfg = getCfg();
    var en = $("audit-enabled");
    if (en) en.checked = cfg.enabled !== false;
    var def = $("audit-default-channel");
    if (def) def.innerHTML = channelOptions(cfg.defaultChannelId);

    var list = $("audit-type-list");
    if (!list) return;
    list.innerHTML = TYPES.map(function (t) {
      var sel = (cfg.channels && cfg.channels[t.key]) || "";
      return (
        '<div class="input-group" style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(128,128,128,.15)">' +
        "<label><strong>" +
        t.label +
        "</strong></label>" +
        '<p class="form-hint" style="margin:4px 0 8px">' +
        t.hint +
        "</p>" +
        '<select data-audit-type="' +
        t.key +
        '">' +
        channelOptions(sel) +
        "</select></div>"
      );
    }).join("");
  }

  function collect() {
    var channels = {};
    document.querySelectorAll("[data-audit-type]").forEach(function (sel) {
      var k = sel.getAttribute("data-audit-type");
      channels[k] = sel.value || null;
    });
    return {
      enabled: $("audit-enabled") ? $("audit-enabled").checked : true,
      defaultChannelId: $("audit-default-channel")
        ? $("audit-default-channel").value || null
        : null,
      channels: channels
    };
  }

  function setStatus(msg, ok) {
    var el = $("audit-logs-status");
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
      setStatus("✅ Log channels saved. Bot will use them after the next config push.", true);
    } catch (e) {
      setStatus("❌ " + (e && e.message ? e.message : "Save failed"), false);
    }
  }

  function bind() {
    var btn = $("save-audit-logs");
    if (btn && !btn.__bound) {
      btn.__bound = true;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        save();
      });
    }
  }

  function ensureDrawerLink() {
    var drawer = document.getElementById("nav-drawer");
    if (!drawer) return;
    if (drawer.querySelector('[data-tab="audit-logs"]')) return;
    var a = document.createElement("button");
    a.type = "button";
    a.className = "nav-drawer-item";
    a.setAttribute("data-tab", "audit-logs");
    a.textContent = "📋 Audit logs";
    a.addEventListener("click", function () {
      if (typeof window.showSection === "function") window.showSection("audit-logs");
      render();
      bind();
    });
    drawer.appendChild(a);
  }

  // Re-render when channels load
  var origSet =
    window.setDashboardChannels ||
    window.setChannels ||
    null;

  document.addEventListener(
    "click",
    function (e) {
      var t =
        e.target &&
        e.target.closest &&
        e.target.closest('[data-tab="audit-logs"]');
      if (t) {
        setTimeout(function () {
          render();
          bind();
        }, 40);
      }
    },
    true
  );

  [0, 500, 1500, 4000, 8000].forEach(function (ms) {
    setTimeout(function () {
      ensureSection();
      render();
      bind();
      ensureDrawerLink();
    }, ms);
  });

  console.log("[features-audit-logs] v1 ready");
})();
