/**
 * app-config-fix — applications save + positions/questions + channel/role fill
 * Fill selects ONCE when empty; never thrash while the user is choosing.
 */
(function () {
  "use strict";
  if (window.__appConfigFixV3) return;
  window.__appConfigFixV3 = true;

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

  /** Only rebuild options if the select is still empty (or force). Preserve current value. */
  function fillChannel(id, force) {
    var el = $(id);
    if (!el || el.tagName !== "SELECT") return;
    if (!force && el.options.length > 1) return; // already filled — leave user alone
    var ch = channels();
    if (!ch.length) return;
    var cur = el.value;
    el.innerHTML = '<option value="">Select a channel…</option>';
    var list = ch.filter(function (x) {
      if (!x) return false;
      var t = x.type;
      return t === 0 || t === 5 || t == null || t === "GUILD_TEXT" || t === "GUILD_ANNOUNCEMENT" || String(t) === "0" || String(t) === "5";
    });
    if (!list.length) list = ch;
    list.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x.id;
      o.textContent = "#" + (x.name || x.id);
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }
  function fillRole(id, force) {
    var el = $(id);
    if (!el || el.tagName !== "SELECT") return;
    if (!force && el.options.length > 1) return;
    var rl = roles();
    if (!rl.length) return;
    var cur = el.value;
    el.innerHTML = '<option value="">Select…</option>';
    rl.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x.id;
      o.textContent = x.name || x.id;
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }
  function fillAppSelects(force) {
    fillChannel("app-review-channel", force);
    fillChannel("app-announce-channel", force);
    fillRole("app-review-role", force);
    fillRole("app-pos-role", force);
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
    setVal("app-btn-label", APP.buttonLabel || "Apply for Staff");
    setVal("app-embed-title", APP.embedTitle || "Staff Applications");
    setVal("app-embed-desc", APP.embedDescription || "");
    setVal("app-accept-msg", APP.acceptMessage || "");
    window.__appPositions = Array.isArray(APP.positions) ? APP.positions.slice() : [];
    window.__appQuestions = Array.isArray(APP.questions) ? APP.questions.slice() : [];
    fillAppSelects(true); // force once when applying config so saved IDs show
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
    if (el && !el.__appFixV3) {
      el.__appFixV3 = 1;
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

  var lastSection = null;
  function hookShow() {
    var orig = window.showSection;
    if (typeof orig === "function" && !orig.__appCfgHookV3) {
      window.showSection = function (section) {
        var r = orig.apply(this, arguments);
        // only when opening applications, fill once if still empty
        if (section === "applications" && lastSection !== "applications") {
          setTimeout(function () {
            fillAppSelects(false);
            applyApp();
          }, 80);
        }
        lastSection = section;
        return r;
      };
      window.showSection.__appCfgHookV3 = true;
    }
  }

  var appliedConfigOnce = false;
  try {
    var _v = window.currentConfig;
    Object.defineProperty(window, "currentConfig", {
      configurable: true,
      enumerable: true,
      get: function () { return _v; },
      set: function (v) {
        _v = v;
        // Apply form values once when config first arrives (or changes from load)
        if (!appliedConfigOnce || (v && v.applications)) {
          appliedConfigOnce = true;
          setTimeout(function () { applyApp(); }, 60);
        }
      }
    });
  } catch (_) {}

  // One soft retry if caches load late — not a spam loop
  function tryFillWhenReady() {
    var ch = channels();
    var rl = roles();
    if (ch.length || rl.length) {
      fillAppSelects(false);
      return;
    }
    setTimeout(tryFillWhenReady, 800);
  }

  function boot() {
    wire();
    hookShow();
    fillAppSelects(false);
    tryFillWhenReady();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[app-config-fix] v3 calm selects");
})();
