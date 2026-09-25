/**
 * Dashboard security upgrade UI (hardened save)
 */
(function () {
  "use strict";
  if (window.__featuresSecurityUpgradeV2) return;
  window.__featuresSecurityUpgradeV2 = true;
  window.__featuresSecurityUpgrade = true;

  function $(id) {
    return document.getElementById(id);
  }

  function roles() {
    try {
      if (typeof rolesCache !== "undefined" && rolesCache && rolesCache.length) return rolesCache;
    } catch (_) {}
    return window.rolesCache || [];
  }

  function channels() {
    try {
      if (typeof channelsCache !== "undefined" && channelsCache && channelsCache.length) return channelsCache;
    } catch (_) {}
    return window.channelsCache || [];
  }

  function textChannels() {
    return channels().filter(function (c) {
      return c && (c.type === 0 || c.type === 5 || c.type == null || c.type === "GUILD_TEXT");
    });
  }

  function fillRoleSelect(sel, noneLabel) {
    if (!sel || sel.tagName !== "SELECT") return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">' + (noneLabel || "Select…") + "</option>";
    roles().forEach(function (r) {
      if (!r || r.name === "@everyone") return;
      var o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.name || r.id;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }

  function fillChannelSelect(sel, noneLabel) {
    if (!sel || sel.tagName !== "SELECT") return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">' + (noneLabel || "None") + "</option>";
    textChannels().forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = "#" + (c.name || c.id);
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }

  function getSelectedGuildId() {
    try {
      if (window.selectedServer && window.selectedServer.id) return String(window.selectedServer.id);
    } catch (_) {}
    try {
      if (typeof selectedServer !== "undefined" && selectedServer && selectedServer.id)
        return String(selectedServer.id);
    } catch (_) {}
    try {
      var raw = localStorage.getItem("selectedServer");
      if (raw) {
        var p = JSON.parse(raw);
        if (p && p.id) return String(p.id);
      }
    } catch (_) {}
    return null;
  }

  /** Resolve saveConfig from window or fall back to direct API POST */
  async function saveConfigSafe(body) {
    var fn = null;
    try {
      if (typeof window.saveConfig === "function") fn = window.saveConfig;
    } catch (_) {}
    if (!fn) {
      try {
        if (typeof saveConfig === "function") {
          fn = saveConfig;
          window.saveConfig = saveConfig;
        }
      } catch (_) {}
    }
    if (fn) return fn(body);

    var guildId = getSelectedGuildId();
    if (!guildId) throw new Error("Select a server first (top of the dashboard).");

    var response = await fetch("/api/config?guildId=" + encodeURIComponent(guildId), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    var data = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      var detail = data.detail ? " — " + data.detail : "";
      throw new Error((data.error || "Save failed (HTTP " + response.status + ")") + detail);
    }
    if (data.config) {
      try {
        window.currentConfig = data.config;
        if (typeof currentConfig !== "undefined") currentConfig = data.config;
      } catch (_) {}
    }
    return data;
  }

  var SECURITY_HTML =
    '<div id="automod-security-block" class="card form-card wide" style="margin-top:1.25rem;border:1px solid rgba(239,68,68,0.25)">' +
    '<span class="eyebrow">SECURITY</span>' +
    "<h2>Malicious containment</h2>" +
    '<p class="form-hint">High-confidence threats are contained (delete + timeout + cleanup) and staff are alerted. ' +
    "<strong>Users are never auto-banned</strong> — staff decide permanent bans.</p>" +
    '<label class="toggle"><input type="checkbox" id="sec-use-classifier" checked> <span>Use security classifier (deterministic + AI)</span></label>' +
    '<label class="toggle"><input type="checkbox" id="sec-block-auto-ban" checked> <span>Block auto-ban from AI / scam rules</span></label>' +
    '<div class="config-grid">' +
    '<div class="input-group"><label>High Staff / Security alert role</label>' +
    '<select id="sec-high-staff-role"><option value="">None</option></select></div>' +
    '<div class="input-group"><label>Security alert channel (optional)</label>' +
    '<select id="sec-security-log"><option value="">Use Automod log channel</option></select></div>' +
    '<div class="input-group"><label>Malicious confidence threshold (0–1)</label>' +
    '<input type="number" id="sec-malicious-threshold" min="0.5" max="1" step="0.05" value="0.75"></div>' +
    '<div class="input-group"><label>Containment timeout duration</label>' +
    '<input type="text" id="sec-timeout-duration" value="1h" placeholder="e.g. 1h, 30m"></div>' +
    '<div class="input-group"><label>Cleanup message window (minutes)</label>' +
    '<input type="number" id="sec-cleanup-minutes" min="1" max="1440" value="15"></div>' +
    '<div class="input-group"><label>Newly-verified monitor (minutes)</label>' +
    '<input type="number" id="sec-newly-verified-mins" min="0" max="10080" value="30"></div>' +
    "</div>" +
    '<p class="form-hint">During the newly-verified window, accounts are treated as higher risk for AI analysis only — members still see normal access.</p>' +
    '<button class="button" id="save-security" type="button" style="margin-top:0.75rem">Save Security Settings</button>' +
    '<p class="form-hint" id="security-status"></p>' +
    "</div>";

  function injectSecurityBlock() {
    if ($("automod-security-block")) return true;
    var automodSec = $("automod");
    if (!automodSec) return false;
    var host = automodSec.querySelector(".card.form-card") || automodSec;
    var wrap = document.createElement("div");
    wrap.innerHTML = SECURITY_HTML;
    while (wrap.firstChild) host.appendChild(wrap.firstChild);
    return true;
  }

  function injectVerifyMonitor() {
    if ($("verify-monitor-mins")) return true;
    var vch = $("verify-channel");
    if (!vch) return false;
    var parent = vch.closest(".card") || vch.closest(".form-card") || vch.parentElement;
    if (!parent) return false;
    var div = document.createElement("div");
    div.className = "input-group";
    div.style.marginTop = "0.75rem";
    div.innerHTML =
      '<label>Newly-verified monitor (minutes)</label>' +
      '<input type="number" id="verify-monitor-mins" min="0" max="10080" value="30">' +
      '<p class="form-hint">Higher Automod scrutiny for this many minutes after verify. Invisible to members.</p>';
    parent.appendChild(div);
    return true;
  }

  function fillSelects() {
    fillRoleSelect($("sec-high-staff-role"), "None");
    fillChannelSelect($("sec-security-log"), "Use Automod log channel");
  }

  function applyFromConfig() {
    injectSecurityBlock();
    injectVerifyMonitor();
    fillSelects();
    var c = window.currentConfig || {};
    try {
      if (!c.automod && typeof currentConfig !== "undefined" && currentConfig) c = currentConfig;
    } catch (_) {}
    var am = c.automod || {};
    var v = c.verification || {};

    if ($("sec-use-classifier")) $("sec-use-classifier").checked = am.useSecurityClassifier !== false;
    if ($("sec-block-auto-ban")) $("sec-block-auto-ban").checked = am.blockAutoBanOnAi !== false;
    if ($("sec-high-staff-role"))
      $("sec-high-staff-role").value = am.highStaffRoleId || am.securityAlertRoleId || "";
    if ($("sec-security-log")) $("sec-security-log").value = am.securityLogChannelId || "";
    if ($("sec-malicious-threshold"))
      $("sec-malicious-threshold").value =
        am.maliciousConfidenceThreshold != null ? am.maliciousConfidenceThreshold : 0.75;
    if ($("sec-timeout-duration"))
      $("sec-timeout-duration").value = am.maliciousTimeoutDuration || "1h";
    if ($("sec-cleanup-minutes")) {
      var ms = Number(am.cleanupMessageWindowMs);
      $("sec-cleanup-minutes").value = ms > 0 ? Math.round(ms / 60000) : 15;
    }
    var mon =
      am.newlyVerifiedMonitorMinutes != null
        ? am.newlyVerifiedMonitorMinutes
        : v.newlyVerifiedMonitorMinutes != null
          ? v.newlyVerifiedMonitorMinutes
          : 30;
    if ($("sec-newly-verified-mins")) $("sec-newly-verified-mins").value = mon;
    if ($("verify-monitor-mins")) $("verify-monitor-mins").value = mon;
  }

  function setStatus(text, ok) {
    var el = $("security-status");
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  function readTimeoutDuration() {
    var el = $("sec-timeout-duration");
    if (!el) return "1h";
    var v = el.value;
    if (v == null) return "1h";
    v = String(v).trim();
    return v || "1h";
  }

  async function saveSecurity() {
    try {
      setStatus("Saving…", true);
      if (!getSelectedGuildId()) {
        throw new Error("Select a server first (choose a guild at the top of the dashboard).");
      }

      var threshold = Number($("sec-malicious-threshold") && $("sec-malicious-threshold").value);
      if (Number.isNaN(threshold)) threshold = 0.75;
      threshold = Math.min(1, Math.max(0.5, threshold));
      var cleanupMins = Number($("sec-cleanup-minutes") && $("sec-cleanup-minutes").value);
      if (Number.isNaN(cleanupMins) || cleanupMins < 1) cleanupMins = 15;
      var monRaw =
        ($("sec-newly-verified-mins") && $("sec-newly-verified-mins").value) ||
        ($("verify-monitor-mins") && $("verify-monitor-mins").value);
      var monMins = Number(monRaw);
      if (Number.isNaN(monMins) || monMins < 0) monMins = 30;

      var highStaff =
        $("sec-high-staff-role") && $("sec-high-staff-role").value
          ? String($("sec-high-staff-role").value)
          : null;
      var secLog =
        $("sec-security-log") && $("sec-security-log").value
          ? String($("sec-security-log").value)
          : null;

      var payload = {
        automod: {
          useSecurityClassifier: $("sec-use-classifier") ? $("sec-use-classifier").checked : true,
          blockAutoBanOnAi: $("sec-block-auto-ban") ? $("sec-block-auto-ban").checked : true,
          highStaffRoleId: highStaff,
          securityAlertRoleId: highStaff,
          securityLogChannelId: secLog,
          maliciousConfidenceThreshold: threshold,
          maliciousTimeoutDuration: readTimeoutDuration(),
          cleanupMessageWindowMs: cleanupMins * 60 * 1000,
          newlyVerifiedMonitorMinutes: monMins,
        },
        verification: {
          newlyVerifiedMonitorMinutes: monMins,
        },
      };

      var d = await saveConfigSafe(payload);
      var msg = "✅ Security settings saved.";
      if (d && d.savedToBot === false) {
        msg =
          "✅ Saved on website. Bot did not sync — redeploy Railway or check DASHBOARD_API_SECRET.";
      }
      if (d && d.warning) msg = "⚠️ " + d.warning;
      setStatus(msg, !(d && d.savedToBot === false && !d.warning));
      if (d && d.savedToBot === false) setStatus(msg, true);

      if (typeof window.loadGuildData === "function") {
        try {
          await window.loadGuildData();
        } catch (_) {}
      }
      applyFromConfig();
    } catch (e) {
      console.error("[security-ui] save:", e);
      setStatus("❌ " + (e && e.message ? e.message : "Failed"), false);
    }
  }

  function wire() {
    var btn = $("save-security");
    if (btn && !btn.__secBound) {
      btn.__secBound = 1;
      btn.addEventListener("click", function (ev) {
        if (ev && ev.preventDefault) ev.preventDefault();
        saveSecurity();
      });
    }
  }

  function boot() {
    try {
      injectSecurityBlock();
      injectVerifyMonitor();
      applyFromConfig();
      wire();
    } catch (e) {
      console.error("[security-ui]", e);
    }
  }

  var origLoad = window.loadGuildData;
  if (typeof origLoad === "function" && !window.__secLoadWrapped) {
    window.__secLoadWrapped = true;
    window.loadGuildData = async function () {
      var r = await origLoad.apply(this, arguments);
      try {
        applyFromConfig();
        wire();
      } catch (_) {}
      return r;
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(boot, 500);
      setTimeout(boot, 1500);
      setTimeout(boot, 4000);
    });
  } else {
    setTimeout(boot, 500);
    setTimeout(boot, 1500);
    setTimeout(boot, 4000);
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-tab="automod"]');
      if (t) setTimeout(boot, 150);
    },
    true
  );

  console.log("[dashboard] security upgrade UI v2 loaded");
})();
