/**
 * app-config-fix — applications save + positions/questions + channel/role fill
 * Includes reviewRoleId (all members of role must vote).
 */
(function () {
  "use strict";
  if (window.__appConfigFixV2) return;
  window.__appConfigFixV2 = true;

  function $(id) { return document.getElementById(id); }
  function setVal(id, v) { var el = $(id); if (el) el.value = v == null ? "" : String(v); }
  function setCheck(id, on) { var el = $(id); if (el) el.checked = !!on; }
  function setStatus(id, t, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = t || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }
  function statusText(d, okMsg, offlineMsg) {
    if (d && d.savedToBot === false) return offlineMsg || "Saved on website. Bot offline — redeploy Railway.";
    return okMsg || "✅ Saved.";
  }
  function channels() {
    try { if (typeof channelsCache !== "undefined" && channelsCache && channelsCache.length) return channelsCache; } catch (_) {}
    try { if (window.syncGlobals) window.syncGlobals(); } catch (_) {}
    return window.channelsCache || [];
  }
  function roles() {
    try { if (typeof rolesCache !== "undefined" && rolesCache && rolesCache.length) return rolesCache; } catch (_) {}
    return window.rolesCache || [];
  }

  function fillChannel(id) {
    var el = $(id);
    if (!el || el.tagName !== "SELECT") return;
    var ch = channels(), cur = el.value;
    el.innerHTML = '<option value="">Select a channel…</option>';
    var list = ch.filter(function (x) {
      if (!x) return false;
      var t = x.type;
      return t === 0 || t === 5 || t == null || t === "GUILD_TEXT" || t === "GUILD_ANNOUNCEMENT" || String(t) === "0" || String(t) === "5";
    });
    if (!list.length && ch.length) list = ch;
    list.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x.id;
      o.textContent = "#" + (x.name || x.id);
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }
  function fillRole(id) {
    var el = $(id);
    if (!el || el.tagName !== "SELECT") return;
    var rl = roles(), cur = el.value;
    el.innerHTML = '<option value="">Select…</option>';
    rl.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x.id;
      o.textContent = x.name || x.id;
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }
  function fillAppSelects() {
    fillChannel("app-review-channel");
    fillChannel("app-announce-channel");
    fillRole("app-review-role");
    fillRole("app-pos-role");
  }

  function renderAppPositions() {
    var list = $("app-pos-list");
    if (!list) return;
    var items = window.__appPositions || [];
    var rl = roles();
    if (!items.length) {
      list.innerHTML = '<p class="form-hint">No positions yet.</p>';
      return;
    }
    list.innerHTML = items.map(function (p, i) {
      var role = rl.find(function (x) { return String(x.id) === String(p.roleId); });
      var linked = (p.linkedRoleIds || []).join(", ");
      return '<div class="level-role-row"><strong>' + (p.name || "Position") +
        '</strong> → ' + (role ? role.name : p.roleId) +
        (linked ? ' (+ ' + linked + ')' : '') +
        ' <button type="button" data-rm-pos="' + i + '">Remove</button></div>';
    }).join("");
    list.querySelectorAll("[data-rm-pos]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-rm-pos"));
        window.__appPositions = (window.__appPositions || []).filter(function (_, j) { return j !== i; });
        renderAppPositions();
      });
    });
  }

  function renderAppQuestions() {
    var list = $("app-q-list");
    if (!list) return;
    var items = window.__appQuestions || [];
    if (!items.length) {
      list.innerHTML = '<p class="form-hint">No questions yet (defaults will be used).</p>';
      return;
    }
    list.innerHTML = items.map(function (q, i) {
      return '<div class="level-role-row"><strong>' + (q.label || "Q") +
        '</strong> ' + (q.required === false ? "(optional)" : "(required)") +
        ' <button type="button" data-rm-q="' + i + '">Remove</button></div>';
    }).join("");
    list.querySelectorAll("[data-rm-q]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-rm-q"));
        window.__appQuestions = (window.__appQuestions || []).filter(function (_, j) { return j !== i; });
        renderAppQuestions();
      });
    });
  }

  function applyApp() {
    var c = window.currentConfig || {};
    var APP = c.applications || {};
    setCheck("app-enabled", APP.enabled !== false);
    setVal("app-review-channel", APP.reviewChannelId || "");
    setVal("app-review-role", APP.reviewRoleId || "");
    setVal("app-announce-channel", APP.announcementsChannelId || "");
    setVal("app-btn-label", APP.buttonLabel || "Apply for Staff");
    setVal("app-embed-title", APP.embedTitle || "Staff Applications");
    setVal("app-embed-desc", APP.embedDescription || "");
    setVal("app-accept-msg", APP.acceptMessage || "");
    window.__appPositions = Array.isArray(APP.positions) ? APP.positions.slice() : [];
    window.__appQuestions = Array.isArray(APP.questions) ? APP.questions.slice() : [];
    fillAppSelects();
    setVal("app-review-channel", APP.reviewChannelId || "");
    setVal("app-review-role", APP.reviewRoleId || "");
    setVal("app-announce-channel", APP.announcementsChannelId || "");
    renderAppPositions();
    renderAppQuestions();
  }

  async function saveApplications() {
    try {
      setStatus("app-status", "Saving…", true);
      var d = await window.saveConfig({
        applications: {
          enabled: $("app-enabled") ? $("app-enabled").checked : true,
          reviewChannelId: $("app-review-channel") ? $("app-review-channel").value || null : null,
          reviewRoleId: $("app-review-role") ? $("app-review-role").value || null : null,
          announcementsChannelId: $("app-announce-channel") ? $("app-announce-channel").value || null : null,
          buttonLabel: $("app-btn-label") ? $("app-btn-label").value || "Apply for Staff" : "Apply for Staff",
          embedTitle: $("app-embed-title") ? $("app-embed-title").value || "Staff Applications" : "Staff Applications",
          embedDescription: $("app-embed-desc") ? $("app-embed-desc").value || "" : "",
          acceptMessage: $("app-accept-msg") ? $("app-accept-msg").value || "" : "",
          positions: window.__appPositions || [],
          questions: window.__appQuestions || []
        }
      });
      setStatus("app-status", statusText(d, "✅ Applications saved. Run /application-panel in Discord."), true);
      if (window.loadGuildData) await window.loadGuildData();
      else applyApp();
    } catch (e) {
      setStatus("app-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  function addAppPosition() {
    var name = $("app-pos-name") ? ($("app-pos-name").value || "").trim() : "";
    var roleId = $("app-pos-role") ? $("app-pos-role").value : "";
    if (!name || !roleId) return alert("Name and role are required");
    var linkedRaw = $("app-pos-linked") ? ($("app-pos-linked").value || "").trim() : "";
    var linked = linkedRaw ? linkedRaw.split(",").map(function (s) { return s.trim(); }).filter(Boolean) : [];
    var desc = $("app-pos-desc") ? ($("app-pos-desc").value || "").trim() : "";
    if (!window.__appPositions) window.__appPositions = [];
    if (window.__appPositions.length >= 25) return alert("Max 25 positions");
    window.__appPositions.push({
      id: Math.random().toString(36).slice(2, 10),
      name: name.slice(0, 100),
      roleId: roleId,
      linkedRoleIds: linked,
      description: desc.slice(0, 100)
    });
    if ($("app-pos-name")) $("app-pos-name").value = "";
    if ($("app-pos-linked")) $("app-pos-linked").value = "";
    if ($("app-pos-desc")) $("app-pos-desc").value = "";
    renderAppPositions();
  }

  function addAppQuestion() {
    var label = $("app-q-label") ? ($("app-q-label").value || "").trim() : "";
    if (!label) return alert("Enter a question label");
    if (!window.__appQuestions) window.__appQuestions = [];
    if (window.__appQuestions.length >= 5) return alert("Max 5 questions (Discord modal limit)");
    window.__appQuestions.push({
      id: Math.random().toString(36).slice(2, 8),
      label: label.slice(0, 45),
      placeholder: $("app-q-placeholder") ? ($("app-q-placeholder").value || "").trim().slice(0, 100) : "",
      required: $("app-q-required") ? $("app-q-required").checked : true,
      maxLength: 500
    });
    if ($("app-q-label")) $("app-q-label").value = "";
    if ($("app-q-placeholder")) $("app-q-placeholder").value = "";
    renderAppQuestions();
  }

  function bind(id, fn) {
    var el = $(id);
    if (el && !el.__appFix) {
      el.__appFix = 1;
      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        fn();
      }, true);
    }
  }

  function wire() {
    bind("save-applications", saveApplications);
    bind("app-add-pos", addAppPosition);
    bind("app-add-q", addAppQuestion);
  }

  function hookShow() {
    var orig = window.showSection;
    if (typeof orig === "function" && !orig.__appCfgHookV2) {
      window.showSection = function (section) {
        var r = orig.apply(this, arguments);
        setTimeout(function () { fillAppSelects(); applyApp(); }, 40);
        return r;
      };
      window.showSection.__appCfgHookV2 = true;
    }
  }

  try {
    var _v = window.currentConfig;
    Object.defineProperty(window, "currentConfig", {
      configurable: true,
      enumerable: true,
      get: function () { return _v; },
      set: function (v) {
        _v = v;
        setTimeout(function () { applyApp(); fillAppSelects(); }, 40);
      }
    });
  } catch (_) {}

  var n = 0;
  function boot() {
    n++;
    wire();
    hookShow();
    applyApp();
    fillAppSelects();
    if (n < 100) setTimeout(boot, 250);
  }

  setInterval(function () {
    try { if (window.syncGlobals) window.syncGlobals(); } catch (_) {}
    var el = $("app-review-channel");
    var ch = channels();
    if (el && ch.length && el.options.length <= 1) fillAppSelects();
    var roleEl = $("app-review-role");
    var rl = roles();
    if (roleEl && rl.length && roleEl.options.length <= 1) fillAppSelects();
    var posRole = $("app-pos-role");
    if (posRole && rl.length && posRole.options.length <= 1) fillAppSelects();
  }, 900);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[app-config-fix] v2 review role + applications save ready");
})();
