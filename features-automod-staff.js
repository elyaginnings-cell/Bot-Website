/**
 * Automod (AI) + AI Staff panels — channel/role dropdowns, no raw ID fields.
 */
(function () {
  "use strict";
  if (window.__featuresAutomodStaffV2) return;
  window.__featuresAutomodStaffV2 = true;

  function $(id) {
    return document.getElementById(id);
  }

  function channels() {
    try {
      if (window.channelsCache && window.channelsCache.length) return window.channelsCache;
    } catch (_) {}
    return [];
  }
  function roles() {
    try {
      if (window.rolesCache && window.rolesCache.length) return window.rolesCache;
    } catch (_) {}
    return [];
  }

  function textChannels() {
    return channels().filter(function (c) {
      return c && (c.type === 0 || c.type === 5 || c.type == null || c.type === "GUILD_TEXT");
    });
  }

  function fillChannelSelect(sel, includeNone) {
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = includeNone !== false ? '<option value="">None</option>' : "";
    textChannels().forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = "#" + (c.name || c.id);
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }

  function fillRoleSelect(sel, includeNone) {
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = includeNone !== false ? '<option value="">Select a role…</option>' : "";
    roles().forEach(function (r) {
      if (!r || r.name === "@everyone") return;
      var o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.name || r.id;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }

  function panelHtml() {
    return [
      '<section class="feature-card" id="panel-automod" style="margin-top:1rem">',
      "  <h2>🛡️ AI Automod</h2>",
      '  <p class="form-hint">CoffeeBot reads messages and decides what’s not okay (hate, scams, threats, invite spam…). Uses your normal <code>/warn</code> system. No keyword lists to babysit.</p>',
      '  <label class="check-row"><input type="checkbox" id="automod-enabled"> Enable AI Automod</label>',
      '  <label class="check-row"><input type="checkbox" id="automod-ignore-staff" checked> Ignore staff (Manage Messages+)</label>',
      "  <label>When AI flags a message</label>",
      '  <select id="automod-action">',
      '    <option value="warn">Delete + warn (recommended)</option>',
      '    <option value="delete">Delete only</option>',
      '    <option value="mute">Delete + mute 10m</option>',
      "  </select>",
      "  <label>Log channel</label>",
      '  <select id="automod-log"><option value="">None</option></select>',
      "  <label>Also ignore this role</label>",
      '  <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">',
      '    <select id="automod-ignore-role-pick" style="flex:1"><option value="">Select…</option></select>',
      '    <button type="button" id="automod-ignore-role-add">Add</button>',
      "  </div>",
      '  <div id="automod-ignore-roles-list" class="form-hint"></div>',
      "  <label>Also ignore this channel</label>",
      '  <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">',
      '    <select id="automod-ignore-ch-pick" style="flex:1"><option value="">Select…</option></select>',
      '    <button type="button" id="automod-ignore-ch-add">Add</button>',
      "  </div>",
      '  <div id="automod-ignore-ch-list" class="form-hint"></div>',
      '  <button type="button" id="automod-save" class="primary-btn" style="margin-top:0.75rem">Save Automod</button>',
      '  <p id="automod-status" class="form-hint"></p>',
      "</section>",
      '<section class="feature-card" id="panel-ai-staff" style="margin-top:1rem">',
      "  <h2>🤖 AI Staff</h2>",
      '  <p class="form-hint">People with these roles can ask CoffeeBot to do staff tasks (announce, channels, roles…). Everyone else is refused.</p>',
      '  <label class="check-row"><input type="checkbox" id="aistaff-enabled"> Enable AI Staff</label>',
      "  <label>Staff role</label>",
      '  <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap">',
      '    <select id="aistaff-role-pick" style="flex:1"><option value="">Select…</option></select>',
      '    <button type="button" id="aistaff-role-add">Add</button>',
      "  </div>",
      '  <div id="aistaff-roles-list" class="form-hint"></div>',
      "  <label>Default announce channel</label>",
      '  <select id="aistaff-announce"><option value="">Current channel / #mention</option></select>',
      "  <label>Staff action log channel</label>",
      '  <select id="aistaff-log"><option value="">None</option></select>',
      "  <h3 style=\"margin-top:0.75rem;font-size:0.95rem\">Allowed actions</h3>",
      '  <label class="check-row"><input type="checkbox" id="as-announce" checked> Announce</label>',
      '  <label class="check-row"><input type="checkbox" id="as-send" checked> Send message to a channel</label>',
      '  <label class="check-row"><input type="checkbox" id="as-create-ch" checked> Create channel</label>',
      '  <label class="check-row"><input type="checkbox" id="as-rename" checked> Rename channel</label>',
      '  <label class="check-row"><input type="checkbox" id="as-create-role" checked> Create role</label>',
      '  <label class="check-row"><input type="checkbox" id="as-assign" checked> Assign role</label>',
      '  <label class="check-row"><input type="checkbox" id="as-remove"> Remove role</label>',
      '  <label class="check-row"><input type="checkbox" id="as-pin" checked> Pin message</label>',
      '  <button type="button" id="aistaff-save" class="primary-btn" style="margin-top:0.75rem">Save AI Staff</button>',
      '  <p id="aistaff-status" class="form-hint"></p>',
      '  <p class="form-hint">Examples: <code>announce: server online</code> · <code>create channel events</code> · <code>give @User @Role</code></p>',
      "</section>",
    ].join("\n");
  }

  var state = {
    ignoreRoles: [],
    ignoreChannels: [],
    staffRoles: [],
    staffUsers: [],
  };

  function findMount() {
    return (
      document.getElementById("panel-ai") ||
      document.getElementById("ai-panel") ||
      document.querySelector("[data-feature=ai]") ||
      document.getElementById("features-root") ||
      document.querySelector(".features-grid") ||
      document.querySelector("main") ||
      document.body
    );
  }

  function roleName(id) {
    var r = roles().find(function (x) {
      return String(x.id) === String(id);
    });
    return r ? r.name : id;
  }
  function chName(id) {
    var c = channels().find(function (x) {
      return String(x.id) === String(id);
    });
    return c ? "#" + c.name : id;
  }

  function renderChipList(elId, ids, kind) {
    var el = $(elId);
    if (!el) return;
    if (!ids.length) {
      el.innerHTML = '<span class="form-hint">None</span>';
      return;
    }
    el.innerHTML = ids
      .map(function (id) {
        var label = kind === "role" ? roleName(id) : chName(id);
        return (
          '<span style="display:inline-flex;align-items:center;gap:6px;margin:2px 6px 2px 0;padding:2px 8px;border-radius:999px;background:rgba(79,84,92,.4)">' +
          label +
          ' <button type="button" data-rm="' +
          id +
          '" data-kind="' +
          kind +
          '" style="border:0;background:transparent;color:#f87171;cursor:pointer">×</button></span>'
        );
      })
      .join("");
    el.querySelectorAll("[data-rm]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-rm");
        var k = btn.getAttribute("data-kind");
        if (k === "role" && elId.indexOf("aistaff") >= 0) {
          state.staffRoles = state.staffRoles.filter(function (x) {
            return String(x) !== String(id);
          });
          renderChipList("aistaff-roles-list", state.staffRoles, "role");
        } else if (k === "role") {
          state.ignoreRoles = state.ignoreRoles.filter(function (x) {
            return String(x) !== String(id);
          });
          renderChipList("automod-ignore-roles-list", state.ignoreRoles, "role");
        } else {
          state.ignoreChannels = state.ignoreChannels.filter(function (x) {
            return String(x) !== String(id);
          });
          renderChipList("automod-ignore-ch-list", state.ignoreChannels, "channel");
        }
      });
    });
  }

  function fillSelects() {
    fillChannelSelect($("automod-log"), true);
    fillChannelSelect($("automod-ignore-ch-pick"), true);
    fillChannelSelect($("aistaff-announce"), true);
    fillChannelSelect($("aistaff-log"), true);
    fillRoleSelect($("automod-ignore-role-pick"), true);
    fillRoleSelect($("aistaff-role-pick"), true);
  }

  function ensurePanels() {
    if ($("panel-automod")) {
      fillSelects();
      return;
    }
    var mount = findMount();
    if (!mount) return;
    var wrap = document.createElement("div");
    wrap.id = "automod-staff-wrap";
    wrap.innerHTML = panelHtml();
    mount.appendChild(wrap);
    wire();
    fillSelects();
    apply();
  }

  function setStatus(id, t, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = t || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  function apply() {
    var c = window.currentConfig || {};
    var am = c.automod || {};
    if ($("automod-enabled")) $("automod-enabled").checked = !!am.enabled;
    if ($("automod-ignore-staff")) $("automod-ignore-staff").checked = am.ignoreStaff !== false;
    if ($("automod-action")) $("automod-action").value = am.action || "warn";
    fillSelects();
    if ($("automod-log")) $("automod-log").value = am.logChannelId || "";
    state.ignoreRoles = (am.ignoredRoleIds || []).map(String);
    state.ignoreChannels = (am.ignoredChannelIds || []).map(String);
    renderChipList("automod-ignore-roles-list", state.ignoreRoles, "role");
    renderChipList("automod-ignore-ch-list", state.ignoreChannels, "channel");

    var st = (c.ai && c.ai.staff) || {};
    var acts = st.allowedActions || {};
    if ($("aistaff-enabled")) $("aistaff-enabled").checked = !!st.enabled;
    if ($("aistaff-announce")) $("aistaff-announce").value = st.announceChannelId || "";
    if ($("aistaff-log")) $("aistaff-log").value = st.logChannelId || "";
    state.staffRoles = (st.allowedRoleIds || []).map(String);
    state.staffUsers = (st.allowedUserIds || []).map(String);
    renderChipList("aistaff-roles-list", state.staffRoles, "role");
    if ($("as-announce")) $("as-announce").checked = acts.announce !== false;
    if ($("as-send")) $("as-send").checked = acts.sendMessage !== false;
    if ($("as-create-ch")) $("as-create-ch").checked = acts.createChannel !== false;
    if ($("as-rename")) $("as-rename").checked = acts.renameChannel !== false;
    if ($("as-create-role")) $("as-create-role").checked = acts.createRole !== false;
    if ($("as-assign")) $("as-assign").checked = acts.assignRole !== false;
    if ($("as-remove")) $("as-remove").checked = !!acts.removeRole;
    if ($("as-pin")) $("as-pin").checked = acts.pinMessage !== false;
  }

  async function saveAutomod() {
    try {
      setStatus("automod-status", "Saving…", true);
      var d = await window.saveConfig({
        automod: {
          enabled: $("automod-enabled") ? $("automod-enabled").checked : false,
          ignoreStaff: $("automod-ignore-staff") ? $("automod-ignore-staff").checked : true,
          action: $("automod-action") ? $("automod-action").value || "warn" : "warn",
          muteDuration: "10m",
          logChannelId: $("automod-log") && $("automod-log").value ? $("automod-log").value : null,
          ignoredRoleIds: state.ignoreRoles.slice(),
          ignoredChannelIds: state.ignoreChannels.slice(),
        },
      });
      setStatus(
        "automod-status",
        d && d.savedToBot === false ? "Saved on website. Bot offline — redeploy Railway." : "✅ AI Automod saved.",
        true
      );
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
    } catch (e) {
      setStatus("automod-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function saveAiStaff() {
    try {
      setStatus("aistaff-status", "Saving…", true);
      var d = await window.saveConfig({
        ai: {
          staff: {
            enabled: $("aistaff-enabled") ? $("aistaff-enabled").checked : false,
            allowedRoleIds: state.staffRoles.slice(),
            allowedUserIds: state.staffUsers.slice(),
            announceChannelId: $("aistaff-announce") && $("aistaff-announce").value ? $("aistaff-announce").value : null,
            logChannelId: $("aistaff-log") && $("aistaff-log").value ? $("aistaff-log").value : null,
            allowedActions: {
              announce: $("as-announce") ? $("as-announce").checked : true,
              sendMessage: $("as-send") ? $("as-send").checked : true,
              createChannel: $("as-create-ch") ? $("as-create-ch").checked : true,
              renameChannel: $("as-rename") ? $("as-rename").checked : true,
              createRole: $("as-create-role") ? $("as-create-role").checked : true,
              assignRole: $("as-assign") ? $("as-assign").checked : true,
              removeRole: $("as-remove") ? $("as-remove").checked : false,
              pinMessage: $("as-pin") ? $("as-pin").checked : true,
            },
          },
        },
      });
      setStatus(
        "aistaff-status",
        d && d.savedToBot === false ? "Saved on website. Bot offline — redeploy Railway." : "✅ AI Staff saved.",
        true
      );
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
    } catch (e) {
      setStatus("aistaff-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  function wire() {
    function addOnce(id, fn) {
      var el = $(id);
      if (el && !el.__bound) {
        el.__bound = 1;
        el.addEventListener("click", fn);
      }
    }
    addOnce("automod-save", saveAutomod);
    addOnce("aistaff-save", saveAiStaff);
    addOnce("automod-ignore-role-add", function () {
      var v = $("automod-ignore-role-pick") && $("automod-ignore-role-pick").value;
      if (!v) return;
      if (state.ignoreRoles.indexOf(v) < 0) state.ignoreRoles.push(v);
      renderChipList("automod-ignore-roles-list", state.ignoreRoles, "role");
    });
    addOnce("automod-ignore-ch-add", function () {
      var v = $("automod-ignore-ch-pick") && $("automod-ignore-ch-pick").value;
      if (!v) return;
      if (state.ignoreChannels.indexOf(v) < 0) state.ignoreChannels.push(v);
      renderChipList("automod-ignore-ch-list", state.ignoreChannels, "channel");
    });
    addOnce("aistaff-role-add", function () {
      var v = $("aistaff-role-pick") && $("aistaff-role-pick").value;
      if (!v) return;
      if (state.staffRoles.indexOf(v) < 0) state.staffRoles.push(v);
      renderChipList("aistaff-roles-list", state.staffRoles, "role");
    });
  }

  function boot() {
    ensurePanels();
    setInterval(ensurePanels, 2500);
    var prev = window.loadGuildData;
    if (typeof prev === "function" && !window.__amStaffLoadWrap) {
      window.__amStaffLoadWrap = true;
      window.loadGuildData = async function () {
        var r = await prev.apply(this, arguments);
        try {
          apply();
        } catch (_) {}
        return r;
      };
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
