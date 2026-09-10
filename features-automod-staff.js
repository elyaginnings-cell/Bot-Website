/**
 * Automod UI v8 — English proficiency roles + DM + media + per-category rules
 */
(function () {
  "use strict";
  if (window.__featuresAutomodStaffV8) return;
  window.__featuresAutomodStaffV8 = true;

  var CAT_KEYS = [
    { id: "invite_spam", label: "Discord invites" },
    { id: "scam", label: "Scam / phishing links" },
    { id: "ads", label: "Ads / self-promo" },
    { id: "mass_mentions", label: "Mass mentions" },
    { id: "hate", label: "Hate / severe harassment" },
    { id: "sexual", label: "Sexual / dating talk" },
    { id: "media_restrict", label: "Photos/videos outside media channel" },
    { id: "english_only", label: "English-only (non-English text)" },
    { id: "caps", label: "Caps spam" },
    { id: "char_spam", label: "Character spam" },
    { id: "ai", label: "AI borderline" },
  ];

  var CAT_DEFAULTS = {
    invite_spam: { enabled: true, strikes: 1, action: "warn", muteDuration: "10m", deleteMessage: true, windowMinutes: 60 },
    scam: { enabled: true, strikes: 1, action: "mute", muteDuration: "1h", deleteMessage: true, windowMinutes: 120 },
    ads: { enabled: true, strikes: 2, action: "warn", muteDuration: "10m", deleteMessage: true, windowMinutes: 60 },
    mass_mentions: { enabled: true, strikes: 1, action: "warn", muteDuration: "10m", deleteMessage: true, windowMinutes: 30, maxMentions: 4 },
    hate: { enabled: true, strikes: 1, action: "mute", muteDuration: "1h", deleteMessage: true, windowMinutes: 120 },
    sexual: { enabled: true, strikes: 2, action: "warn", muteDuration: "30m", deleteMessage: true, windowMinutes: 60 },
    media_restrict: { enabled: true, strikes: 1, action: "delete", muteDuration: "10m", deleteMessage: true, windowMinutes: 30 },
    english_only: { enabled: true, strikes: 2, action: "warn", muteDuration: "10m", deleteMessage: true, windowMinutes: 60 },
    caps: { enabled: true, strikes: 3, action: "delete", muteDuration: "5m", deleteMessage: true, windowMinutes: 15 },
    char_spam: { enabled: true, strikes: 2, action: "warn", muteDuration: "10m", deleteMessage: true, windowMinutes: 30 },
    ai: { enabled: true, strikes: 1, action: "warn", muteDuration: "10m", deleteMessage: true, windowMinutes: 60 },
  };

  function $(id) { return document.getElementById(id); }
  function channels() {
    try { if (typeof channelsCache !== "undefined" && channelsCache && channelsCache.length) return channelsCache; } catch (_) {}
    try { if (window.syncGlobals) window.syncGlobals(); } catch (_) {}
    return window.channelsCache || [];
  }
  function roles() {
    try { if (typeof rolesCache !== "undefined" && rolesCache && rolesCache.length) return rolesCache; } catch (_) {}
    return window.rolesCache || [];
  }
  function textChannels() {
    return channels().filter(function (c) {
      return c && (c.type === 0 || c.type === 5 || c.type == null || c.type === "GUILD_TEXT");
    });
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
        document.querySelectorAll(".page-section").forEach(function (el) { el.classList.remove("active"); });
        var sec = document.getElementById(tab);
        if (sec) sec.classList.add("active");
        document.querySelectorAll(".nav-item").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-tab") === tab);
        });
      }
      try { fillAllSelects(); apply(); } catch (_) {}
    });
    if (settingsBtn) nav.insertBefore(btn, settingsBtn);
    else nav.appendChild(btn);
    return true;
  }

  function ensureSection(id, html) {
    var content = document.querySelector(".content");
    if (!content) return false;
    if ($(id)) return true;
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    while (wrap.firstChild) content.appendChild(wrap.firstChild);
    return true;
  }

  var state = {
    ignoreRoles: [],
    ignoreChannels: [],
    staffRoles: [],
    mediaChannels: [],
    categories: JSON.parse(JSON.stringify(CAT_DEFAULTS)),
  };

  function roleName(id) {
    var r = roles().find(function (x) { return String(x.id) === String(id); });
    return r ? r.name : id;
  }
  function chName(id) {
    var c = channels().find(function (x) { return String(x.id) === String(id); });
    return c ? "#" + c.name : id;
  }

  function renderList(elId, ids, kind) {
    var el = $(elId);
    if (!el) return;
    if (!ids.length) {
      el.innerHTML = '<p class="form-hint">None added.</p>';
      return;
    }
    el.innerHTML = ids.map(function (id) {
      var label = kind === "role" ? roleName(id) : chName(id);
      return '<div class="level-role-row">' + label +
        ' <button type="button" data-rm="' + id + '" data-kind="' + kind + '" data-list="' + elId + '">Remove</button></div>';
    }).join("");
    el.querySelectorAll("[data-rm]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-rm");
        var list = btn.getAttribute("data-list");
        var k = btn.getAttribute("data-kind");
        if (list === "aistaff-roles-list") {
          state.staffRoles = state.staffRoles.filter(function (x) { return String(x) !== String(id); });
          renderList("aistaff-roles-list", state.staffRoles, "role");
        } else if (list === "automod-media-ch-list") {
          state.mediaChannels = state.mediaChannels.filter(function (x) { return String(x) !== String(id); });
          renderList("automod-media-ch-list", state.mediaChannels, "channel");
        } else if (k === "role") {
          state.ignoreRoles = state.ignoreRoles.filter(function (x) { return String(x) !== String(id); });
          renderList("automod-ignore-roles-list", state.ignoreRoles, "role");
        } else {
          state.ignoreChannels = state.ignoreChannels.filter(function (x) { return String(x) !== String(id); });
          renderList("automod-ignore-ch-list", state.ignoreChannels, "channel");
        }
      });
    });
  }

  function actionOptions(selected) {
    return ["none", "delete", "warn", "mute", "kick", "ban"].map(function (a) {
      return '<option value="' + a + '"' + (selected === a ? " selected" : "") + ">" + a + "</option>";
    }).join("");
  }

  function renderCategoryRows() {
    var host = $("automod-cat-rows");
    if (!host) return;
    host.innerHTML = CAT_KEYS.map(function (meta) {
      var r = state.categories[meta.id] || CAT_DEFAULTS[meta.id] || {};
      var id = meta.id;
      return (
        '<div class="level-role-row" style="flex-direction:column;align-items:stretch;gap:0.4rem;margin-bottom:0.75rem;padding:0.75rem;border:1px solid rgba(255,255,255,0.08);border-radius:8px">' +
        "<div><strong>" + meta.label + "</strong></div>" +
        '<label class="toggle"><input type="checkbox" data-cat="' + id + '" data-field="enabled"' +
        (r.enabled !== false ? " checked" : "") + "> <span>Enabled</span></label>" +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Strikes before action</label>' +
        '<input type="number" min="1" max="20" data-cat="' + id + '" data-field="strikes" value="' + (r.strikes || 1) + '"></div>' +
        '<div class="input-group"><label>Window (minutes)</label>' +
        '<input type="number" min="1" max="10080" data-cat="' + id + '" data-field="windowMinutes" value="' + (r.windowMinutes || 60) + '"></div>' +
        '<div class="input-group"><label>Action</label>' +
        '<select data-cat="' + id + '" data-field="action">' + actionOptions(r.action || "warn") + "</select></div>" +
        '<div class="input-group"><label>Mute duration</label>' +
        '<input type="text" data-cat="' + id + '" data-field="muteDuration" value="' + (r.muteDuration || "10m") + '"></div>' +
        "</div>" +
        '<label class="toggle"><input type="checkbox" data-cat="' + id + '" data-field="deleteMessage"' +
        (r.deleteMessage !== false ? " checked" : "") + "> <span>Delete the message</span></label>" +
        "</div>"
      );
    }).join("");
    host.querySelectorAll("[data-cat]").forEach(function (el) {
      el.addEventListener("change", function () {
        var cat = el.getAttribute("data-cat");
        var field = el.getAttribute("data-field");
        if (!state.categories[cat]) state.categories[cat] = Object.assign({}, CAT_DEFAULTS[cat] || {});
        if (el.type === "checkbox") state.categories[cat][field] = el.checked;
        else if (el.type === "number") state.categories[cat][field] = Number(el.value) || 1;
        else state.categories[cat][field] = el.value;
      });
    });
  }

  function fillAllSelects() {
    fillChannelSelect($("automod-log"), "None");
    fillChannelSelect($("automod-ignore-ch-pick"), "Select a channel…");
    fillChannelSelect($("automod-media-ch-pick"), "Select media channel…");
    fillChannelSelect($("aistaff-announce"), "Current channel / mention");
    fillChannelSelect($("aistaff-log"), "None");
    fillRoleSelect($("automod-ignore-role-pick"), "Select a role…");
    fillRoleSelect($("aistaff-role-pick"), "Select a role…");
    fillRoleSelect($("automod-eng-fluent"), "None");
    fillRoleSelect($("automod-eng-moderate"), "None");
    fillRoleSelect($("automod-eng-little"), "None");
    fillRoleSelect($("automod-eng-none"), "None");
  }
  window.fillAutomodStaffSelects = fillAllSelects;

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
    fillAllSelects();
    if ($("automod-log")) $("automod-log").value = am.logChannelId || "";
    state.ignoreRoles = (am.ignoredRoleIds || []).map(String);
    state.ignoreChannels = (am.ignoredChannelIds || []).map(String);
    state.mediaChannels = (am.mediaChannelIds || []).map(String);
    if ($("automod-allow-gifs")) $("automod-allow-gifs").checked = am.allowGifsEverywhere !== false;
    if ($("automod-dm-flag")) $("automod-dm-flag").checked = am.dmOnFlag !== false;
    if ($("automod-english-only")) $("automod-english-only").checked = am.englishOnly !== false;
    if ($("automod-translate")) $("automod-translate").checked = am.translateNonEnglish !== false;
    var er = am.englishRoles || {};
    if ($("automod-eng-fluent")) $("automod-eng-fluent").value = er.fluent || "";
    if ($("automod-eng-moderate")) $("automod-eng-moderate").value = er.moderate || "";
    if ($("automod-eng-little")) $("automod-eng-little").value = er.little || "";
    if ($("automod-eng-none")) $("automod-eng-none").value = er.none || "";
    renderList("automod-ignore-roles-list", state.ignoreRoles, "role");
    renderList("automod-ignore-ch-list", state.ignoreChannels, "channel");
    renderList("automod-media-ch-list", state.mediaChannels, "channel");
    state.categories = JSON.parse(JSON.stringify(CAT_DEFAULTS));
    if (am.categories && typeof am.categories === "object") {
      Object.keys(am.categories).forEach(function (k) {
        state.categories[k] = Object.assign({}, CAT_DEFAULTS[k] || {}, am.categories[k]);
      });
    }
    renderCategoryRows();
    var st = (c.ai && c.ai.staff) || {};
    var acts = st.allowedActions || {};
    if ($("aistaff-enabled")) $("aistaff-enabled").checked = !!st.enabled;
    if ($("aistaff-announce")) $("aistaff-announce").value = st.announceChannelId || "";
    if ($("aistaff-log")) $("aistaff-log").value = st.logChannelId || "";
    state.staffRoles = (st.allowedRoleIds || []).map(String);
    renderList("aistaff-roles-list", state.staffRoles, "role");
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
      document.querySelectorAll("#automod-cat-rows [data-cat]").forEach(function (el) {
        var cat = el.getAttribute("data-cat");
        var field = el.getAttribute("data-field");
        if (!state.categories[cat]) state.categories[cat] = Object.assign({}, CAT_DEFAULTS[cat] || {});
        if (el.type === "checkbox") state.categories[cat][field] = el.checked;
        else if (el.type === "number") state.categories[cat][field] = Number(el.value) || 1;
        else state.categories[cat][field] = el.value;
      });
      var d = await window.saveConfig({
        automod: {
          enabled: $("automod-enabled") ? $("automod-enabled").checked : false,
          ignoreStaff: $("automod-ignore-staff") ? $("automod-ignore-staff").checked : true,
          logChannelId: $("automod-log") && $("automod-log").value ? $("automod-log").value : null,
          ignoredRoleIds: state.ignoreRoles.slice(),
          ignoredChannelIds: state.ignoreChannels.slice(),
          mediaChannelIds: state.mediaChannels.slice(),
          allowGifsEverywhere: $("automod-allow-gifs") ? $("automod-allow-gifs").checked : true,
          dmOnFlag: $("automod-dm-flag") ? $("automod-dm-flag").checked : true,
          englishOnly: $("automod-english-only") ? $("automod-english-only").checked : true,
          translateNonEnglish: $("automod-translate") ? $("automod-translate").checked : true,
          englishRoles: {
            fluent: $("automod-eng-fluent") && $("automod-eng-fluent").value ? $("automod-eng-fluent").value : null,
            moderate: $("automod-eng-moderate") && $("automod-eng-moderate").value ? $("automod-eng-moderate").value : null,
            little: $("automod-eng-little") && $("automod-eng-little").value ? $("automod-eng-little").value : null,
            none: $("automod-eng-none") && $("automod-eng-none").value ? $("automod-eng-none").value : null,
          },
          categories: state.categories,
          blockInvites: state.categories.invite_spam && state.categories.invite_spam.enabled !== false,
          blockAds: state.categories.ads && state.categories.ads.enabled !== false,
          blockScamLinks: state.categories.scam && state.categories.scam.enabled !== false,
          maxMentions: (state.categories.mass_mentions && state.categories.mass_mentions.maxMentions) || 4,
        },
      });
      setStatus("automod-status", d && d.savedToBot === false ? "Saved on website. Bot offline — redeploy Railway." : "✅ Automod saved (English roles + rules).", true);
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
            allowedUserIds: [],
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
      setStatus("aistaff-status", d && d.savedToBot === false ? "Saved on website. Bot offline." : "✅ AI Staff saved.", true);
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
    } catch (e) {
      setStatus("aistaff-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  function wire() {
    function once(id, fn) {
      var el = $(id);
      if (el && !el.__bound) { el.__bound = 1; el.addEventListener("click", fn); }
    }
    once("save-automod", saveAutomod);
    once("save-aistaff", saveAiStaff);
    once("automod-ignore-role-add", function () {
      var v = $("automod-ignore-role-pick") && $("automod-ignore-role-pick").value;
      if (!v) return;
      if (state.ignoreRoles.indexOf(v) < 0) state.ignoreRoles.push(v);
      renderList("automod-ignore-roles-list", state.ignoreRoles, "role");
    });
    once("automod-ignore-ch-add", function () {
      var v = $("automod-ignore-ch-pick") && $("automod-ignore-ch-pick").value;
      if (!v) return;
      if (state.ignoreChannels.indexOf(v) < 0) state.ignoreChannels.push(v);
      renderList("automod-ignore-ch-list", state.ignoreChannels, "channel");
    });
    once("automod-media-ch-add", function () {
      var v = $("automod-media-ch-pick") && $("automod-media-ch-pick").value;
      if (!v) return;
      if (state.mediaChannels.indexOf(v) < 0) state.mediaChannels.push(v);
      renderList("automod-media-ch-list", state.mediaChannels, "channel");
    });
    once("aistaff-role-add", function () {
      var v = $("aistaff-role-pick") && $("aistaff-role-pick").value;
      if (!v) return;
      if (state.staffRoles.indexOf(v) < 0) state.staffRoles.push(v);
      renderList("aistaff-roles-list", state.staffRoles, "role");
    });
  }

  function ensurePanels() {
    ensureNavItem("automod", "🛡️", "Automod", "Automod");
    ensureNavItem("aistaff", "🤖", "AI Staff", "AI Staff");
    ensureSection(
      "automod",
      '<section id="automod" class="page-section"><div class="card form-card wide">' +
        '<span class="eyebrow">AUTOMOD</span><h2>Automod</h2>' +
        '<label class="toggle"><input type="checkbox" id="automod-enabled"> <span>Enabled</span></label>' +
        '<label class="toggle"><input type="checkbox" id="automod-ignore-staff" checked> <span>Ignore staff</span></label>' +
        '<div class="input-group"><label>Log channel</label><select id="automod-log"><option value="">None</option></select></div>' +
        '<h3 class="subhead">Media</h3>' +
        '<label class="toggle"><input type="checkbox" id="automod-allow-gifs" checked> <span>Allow GIFs everywhere</span></label>' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Media channel</label><select id="automod-media-ch-pick"><option value="">Select…</option></select></div>' +
        '<div class="input-group"><label>&nbsp;</label><button class="button secondary" type="button" id="automod-media-ch-add">Add</button></div></div>' +
        '<div id="automod-media-ch-list" class="level-roles-list"></div>' +
        '<h3 class="subhead">Notifications &amp; language</h3>' +
        '<label class="toggle"><input type="checkbox" id="automod-dm-flag" checked> <span>DM on every flag</span></label>' +
        '<label class="toggle"><input type="checkbox" id="automod-english-only" checked> <span>English-only detection</span></label>' +
        '<label class="toggle"><input type="checkbox" id="automod-translate" checked> <span>Post AI translation when non-English flagged</span></label>' +
        '<h3 class="subhead">English proficiency roles</h3>' +
        '<p class="form-hint">Create roles in Discord, then map them here. Scam/hate/ads still apply to everyone.</p>' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Fluent English</label><select id="automod-eng-fluent"><option value="">None</option></select></div>' +
        '<div class="input-group"><label>Moderate English</label><select id="automod-eng-moderate"><option value="">None</option></select></div>' +
        '<div class="input-group"><label>Little English</label><select id="automod-eng-little"><option value="">None</option></select></div>' +
        '<div class="input-group"><label>No English</label><select id="automod-eng-none"><option value="">None</option></select></div></div>' +
        '<p class="form-hint"><strong>Fluent</strong> = full language rules · <strong>Moderate</strong> = softer · <strong>Little / No English</strong> = translation only (no warns)</p>' +
        '<h3 class="subhead">Per-type rules</h3><div id="automod-cat-rows"></div>' +
        '<h3 class="subhead">Ignore extras</h3>' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Ignore role</label><select id="automod-ignore-role-pick"><option value="">Select…</option></select></div>' +
        '<div class="input-group"><label>&nbsp;</label><button class="button secondary" type="button" id="automod-ignore-role-add">Add</button></div></div>' +
        '<div id="automod-ignore-roles-list" class="level-roles-list"></div>' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Ignore channel</label><select id="automod-ignore-ch-pick"><option value="">Select…</option></select></div>' +
        '<div class="input-group"><label>&nbsp;</label><button class="button secondary" type="button" id="automod-ignore-ch-add">Add</button></div></div>' +
        '<div id="automod-ignore-ch-list" class="level-roles-list"></div>' +
        '<button class="button" id="save-automod" type="button" style="margin-top:1rem">Save Automod Settings</button>' +
        '<p class="form-hint" id="automod-status"></p></div></section>'
    );
    ensureSection(
      "aistaff",
      '<section id="aistaff" class="page-section"><div class="card form-card wide">' +
        '<span class="eyebrow">AI STAFF</span><h2>AI Staff</h2>' +
        '<label class="toggle"><input type="checkbox" id="aistaff-enabled"> <span>Enabled</span></label>' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Staff role</label><select id="aistaff-role-pick"><option value="">Select…</option></select></div>' +
        '<div class="input-group"><label>&nbsp;</label><button class="button secondary" type="button" id="aistaff-role-add">Add</button></div></div>' +
        '<div id="aistaff-roles-list" class="level-roles-list"></div>' +
        '<div class="input-group"><label>Announce channel</label><select id="aistaff-announce"><option value="">None</option></select></div>' +
        '<div class="input-group"><label>Log channel</label><select id="aistaff-log"><option value="">None</option></select></div>' +
        '<label class="toggle"><input type="checkbox" id="as-announce" checked> <span>Announce</span></label>' +
        '<label class="toggle"><input type="checkbox" id="as-send" checked> <span>Send message</span></label>' +
        '<label class="toggle"><input type="checkbox" id="as-create-ch" checked> <span>Create channel</span></label>' +
        '<label class="toggle"><input type="checkbox" id="as-rename" checked> <span>Rename channel</span></label>' +
        '<label class="toggle"><input type="checkbox" id="as-create-role" checked> <span>Create role</span></label>' +
        '<label class="toggle"><input type="checkbox" id="as-assign" checked> <span>Assign role</span></label>' +
        '<label class="toggle"><input type="checkbox" id="as-remove"> <span>Remove role</span></label>' +
        '<label class="toggle"><input type="checkbox" id="as-pin" checked> <span>Pin</span></label>' +
        '<button class="button" id="save-aistaff" type="button">Save AI Staff</button>' +
        '<p class="form-hint" id="aistaff-status"></p></div></section>'
    );
    wire();
  }

  var n = 0;
  function boot() {
    n++;
    ensurePanels();
    fillAllSelects();
    apply();
    if (n < 100) setTimeout(boot, 250);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[features-automod-staff] v8 English roles");
})();
