/**
 * features-config-patch v22 — tickets (category select + ID fallback) + analytics + saves
 */
(function () {
  "use strict";
  if (window.__featuresConfigPatchV22) return;
  window.__featuresConfigPatchV22 = true;

  function $(id) { return document.getElementById(id); }
  function setVal(id, v) { var el = $(id); if (el) el.value = v == null ? "" : String(v); }
  function setCheck(id, on) { var el = $(id); if (el) el.checked = !!on; }
  function setStatus(id, t, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = t || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  function channels() {
    try {
      if (typeof channelsCache !== "undefined" && channelsCache && channelsCache.length) return channelsCache;
    } catch (_) {}
    try { if (window.syncGlobals) window.syncGlobals(); } catch (_) {}
    return window.channelsCache || [];
  }
  function roles() {
    try {
      if (typeof rolesCache !== "undefined" && rolesCache && rolesCache.length) return rolesCache;
    } catch (_) {}
    return window.rolesCache || [];
  }

  function ensureTicketCategoryField() {
    var el = $("ticket-category-id");
    if (!el) return null;
    if (el.tagName === "SELECT") {
      if (!$("ticket-category-manual") && el.parentNode) {
        var hint = document.createElement("p");
        hint.className = "form-hint";
        hint.id = "ticket-category-hint";
        hint.textContent = "If the list is empty, paste a category snowflake below.";
        el.parentNode.appendChild(hint);
        var man = document.createElement("input");
        man.id = "ticket-category-manual";
        man.type = "text";
        man.placeholder = "Or paste category ID…";
        man.style.marginTop = "0.35rem";
        el.parentNode.appendChild(man);
      }
      return el;
    }
    var parent = el.parentNode;
    var sel = document.createElement("select");
    sel.id = "ticket-category-id";
    sel.innerHTML = '<option value="">Select a category…</option>';
    parent.replaceChild(sel, el);
    var hint2 = document.createElement("p");
    hint2.className = "form-hint";
    hint2.id = "ticket-category-hint";
    hint2.textContent = "If empty, paste a category snowflake below.";
    parent.appendChild(hint2);
    if (!$("ticket-category-manual")) {
      var man2 = document.createElement("input");
      man2.id = "ticket-category-manual";
      man2.type = "text";
      man2.placeholder = "Or paste category ID…";
      man2.style.marginTop = "0.35rem";
      parent.appendChild(man2);
    }
    return sel;
  }

  function fillSelects() {
    var ch = channels();
    var rl = roles();
    var cats = ch.filter(function (c) {
      return c && (c.type === 4 || c.type === "GUILD_CATEGORY" || String(c.type) === "4");
    });
    ensureTicketCategoryField();
    var catEl = $("ticket-category-id");
    if (catEl && catEl.tagName === "SELECT") {
      var cur = catEl.value;
      catEl.innerHTML = '<option value="">Select a category…</option>';
      if (!cats.length) {
        var o0 = document.createElement("option");
        o0.disabled = true;
        o0.textContent = "(No categories found — use ID below)";
        catEl.appendChild(o0);
      } else {
        cats.forEach(function (c) {
          var o = document.createElement("option");
          o.value = c.id;
          o.textContent = c.name || c.id;
          catEl.appendChild(o);
        });
      }
      if (cur) catEl.value = cur;
    }
    ["ticket-transcript-channel", "analytics-log-channel", "suggest-channel", "suggest-staff-channel", "qotd-channel"].forEach(function (id) {
      var el = $(id);
      if (!el || el.tagName !== "SELECT") return;
      var c = el.value;
      var noneLabel = id.indexOf("analytics") >= 0 ? "None" : "Select a channel…";
      el.innerHTML = '<option value="">' + noneLabel + "</option>";
      ch.filter(function (x) {
        return x && (x.type === 0 || x.type === 5 || x.type == null || x.type === "GUILD_TEXT");
      }).forEach(function (x) {
        var o = document.createElement("option");
        o.value = x.id;
        o.textContent = "#" + (x.name || x.id);
        el.appendChild(o);
      });
      if (c) el.value = c;
    });
    ["ticket-staff-role", "suggest-ping-role", "qotd-manager-role"].forEach(function (id) {
      var el = $(id);
      if (!el || el.tagName !== "SELECT") return;
      var c = el.value;
      el.innerHTML = '<option value="">Select…</option>';
      rl.forEach(function (x) {
        var o = document.createElement("option");
        o.value = x.id;
        o.textContent = x.name || x.id;
        el.appendChild(o);
      });
      if (c) el.value = c;
    });
  }

  function renderTicketStaff() {
    var list = $("ticket-staff-list");
    if (!list) return;
    var ids = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
    var rl = roles();
    if (!ids.length) {
      list.innerHTML = '<p class="form-hint">No staff roles yet.</p>';
      return;
    }
    list.innerHTML = ids.map(function (rid) {
      var r = rl.find(function (x) { return String(x.id) === String(rid); });
      return '<div class="level-role-row">' + (r ? r.name : rid) +
        ' <button type="button" data-rm-staff="' + rid + '">Remove</button></div>';
    }).join("");
    list.querySelectorAll("[data-rm-staff]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        try {
          var rid = btn.getAttribute("data-rm-staff");
          var cur = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
          var next = cur.filter(function (x) { return String(x) !== String(rid); });
          await window.saveConfig({ tickets: { staffRoleIds: next } });
          if (window.loadGuildData) await window.loadGuildData();
          else apply();
        } catch (e) { alert(e.message || "Failed"); }
      });
    });
  }

  function apply() {
    var c = window.currentConfig || {};
    var S = c.suggestions || {};
    var A = c.analytics || {};
    var T = c.tickets || {};
    var Q = c.qotd || {};
    setVal("suggest-ping-role", S.pingRoleId || "");
    setCheck("analytics-enabled", A.enabled !== false);
    setVal("analytics-log-channel", A.logChannelId || "");
    setCheck("analytics-track-messages", A.trackMessages !== false);
    setCheck("analytics-track-members", A.trackMembers !== false);
    setCheck("ticket-enabled", T.enabled !== false);
    setVal("ticket-category-id", T.categoryId || "");
    setVal("ticket-category-manual", T.categoryId || "");
    setVal("ticket-transcript-channel", T.transcriptChannelId || "");
    setVal("ticket-welcome", T.welcomeMessage || "Staff will be with you shortly.");
    setCheck("qotd-enabled", Q.enabled !== false);
    setVal("qotd-channel", Q.channelId || "");
    setVal("qotd-manager-role", Q.managerRoleId || "");
    fillSelects();
    renderTicketStaff();
    var snap = $("analytics-snapshot");
    if (snap) {
      snap.innerHTML =
        '<p class="form-hint"><strong>Tracking:</strong> enabled=' +
        (A.enabled !== false ? "on" : "off") +
        ", messages=" + (A.trackMessages !== false ? "on" : "off") +
        ", members=" + (A.trackMembers !== false ? "on" : "off") +
        '</p><p class="form-hint">Run <code>/analytics</code> in Discord for live numbers (Manage Server).</p>';
    }
  }

  function getTicketCategoryId() {
    var sel = $("ticket-category-id");
    var man = $("ticket-category-manual");
    var fromSel = sel && sel.value ? String(sel.value).trim() : "";
    var fromMan = man && man.value ? String(man.value).trim() : "";
    return fromSel || fromMan || null;
  }

  async function saveA() {
    try {
      setStatus("analytics-status", "Saving…", true);
      var d = await window.saveConfig({
        analytics: {
          enabled: $("analytics-enabled") ? $("analytics-enabled").checked : true,
          logChannelId: $("analytics-log-channel") ? $("analytics-log-channel").value || null : null,
          trackMessages: $("analytics-track-messages") ? $("analytics-track-messages").checked : true,
          trackMembers: $("analytics-track-members") ? $("analytics-track-members").checked : true
        }
      });
      setStatus("analytics-status", d && d.savedToBot === false ? "Saved on website (bot offline — redeploy Railway)" : "✅ Analytics saved.", true);
      if (window.loadGuildData) await window.loadGuildData(); else apply();
    } catch (e) { setStatus("analytics-status", "❌ " + (e.message || "Failed"), false); }
  }

  async function saveS() {
    try {
      setStatus("suggest-status", "Saving…", true);
      var d = await window.saveConfig({
        suggestions: {
          enabled: $("suggest-enabled") ? $("suggest-enabled").checked : true,
          channelId: $("suggest-channel") ? $("suggest-channel").value || null : null,
          staffChannelId: $("suggest-staff-channel") ? $("suggest-staff-channel").value || null : null,
          pingRoleId: $("suggest-ping-role") ? $("suggest-ping-role").value || null : null
        }
      });
      setStatus("suggest-status", d && d.savedToBot === false ? "Saved (bot offline)" : "✅ Suggestions saved.", true);
    } catch (e) { setStatus("suggest-status", "❌ " + (e.message || "Failed"), false); }
  }

  async function saveQ() {
    try {
      setStatus("qotd-status", "Saving…", true);
      var d = await window.saveConfig({
        qotd: {
          enabled: $("qotd-enabled") ? $("qotd-enabled").checked : true,
          channelId: $("qotd-channel") ? $("qotd-channel").value || null : null,
          managerRoleId: $("qotd-manager-role") ? $("qotd-manager-role").value || null : null
        }
      });
      setStatus("qotd-status", d && d.savedToBot === false ? "Saved (bot offline)" : "✅ QOTD saved.", true);
    } catch (e) { setStatus("qotd-status", "❌ " + (e.message || "Failed"), false); }
  }

  async function saveT() {
    try {
      setStatus("ticket-status", "Saving…", true);
      var existing = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
      var d = await window.saveConfig({
        tickets: {
          enabled: $("ticket-enabled") ? $("ticket-enabled").checked : true,
          categoryId: getTicketCategoryId(),
          transcriptChannelId: $("ticket-transcript-channel") ? $("ticket-transcript-channel").value || null : null,
          welcomeMessage: $("ticket-welcome") ? $("ticket-welcome").value || "Staff will be with you shortly." : "Staff will be with you shortly.",
          staffRoleIds: existing
        }
      });
      setStatus("ticket-status", d && d.savedToBot === false ? "Saved on website. Bot offline — redeploy then /ticket-panel." : "✅ Tickets saved. Run /ticket-panel in Discord.", true);
      if (window.loadGuildData) await window.loadGuildData(); else apply();
    } catch (e) { setStatus("ticket-status", "❌ " + (e.message || "Failed"), false); }
  }

  async function addStaff() {
    var rid = $("ticket-staff-role") ? $("ticket-staff-role").value : "";
    if (!rid) return alert("Pick a staff role");
    try {
      var cur = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
      if (cur.map(String).indexOf(String(rid)) >= 0) return alert("Already added");
      await window.saveConfig({ tickets: { staffRoleIds: cur.concat([rid]) } });
      if (window.loadGuildData) await window.loadGuildData(); else apply();
    } catch (e) { alert(e.message || "Failed"); }
  }

  function wire() {
    function bind(id, fn) {
      var el = $(id);
      if (el && !el.__p22) {
        el.__p22 = 1;
        el.addEventListener("click", function (e) { e.preventDefault(); e.stopImmediatePropagation(); fn(); }, true);
      }
    }
    bind("save-analytics", saveA);
    bind("save-suggestions", saveS);
    bind("save-qotd", saveQ);
    bind("save-tickets", saveT);
    bind("add-ticket-staff", addStaff);
    bind("refresh-analytics", apply);
  }

  var n = 0;
  function boot() {
    n++;
    wire();
    apply();
    fillSelects();
    if (n < 80) setTimeout(boot, 200);
  }

  try {
    var _v = window.currentConfig;
    Object.defineProperty(window, "currentConfig", {
      configurable: true,
      enumerable: true,
      get: function () { return _v; },
      set: function (v) { _v = v; setTimeout(apply, 30); }
    });
  } catch (_) {}

  var lastCh = 0;
  setInterval(function () {
    var ch = channels();
    if (ch.length !== lastCh) { lastCh = ch.length; fillSelects(); }
  }, 1000);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[features-config-patch] v22 tickets+analytics+category fallback");
})();
