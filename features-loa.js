/**
 * LOA (Leave of Absence) config panel for the Coffee Shop dashboard.
 * Saves via window.saveConfig({ loa: {...} }) same as other features.
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

  function fillLoaSelects() {
    fillSelect($("loa-review-channel"), getChannels(), "Review channel…", false);
    fillSelect($("loa-log-channel"), getChannels(), "Log channel…", false);
    fillSelect($("loa-staff-role"), getRoles(), "Staff role…", true);
    fillSelect($("loa-manager-role"), getRoles(), "Manager role…", true);
    fillSelect($("loa-onleave-role"), getRoles(), "On Leave role…", true);
  }

  function applyLoaConfig() {
    var cfg = (window.currentConfig && window.currentConfig.loa) || {};
    if ($("loa-enabled")) $("loa-enabled").checked = cfg.enabled !== false;
    if ($("loa-emergency")) $("loa-emergency").checked = cfg.emergencyEnabled !== false;
    if ($("loa-auto-hours")) $("loa-auto-hours").value = cfg.autoApproveHours != null ? cfg.autoApproveHours : 24;
    if ($("loa-review-channel") && cfg.reviewChannelId) $("loa-review-channel").value = cfg.reviewChannelId;
    if ($("loa-log-channel") && cfg.logChannelId) $("loa-log-channel").value = cfg.logChannelId;
    if ($("loa-onleave-role") && cfg.onLeaveRoleId) $("loa-onleave-role").value = cfg.onLeaveRoleId;

    var staffList = $("loa-staff-list");
    if (staffList) {
      var ids = cfg.staffRoleIds || [];
      staffList.textContent = ids.length
        ? ids.map(function (id) {
            var r = getRoles().find(function (x) {
              return String(x.id) === String(id);
            });
            return r ? r.name : id;
          }).join(", ")
        : "None (admins only)";
    }
    var mgrList = $("loa-manager-list");
    if (mgrList) {
      var mids = cfg.managerRoleIds || [];
      mgrList.textContent = mids.length
        ? mids.map(function (id) {
            var r = getRoles().find(function (x) {
              return String(x.id) === String(id);
            });
            return r ? r.name : id;
          }).join(", ")
        : "None (admins / Manage Server)";
    }
  }

  async function saveLoa() {
    var status = $("loa-status");
    try {
      if (status) {
        status.textContent = "Saving…";
        status.style.color = "";
      }
      var cur = (window.currentConfig && window.currentConfig.loa) || {};
      var staffIds = Array.isArray(cur.staffRoleIds) ? cur.staffRoleIds.slice() : [];
      var mgrIds = Array.isArray(cur.managerRoleIds) ? cur.managerRoleIds.slice() : [];
      var staffAdd = $("loa-staff-role") && $("loa-staff-role").value;
      var mgrAdd = $("loa-manager-role") && $("loa-manager-role").value;
      if (staffAdd && staffIds.indexOf(staffAdd) < 0) staffIds.push(staffAdd);
      if (mgrAdd && mgrIds.indexOf(mgrAdd) < 0) mgrIds.push(mgrAdd);

      var payload = {
        loa: {
          enabled: $("loa-enabled") ? $("loa-enabled").checked : true,
          emergencyEnabled: $("loa-emergency") ? $("loa-emergency").checked : true,
          autoApproveHours: Number(($("loa-auto-hours") && $("loa-auto-hours").value) || 24),
          reviewChannelId: ($("loa-review-channel") && $("loa-review-channel").value) || null,
          logChannelId: ($("loa-log-channel") && $("loa-log-channel").value) || null,
          onLeaveRoleId: ($("loa-onleave-role") && $("loa-onleave-role").value) || null,
          staffRoleIds: staffIds,
          managerRoleIds: mgrIds,
        },
      };

      if ($("loa-clear-staff") && $("loa-clear-staff").checked) {
        payload.loa.staffRoleIds = [];
        payload.loa.clearStaffRoles = true;
      }
      if ($("loa-clear-manager") && $("loa-clear-manager").checked) {
        payload.loa.managerRoleIds = [];
        payload.loa.clearManagerRoles = true;
      }

      var data = await window.saveConfig(payload);
      if (status) {
        status.textContent = data && data.savedToBot === false
          ? "Saved on website. Bot did not sync — check Railway."
          : "✅ LOA settings saved.";
        status.style.color = "#4ade80";
      }
      if (typeof window.loadGuildData === "function") await window.loadGuildData();
      else applyLoaConfig();
    } catch (e) {
      if (status) {
        status.textContent = "❌ " + (e.message || "Failed");
        status.style.color = "#f87171";
      }
    }
  }

  function ensurePanel() {
    if ($("loa-panel")) return;
    var host =
      $("features-panels") ||
      $("features-root") ||
      document.querySelector("[data-feature-panels]") ||
      document.querySelector("main");
    if (!host) return;

    var section = document.createElement("section");
    section.id = "loa-panel";
    section.className = "feature-panel";
    section.innerHTML =
      '<h2>📋 Leave of Absence (LOA)</h2>' +
      '<p class="form-hint">Staff can request time away. Managers review normal requests; unanswered requests auto-approve. Emergency LOA is instant.</p>' +
      '<label><input type="checkbox" id="loa-enabled" checked /> LOA system enabled</label><br/>' +
      '<label><input type="checkbox" id="loa-emergency" checked /> Allow /loa emergency</label><br/>' +
      '<label>Auto-approve after (hours) <input type="number" id="loa-auto-hours" min="1" max="168" value="24" /></label><br/>' +
      '<label>Review channel <select id="loa-review-channel"></select></label><br/>' +
      '<label>Log channel <select id="loa-log-channel"></select></label><br/>' +
      '<label>On Leave role <select id="loa-onleave-role"></select></label><br/>' +
      '<label>Add staff role <select id="loa-staff-role"></select></label> ' +
      '<span class="form-hint">Current: <span id="loa-staff-list">—</span></span><br/>' +
      '<label><input type="checkbox" id="loa-clear-staff" /> Clear staff roles</label><br/>' +
      '<label>Add manager role <select id="loa-manager-role"></select></label> ' +
      '<span class="form-hint">Current: <span id="loa-manager-list">—</span></span><br/>' +
      '<label><input type="checkbox" id="loa-clear-manager" /> Clear manager roles</label><br/>' +
      '<button type="button" id="loa-save" class="btn primary">Save LOA settings</button> ' +
      '<span id="loa-status" class="form-hint"></span>';

    host.appendChild(section);
    var btn = $("loa-save");
    if (btn) btn.addEventListener("click", saveLoa);
  }

  function boot() {
    ensurePanel();
    fillLoaSelects();
    applyLoaConfig();
  }

  window.applyLoaConfig = applyLoaConfig;
  window.fillLoaSelects = fillLoaSelects;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    setTimeout(boot, 500);
  }
  // Re-apply when guild data loads
  var orig = window.loadGuildData;
  if (typeof orig === "function") {
    window.loadGuildData = async function () {
      var r = await orig.apply(this, arguments);
      try {
        fillLoaSelects();
        applyLoaConfig();
      } catch (_) {}
      return r;
    };
  }
})();
