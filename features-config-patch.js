/**
 * features-config-patch v21 — tickets + analytics + qotd + suggest ping
 * Fills category selects, wires saves, renders snapshot.
 */
(function () {
  "use strict";
  if (window.__featuresConfigPatchV21) return;
  window.__featuresConfigPatchV21 = true;

  function $(id) { return document.getElementById(id); }
  function setVal(id, v) { var el = $(id); if (el) el.value = v == null ? "" : String(v); }
  function setCheck(id, on) { var el = $(id); if (el) el.checked = !!on; }
  function setStatus(id, text, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || "";
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

  function fillSelects() {
    var ch = channels();
    var rl = roles();
    var cats = ch.filter(function (c) {
      return c.type === 4 || c.type === "GUILD_CATEGORY" || String(c.type).toLowerCase() === "category";
    });
    var texts = ch.filter(function (c) {
      return c.type === 0 || c.type === 5 || c.type === "GUILD_TEXT" || c.type === "GUILD_ANNOUNCEMENT" ||
        (!c.type && c.name);
    });

    var catEl = $("ticket-category-id");
    if (catEl && catEl.tagName === "SELECT") {
      var cv = catEl.value;
      catEl.innerHTML = '<option value="">Select a category…</option>';
      cats.forEach(function (x) {
        var o = document.createElement("option");
        o.value = x.id;
        o.textContent = x.name;
        catEl.appendChild(o);
      });
      if (cv) catEl.value = cv;
    }

    ["ticket-transcript-channel", "analytics-log-channel", "suggest-channel", "suggest-staff-channel", "qotd-channel"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var cur = el.value;
      var noneLabel = id.indexOf("analytics") >= 0 ? "None" : "Select a channel...";
      el.innerHTML = '<option value="">' + noneLabel + "</option>";
      (texts.length ? texts : ch).forEach(function (x) {
        var o = document.createElement("option");
        o.value = x.id;
        o.textContent = "#" + x.name;
        el.appendChild(o);
      });
      if (cur) el.value = cur;
    });

    ["ticket-staff-role", "suggest-ping-role", "qotd-manager-role"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var cur = el.value;
      el.innerHTML = '<option value="">' + (id.indexOf("ping") >= 0 || id.indexOf("manager") >= 0 ? "None" : "Select a role...") + "</option>";
      rl.forEach(function (x) {
        var o = document.createElement("option");
        o.value = x.id;
        o.textContent = x.name;
        el.appendChild(o);
      });
      if (cur) el.value = cur;
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
        } catch (e) {
          alert(e.message || "Failed");
        }
      });
    });
  }

  function renderSnapshot() {
    var snap = $("analytics-snapshot");
    if (!snap) return;
    var A = (window.currentConfig || {}).analytics || {};
    var lines = [];
    lines.push('<p class="form-hint"><strong>Tracking status</strong></p>');
    lines.push('<p class="form-hint">Enabled: <strong>' + (A.enabled !== false ? "yes" : "no") +
      "</strong> · Messages: <strong>" + (A.trackMessages !== false ? "on" : "off") +
      "</strong> · Members: <strong>" + (A.trackMembers !== false ? "on" : "off") + "</strong></p>');
    if (A.logChannelId) lines.push('<p class="form-hint">Log channel: <code>' + A.logChannelId + "</code></p>");
    if (A.messages != null || A.totalJoins != null) {
      lines.push('<p class="form-hint">Tracked messages: <strong>' + (A.messages || 0) +
        "</strong> · Joins: <strong>" + (A.totalJoins || 0) +
        "</strong> · Leaves: <strong>" + (A.totalLeaves || 0) + "</strong></p>');
    }
    lines.push('<p class="form-hint" style="margin-top:0.75rem">For a live report in Discord, run <code>/analytics</code> (requires Manage Server).</p>');
    snap.innerHTML = lines.join("");
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
    setVal("ticket-transcript-channel", T.transcriptChannelId || "");
    setVal("ticket-welcome", T.welcomeMessage || "Staff will be with you shortly. Please describe your issue.");
    setCheck("qotd-enabled", Q.enabled !== false);
    setVal("qotd-channel", Q.channelId || "");
    setVal("qotd-manager-role", Q.managerRoleId || "");
    fillSelects();
    setVal("ticket-category-id", T.categoryId || "");
    setVal("ticket-transcript-channel", T.transcriptChannelId || "");
    setVal("analytics-log-channel", A.logChannelId || "");
    setVal("suggest-ping-role", S.pingRoleId || "");
    setVal("qotd-channel", Q.channelId || "");
    setVal("qotd-manager-role", Q.managerRoleId || "");
    renderTicketStaff();
    renderSnapshot();
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
      setStatus("analytics-status", d && d.savedToBot === false ? "Saved (bot offline)" : "✅ Analytics saved.", true);
      renderSnapshot();
    } catch (e) {
      setStatus("analytics-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function saveT() {
    try {
      setStatus("ticket-status", "Saving…", true);
      var existing = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
      var d = await window.saveConfig({
        tickets: {
          enabled: $("ticket-enabled") ? $("ticket-enabled").checked : true,
          categoryId: $("ticket-category-id") ? ($("ticket-category-id").value || "").trim() || null : null,
          transcriptChannelId: $("ticket-transcript-channel") ? $("ticket-transcript-channel").value || null : null,
          welcomeMessage: $("ticket-welcome") ? $("ticket-welcome").value || "Staff will be with you shortly." : "Staff will be with you shortly.",
          staffRoleIds: existing
        }
      });
      setStatus(
        "ticket-status",
        d && d.savedToBot === false
          ? "Saved on website. Bot offline — run /ticket-panel after bot is up."
          : "✅ Tickets saved. Run /ticket-panel in Discord.",
        true
      );
    } catch (e) {
      setStatus("ticket-status", "❌ " + (e.message || "Failed"), false);
    }
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
    } catch (e) {
      setStatus("suggest-status", "❌ " + (e.message || "Failed"), false);
    }
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
    } catch (e) {
      setStatus("qotd-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function addStaff() {
    var rid = $("ticket-staff-role") ? $("ticket-staff-role").value : "";
    if (!rid) return alert("Pick a staff role");
    try {
      var cur = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
      if (cur.map(String).indexOf(String(rid)) >= 0) return alert("Already added");
      await window.saveConfig({ tickets: { staffRoleIds: cur.concat([rid]) } });
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
    } catch (e) {
      alert(e.message || "Failed");
    }
  }

  function wire() {
    var a = $("save-analytics");
    if (a && !a.__p21) {
      a.__p21 = 1;
      a.addEventListener("click", function (e) { e.preventDefault(); e.stopImmediatePropagation(); saveA(); }, true);
    }
    var t = $("save-tickets");
    if (t && !t.__p21) {
      t.__p21 = 1;
      t.addEventListener("click", function (e) { e.preventDefault(); e.stopImmediatePropagation(); saveT(); }, true);
    }
    var s = $("save-suggestions");
    if (s && !s.__p21) {
      s.__p21 = 1;
      s.addEventListener("click", function (e) { e.preventDefault(); e.stopImmediatePropagation(); saveS(); }, true);
    }
    var q = $("save-qotd");
    if (q && !q.__p21) {
      q.__p21 = 1;
      q.addEventListener("click", function (e) { e.preventDefault(); e.stopImmediatePropagation(); saveQ(); }, true);
    }
    var as = $("add-ticket-staff");
    if (as && !as.__p21) {
      as.__p21 = 1;
      as.addEventListener("click", addStaff);
    }
    var r = $("refresh-analytics");
    if (r && !r.__p21) {
      r.__p21 = 1;
      r.addEventListener("click", function () { apply(); });
    }

    var orig = window.showSection;
    if (typeof orig === "function" && !window.__showSectionPatchedV21) {
      window.__showSectionPatchedV21 = true;
      window.showSection = function (section) {
        orig(section);
        setTimeout(function () { fillSelects(); apply(); }, 60);
      };
    }
  }

  var n = 0;
  function boot() {
    n++;
    wire();
    apply();
    if (n < 80) setTimeout(boot, 200);
  }

  try {
    var _v = window.currentConfig;
    Object.defineProperty(window, "currentConfig", {
      configurable: true,
      enumerable: true,
      get: function () { return _v; },
      set: function (v) { _v = v; setTimeout(apply, 40); }
    });
  } catch (_) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[features-config-patch] v21 tickets category + analytics");
})();
