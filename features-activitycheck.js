/**
 * Staff Activity Check config panel for the Coffee Shop dashboard.
 * Saves via window.saveConfig({ activityCheck: {...} }).
 */
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function getChannels() {
    try {
      if (typeof window.channelsCache !== "undefined" && Array.isArray(window.channelsCache))
        return window.channelsCache;
    } catch (_) {}
    return [];
  }

  function getRoles() {
    try {
      if (typeof window.rolesCache !== "undefined" && Array.isArray(window.rolesCache))
        return window.rolesCache;
    } catch (_) {}
    return [];
  }

  function fillSelect(el, items, placeholder, isRole) {
    if (!el) return;
    var cur = el.value;
    el.innerHTML = '<option value="">' + (placeholder || "Select…") + "</option>";
    (items || []).forEach(function (it) {
      var o = document.createElement("option");
      o.value = it.id;
      o.textContent = isRole ? it.name || it.id : "#" + (it.name || it.id);
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }

  function fillAcSelects() {
    fillSelect($("ac-channel"), getChannels(), "Activity-check channel…", false);
    fillSelect($("ac-staff-role"), getRoles(), "Staff role…", true);
    fillSelect($("ac-manager-role"), getRoles(), "Manager role…", true);
  }

  function applyAcConfig() {
    var cfg = (window.currentConfig && window.currentConfig.activityCheck) || {};
    if ($("ac-enabled")) $("ac-enabled").checked = cfg.enabled !== false;
    if ($("ac-show-confirmed")) $("ac-show-confirmed").checked = cfg.showConfirmedInLive !== false;
    if ($("ac-duration")) $("ac-duration").value = String(cfg.durationMinutes != null ? cfg.durationMinutes : 15);
    if ($("ac-channel") && cfg.channelId) $("ac-channel").value = cfg.channelId;
    if ($("ac-manager-role") && cfg.managerRoleId) $("ac-manager-role").value = cfg.managerRoleId;

    var staffList = $("ac-staff-list");
    if (staffList) {
      var ids = cfg.staffRoleIds || [];
      staffList.textContent = ids.length
        ? ids
            .map(function (id) {
              var r = getRoles().find(function (x) {
                return String(x.id) === String(id);
              });
              return r ? r.name : id;
            })
            .join(", ")
        : "None — set at least one staff role";
    }
  }

  async function saveAc() {
    var status = $("ac-status");
    try {
      if (status) {
        status.textContent = "Saving…";
        status.style.color = "";
      }
      var cur = (window.currentConfig && window.currentConfig.activityCheck) || {};
      var staffIds = Array.isArray(cur.staffRoleIds) ? cur.staffRoleIds.slice() : [];
      var staffAdd = $("ac-staff-role") && $("ac-staff-role").value;
      if (staffAdd && staffIds.indexOf(staffAdd) < 0) staffIds.push(staffAdd);

      var payload = {
        activityCheck: {
          enabled: $("ac-enabled") ? $("ac-enabled").checked : true,
          showConfirmedInLive: $("ac-show-confirmed") ? $("ac-show-confirmed").checked : true,
          durationMinutes: Number(($("ac-duration") && $("ac-duration").value) || 15),
          channelId: ($("ac-channel") && $("ac-channel").value) || null,
          managerRoleId: ($("ac-manager-role") && $("ac-manager-role").value) || null,
          staffRoleIds: staffIds,
        },
      };

      if ($("ac-clear-staff") && $("ac-clear-staff").checked) {
        payload.activityCheck.staffRoleIds = [];
        payload.activityCheck.clearStaffRoles = true;
      }

      var data = await window.saveConfig(payload);
      if (status) {
        status.textContent =
          data && data.savedToBot === false
            ? "Saved on website. Bot did not sync — check Railway."
            : "✅ Activity Check settings saved.";
        status.style.color = "#4ade80";
      }
      if (typeof window.loadGuildData === "function") await window.loadGuildData();
      else applyAcConfig();
    } catch (e) {
      if (status) {
        status.textContent = "❌ " + (e.message || "Failed");
        status.style.color = "#f87171";
      }
    }
  }

  function ensurePanel() {
    if ($("ac-panel")) return;
    var host =
      $("features-panels") ||
      $("features-root") ||
      document.querySelector("[data-feature-panels]") ||
      document.querySelector("main");
    if (!host) return;

    var section = document.createElement("section");
    section.id = "ac-panel";
    section.className = "feature-panel";
    section.innerHTML =
      '<h2>☕ Staff Activity Check</h2>' +
      '<p class="form-hint">Ask staff to confirm they are available right now. Not message tracking — just a button. Staff on active LOA are automatically exempt.</p>' +
      '<label><input type="checkbox" id="ac-enabled" checked /> Activity Check enabled</label><br/>' +
      '<label><input type="checkbox" id="ac-show-confirmed" checked /> Show confirmed names on the live embed</label><br/>' +
      '<label>Default duration ' +
      '<select id="ac-duration">' +
      '<option value="5">5 minutes</option>' +
      '<option value="10">10 minutes</option>' +
      '<option value="15" selected>15 minutes</option>' +
      '<option value="30">30 minutes</option>' +
      '<option value="60">1 hour</option>' +
      "</select></label><br/>" +
      '<label>Channel <select id="ac-channel"></select></label><br/>' +
      '<label>Manager role (start/end + completion ping) <select id="ac-manager-role"></select></label><br/>' +
      '<label>Add staff role <select id="ac-staff-role"></select></label> ' +
      '<span class="form-hint">Current: <span id="ac-staff-list">—</span></span><br/>' +
      '<label><input type="checkbox" id="ac-clear-staff" /> Clear staff roles</label><br/>' +
      '<button type="button" id="ac-save" class="btn primary">Save Activity Check settings</button> ' +
      '<span id="ac-status" class="form-hint"></span>' +
      '<p class="form-hint" style="margin-top:0.75rem">In Discord: <code>/activitycheck start</code> · <code>/activitycheck end</code> · <code>/activitycheck status</code></p>';

    host.appendChild(section);
    var btn = $("ac-save");
    if (btn) btn.addEventListener("click", saveAc);
  }

  function boot() {
    ensurePanel();
    fillAcSelects();
    applyAcConfig();
  }

  window.applyAcConfig = applyAcConfig;
  window.fillAcSelects = fillAcSelects;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    setTimeout(boot, 500);
  }

  var orig = window.loadGuildData;
  if (typeof orig === "function") {
    window.loadGuildData = async function () {
      var r = await orig.apply(this, arguments);
      try {
        fillAcSelects();
        applyAcConfig();
      } catch (_) {}
      return r;
    };
  }
})();
