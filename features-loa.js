/**
 * LOA tab — nav item + page section matching other feature cards.
 */
(function () {
  "use strict";
  if (window.__loaTabV2) return;
  window.__loaTabV2 = true;

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

  function ensureNavItem(tab, icon, label, title) {
    var nav = document.querySelector(".navigation");
    if (!nav) return false;
    if (nav.querySelector('[data-tab="' + tab + '"]')) return true;
    var settingsBtn = nav.querySelector('[data-tab="settings"]');
    var btn = document.createElement("button");
    btn.className = "nav-item";
    btn.type = "button";
    btn.setAttribute("data-tab", tab);
    btn.title = title || label;
    btn.innerHTML = "<span>" + icon + "</span><em>" + label + "</em>";
    btn.addEventListener("click", function () {
      if (typeof window.showSection === "function") window.showSection(tab);
      else {
        document.querySelectorAll(".page-section").forEach(function (el) {
          el.classList.remove("active");
        });
        var sec = document.getElementById(tab);
        if (sec) sec.classList.add("active");
        document.querySelectorAll(".nav-item").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-tab") === tab);
        });
      }
    });
    if (settingsBtn) nav.insertBefore(btn, settingsBtn);
    else nav.appendChild(btn);
    return true;
  }

  function ensureSection() {
    // Remove old floating panel if present
    var old = $("loa-panel");
    if (old) old.remove();

    if ($("loa")) return true;
    var content = document.querySelector(".content");
    if (!content) return false;

    var section = document.createElement("section");
    section.id = "loa";
    section.className = "page-section";
    section.innerHTML =
      '<div class="card form-card wide">' +
      '<span class="eyebrow">LOA</span>' +
      "<h2>Leave of Absence</h2>" +
      '<p class="form-hint">Staff request time away so the team knows who is unavailable. Managers review normal requests; unanswered requests auto-approve. Emergency LOA is instant. Staff on active LOA are skipped by Activity Checks.</p>' +
      '<label class="toggle"><input type="checkbox" id="loa-enabled" checked> <span>LOA system enabled</span></label>' +
      '<label class="toggle"><input type="checkbox" id="loa-emergency" checked> <span>Allow /loa emergency</span></label>' +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Auto-approve after (hours)</label><input type="number" id="loa-auto-hours" min="1" max="168" value="24"></div>' +
      '<div class="input-group"><label>Review channel</label><select id="loa-review-channel"><option value="">Select a channel…</option></select></div>' +
      '<div class="input-group"><label>Log channel</label><select id="loa-log-channel"><option value="">None</option></select></div>' +
      '<div class="input-group"><label>On Leave role</label><select id="loa-onleave-role"><option value="">None</option></select></div>' +
      "</div>" +
      '<h3 class="subhead">Staff roles (who can request LOA)</h3>' +
      '<div class="level-role-form">' +
      '<div class="input-group"><label>Role</label><select id="loa-staff-role"><option value="">Select a role…</option></select></div>' +
      '<button class="button" type="button" id="loa-add-staff">Add staff role</button>' +
      "</div>" +
      '<div id="loa-staff-list" class="level-roles-list"></div>' +
      '<h3 class="subhead">Manager roles (approve / deny / list others)</h3>' +
      '<div class="level-role-form">' +
      '<div class="input-group"><label>Role</label><select id="loa-manager-role"><option value="">Select a role…</option></select></div>' +
      '<button class="button" type="button" id="loa-add-manager">Add manager role</button>' +
      "</div>" +
      '<div id="loa-manager-list" class="level-roles-list"></div>' +
      '<button class="button" type="button" id="loa-save" style="margin-top:1rem">Save LOA Settings</button>' +
      '<p class="form-hint" id="loa-status"></p>' +
      '<p class="form-hint">Discord: <code>/loa request</code> · <code>/loa emergency</code> · <code>/loa list</code> · <code>/help system:loa</code></p>' +
      "</div>";
    content.appendChild(section);
    return true;
  }

  function fillSelect(el, items, placeholder, isRole, allowNone) {
    if (!el) return;
    var cur = el.value;
    var none = allowNone ? (isRole ? "None" : "None") : placeholder || "Select…";
    el.innerHTML = '<option value="">' + none + "</option>";
    (items || []).forEach(function (it) {
      var o = document.createElement("option");
      o.value = it.id;
      o.textContent = isRole ? it.name || it.id : "#" + (it.name || it.id);
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }

  function fillSelects() {
    var ch = getChannels().filter(function (c) {
      return c && (c.type === 0 || c.type === 5 || c.type == null || c.type === "GUILD_TEXT");
    });
    var rl = getRoles();
    fillSelect($("loa-review-channel"), ch, "Select a channel…", false, false);
    fillSelect($("loa-log-channel"), ch, "None", false, true);
    fillSelect($("loa-onleave-role"), rl, "None", true, true);
    fillSelect($("loa-staff-role"), rl, "Select a role…", true, false);
    fillSelect($("loa-manager-role"), rl, "Select a role…", true, false);
  }

  function renderRoleList(listId, ids, removeAttr) {
    var list = $(listId);
    if (!list) return;
    ids = ids || [];
    var rl = getRoles();
    if (!ids.length) {
      list.innerHTML = '<p class="form-hint">None yet.</p>';
      return;
    }
    list.innerHTML = ids
      .map(function (rid) {
        var r = rl.find(function (x) {
          return String(x.id) === String(rid);
        });
        return (
          '<div class="level-role-row">' +
          (r ? r.name : rid) +
          ' <button type="button" data-' +
          removeAttr +
          '="' +
          rid +
          '">Remove</button></div>'
        );
      })
      .join("");
  }

  function apply() {
    var cfg = (window.currentConfig && window.currentConfig.loa) || {};
    if ($("loa-enabled")) $("loa-enabled").checked = cfg.enabled !== false;
    if ($("loa-emergency")) $("loa-emergency").checked = cfg.emergencyEnabled !== false;
    if ($("loa-auto-hours"))
      $("loa-auto-hours").value = cfg.autoApproveHours != null ? cfg.autoApproveHours : 24;

    fillSelects();
    if ($("loa-review-channel") && cfg.reviewChannelId)
      $("loa-review-channel").value = cfg.reviewChannelId;
    if ($("loa-log-channel") && cfg.logChannelId) $("loa-log-channel").value = cfg.logChannelId;
    if ($("loa-onleave-role") && cfg.onLeaveRoleId)
      $("loa-onleave-role").value = cfg.onLeaveRoleId;

    renderRoleList("loa-staff-list", cfg.staffRoleIds || [], "rm-loa-staff");
    renderRoleList("loa-manager-list", cfg.managerRoleIds || [], "rm-loa-mgr");

    var list = $("loa-staff-list");
    if (list) {
      list.querySelectorAll("[data-rm-loa-staff]").forEach(function (btn) {
        btn.onclick = async function () {
          var rid = btn.getAttribute("data-rm-loa-staff");
          var cur = ((window.currentConfig || {}).loa || {}).staffRoleIds || [];
          var next = cur.filter(function (x) {
            return String(x) !== String(rid);
          });
          try {
            await window.saveConfig({ loa: { staffRoleIds: next } });
            if (window.loadGuildData) await window.loadGuildData();
            else apply();
          } catch (e) {
            alert(e.message || "Failed");
          }
        };
      });
    }
    list = $("loa-manager-list");
    if (list) {
      list.querySelectorAll("[data-rm-loa-mgr]").forEach(function (btn) {
        btn.onclick = async function () {
          var rid = btn.getAttribute("data-rm-loa-mgr");
          var cur = ((window.currentConfig || {}).loa || {}).managerRoleIds || [];
          var next = cur.filter(function (x) {
            return String(x) !== String(rid);
          });
          try {
            await window.saveConfig({ loa: { managerRoleIds: next } });
            if (window.loadGuildData) await window.loadGuildData();
            else apply();
          } catch (e) {
            alert(e.message || "Failed");
          }
        };
      });
    }
  }

  function setStatus(msg, ok) {
    var el = $("loa-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  async function save() {
    try {
      setStatus("Saving…", true);
      var cur = (window.currentConfig && window.currentConfig.loa) || {};
      var d = await window.saveConfig({
        loa: {
          enabled: $("loa-enabled") ? $("loa-enabled").checked : true,
          emergencyEnabled: $("loa-emergency") ? $("loa-emergency").checked : true,
          autoApproveHours: Number(($("loa-auto-hours") && $("loa-auto-hours").value) || 24),
          reviewChannelId: ($("loa-review-channel") && $("loa-review-channel").value) || null,
          logChannelId: ($("loa-log-channel") && $("loa-log-channel").value) || null,
          onLeaveRoleId: ($("loa-onleave-role") && $("loa-onleave-role").value) || null,
          staffRoleIds: Array.isArray(cur.staffRoleIds) ? cur.staffRoleIds : [],
          managerRoleIds: Array.isArray(cur.managerRoleIds) ? cur.managerRoleIds : [],
        },
      });
      setStatus(
        d && d.savedToBot === false
          ? "Saved on website. Bot did not sync — check Railway."
          : "✅ LOA settings saved.",
        true
      );
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
    } catch (e) {
      setStatus("❌ " + (e.message || "Failed"), false);
    }
  }

  async function addStaff() {
    var rid = $("loa-staff-role") && $("loa-staff-role").value;
    if (!rid) return alert("Pick a staff role");
    var cur = ((window.currentConfig || {}).loa || {}).staffRoleIds || [];
    if (cur.map(String).indexOf(String(rid)) >= 0) return setStatus("Already added.", false);
    try {
      await window.saveConfig({ loa: { staffRoleIds: cur.concat([rid]) } });
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
      setStatus("✅ Staff role added.", true);
    } catch (e) {
      setStatus("❌ " + (e.message || "Failed"), false);
    }
  }

  async function addManager() {
    var rid = $("loa-manager-role") && $("loa-manager-role").value;
    if (!rid) return alert("Pick a manager role");
    var cur = ((window.currentConfig || {}).loa || {}).managerRoleIds || [];
    if (cur.map(String).indexOf(String(rid)) >= 0) return setStatus("Already added.", false);
    try {
      await window.saveConfig({ loa: { managerRoleIds: cur.concat([rid]) } });
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
      setStatus("✅ Manager role added.", true);
    } catch (e) {
      setStatus("❌ " + (e.message || "Failed"), false);
    }
  }

  function wire() {
    function bind(id, fn) {
      var el = $(id);
      if (el && !el.__loaBound) {
        el.__loaBound = 1;
        el.addEventListener("click", function (e) {
          e.preventDefault();
          fn();
        });
      }
    }
    bind("loa-save", save);
    bind("loa-add-staff", addStaff);
    bind("loa-add-manager", addManager);
  }

  var n = 0;
  function boot() {
    n++;
    ensureNavItem("loa", "📋", "LOA", "Leave of Absence");
    ensureSection();
    wire();
    apply();
    if (n < 60) setTimeout(boot, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  var orig = window.loadGuildData;
  if (typeof orig === "function" && !orig.__loaWrapped) {
    window.loadGuildData = async function () {
      var r = await orig.apply(this, arguments);
      try {
        apply();
      } catch (_) {}
      return r;
    };
    window.loadGuildData.__loaWrapped = true;
  }

  console.log("[features-loa] v2 tab");
})();
