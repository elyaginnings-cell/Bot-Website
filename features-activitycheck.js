/**
 * Activity Check tab — nav item + page section matching other feature cards.
 */
(function () {
  "use strict";
  if (window.__acTabV2) return;
  window.__acTabV2 = true;

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
    var old = $("ac-panel");
    if (old) old.remove();

    if ($("activitycheck")) return true;
    var content = document.querySelector(".content");
    if (!content) return false;

    var section = document.createElement("section");
    section.id = "activitycheck";
    section.className = "page-section";
    section.innerHTML =
      '<div class="card form-card wide">' +
      '<span class="eyebrow">ACTIVITY CHECK</span>' +
      "<h2>Staff Activity Check</h2>" +
      '<p class="form-hint">Ask staff to confirm they are available right now — not message tracking. Staff press <strong>I’m Active</strong>. People on an active LOA are automatically exempt.</p>' +
      '<label class="toggle"><input type="checkbox" id="ac-enabled" checked> <span>Activity Check enabled</span></label>' +
      '<label class="toggle"><input type="checkbox" id="ac-show-confirmed" checked> <span>Show confirmed names on the live embed</span></label>' +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Default duration</label>' +
      '<select id="ac-duration">' +
      '<option value="5">5 minutes</option>' +
      '<option value="10">10 minutes</option>' +
      '<option value="15" selected>15 minutes</option>' +
      '<option value="30">30 minutes</option>' +
      '<option value="60">1 hour</option>' +
      "</select></div>" +
      '<div class="input-group"><label>Channel</label><select id="ac-channel"><option value="">Select a channel…</option></select></div>' +
      '<div class="input-group"><label>Manager role (start / end + completion ping)</label><select id="ac-manager-role"><option value="">None (Admin / Manage Server)</option></select></div>' +
      "</div>" +
      '<h3 class="subhead">Staff roles (who must respond)</h3>' +
      '<div class="level-role-form">' +
      '<div class="input-group"><label>Role</label><select id="ac-staff-role"><option value="">Select a role…</option></select></div>' +
      '<button class="button" type="button" id="ac-add-staff">Add staff role</button>' +
      "</div>" +
      '<div id="ac-staff-list" class="level-roles-list"></div>' +
      '<button class="button" type="button" id="ac-save" style="margin-top:1rem">Save Activity Check Settings</button>' +
      '<p class="form-hint" id="ac-status"></p>' +
      '<p class="form-hint">Discord: <code>/activitycheck start</code> · <code>/activitycheck end</code> · <code>/activitycheck status</code></p>' +
      "</div>";
    content.appendChild(section);
    return true;
  }

  function fillSelect(el, items, placeholder, isRole, allowNone) {
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

  function fillSelects() {
    var ch = getChannels().filter(function (c) {
      return c && (c.type === 0 || c.type === 5 || c.type == null || c.type === "GUILD_TEXT");
    });
    var rl = getRoles();
    fillSelect($("ac-channel"), ch, "Select a channel…", false);
    fillSelect($("ac-manager-role"), rl, "None (Admin / Manage Server)", true);
    fillSelect($("ac-staff-role"), rl, "Select a role…", true);
  }

  function renderStaffList(ids) {
    var list = $("ac-staff-list");
    if (!list) return;
    ids = ids || [];
    var rl = getRoles();
    if (!ids.length) {
      list.innerHTML = '<p class="form-hint">No staff roles yet — add at least one.</p>';
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
          ' <button type="button" data-rm-ac-staff="' +
          rid +
          '">Remove</button></div>'
        );
      })
      .join("");
    list.querySelectorAll("[data-rm-ac-staff]").forEach(function (btn) {
      btn.onclick = async function () {
        var rid = btn.getAttribute("data-rm-ac-staff");
        var cur = ((window.currentConfig || {}).activityCheck || {}).staffRoleIds || [];
        var next = cur.filter(function (x) {
          return String(x) !== String(rid);
        });
        try {
          await window.saveConfig({ activityCheck: { staffRoleIds: next } });
          if (window.loadGuildData) await window.loadGuildData();
          else apply();
        } catch (e) {
          alert(e.message || "Failed");
        }
      };
    });
  }

  function apply() {
    var cfg = (window.currentConfig && window.currentConfig.activityCheck) || {};
    if ($("ac-enabled")) $("ac-enabled").checked = cfg.enabled !== false;
    if ($("ac-show-confirmed"))
      $("ac-show-confirmed").checked = cfg.showConfirmedInLive !== false;
    if ($("ac-duration"))
      $("ac-duration").value = String(cfg.durationMinutes != null ? cfg.durationMinutes : 15);

    fillSelects();
    if ($("ac-channel") && cfg.channelId) $("ac-channel").value = cfg.channelId;
    if ($("ac-manager-role") && cfg.managerRoleId)
      $("ac-manager-role").value = cfg.managerRoleId;

    renderStaffList(cfg.staffRoleIds || []);
  }

  function setStatus(msg, ok) {
    var el = $("ac-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  async function save() {
    try {
      setStatus("Saving…", true);
      var cur = (window.currentConfig && window.currentConfig.activityCheck) || {};
      var d = await window.saveConfig({
        activityCheck: {
          enabled: $("ac-enabled") ? $("ac-enabled").checked : true,
          showConfirmedInLive: $("ac-show-confirmed") ? $("ac-show-confirmed").checked : true,
          durationMinutes: Number(($("ac-duration") && $("ac-duration").value) || 15),
          channelId: ($("ac-channel") && $("ac-channel").value) || null,
          managerRoleId: ($("ac-manager-role") && $("ac-manager-role").value) || null,
          staffRoleIds: Array.isArray(cur.staffRoleIds) ? cur.staffRoleIds : [],
        },
      });
      setStatus(
        d && d.savedToBot === false
          ? "Saved on website. Bot did not sync — check Railway."
          : "✅ Activity Check settings saved.",
        true
      );
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
    } catch (e) {
      setStatus("❌ " + (e.message || "Failed"), false);
    }
  }

  async function addStaff() {
    var rid = $("ac-staff-role") && $("ac-staff-role").value;
    if (!rid) return alert("Pick a staff role");
    var cur = ((window.currentConfig || {}).activityCheck || {}).staffRoleIds || [];
    if (cur.map(String).indexOf(String(rid)) >= 0) return setStatus("Already added.", false);
    try {
      await window.saveConfig({ activityCheck: { staffRoleIds: cur.concat([rid]) } });
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
      setStatus("✅ Staff role added.", true);
    } catch (e) {
      setStatus("❌ " + (e.message || "Failed"), false);
    }
  }

  function wire() {
    function bind(id, fn) {
      var el = $(id);
      if (el && !el.__acBound) {
        el.__acBound = 1;
        el.addEventListener("click", function (e) {
          e.preventDefault();
          fn();
        });
      }
    }
    bind("ac-save", save);
    bind("ac-add-staff", addStaff);
  }

  var n = 0;
  function boot() {
    n++;
    ensureNavItem("activitycheck", "☕", "Active", "Staff Activity Check");
    ensureSection();
    wire();
    apply();
    if (n < 60) setTimeout(boot, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  var orig = window.loadGuildData;
  if (typeof orig === "function" && !orig.__acWrapped) {
    window.loadGuildData = async function () {
      var r = await orig.apply(this, arguments);
      try {
        apply();
      } catch (_) {}
      return r;
    };
    window.loadGuildData.__acWrapped = true;
  }

  console.log("[features-activitycheck] v2 tab");
})();
