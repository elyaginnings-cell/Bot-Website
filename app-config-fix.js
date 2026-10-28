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
  function ensureLinkedRoleSelect() {
    var el = $("app-pos-linked");
    if (!el) return;
    if (el.tagName !== "SELECT") {
      var select = document.createElement("select");
      select.id = "app-pos-linked";
      select.name = el.name || "app-pos-linked";
      select.multiple = true;
      select.size = 1;
      select.setAttribute("aria-label", "Extra roles to grant with this position");
      select.style.cssText = (el.getAttribute("style") || "") + ";min-height:42px;cursor:pointer";
      select.innerHTML = '<option value="">Select extra role(s)…</option>';
      el.parentNode.replaceChild(select, el);
      el = select;
    }
    var rl = roles();
    var current = Array.from(el.selectedOptions || []).map(function (o) { return o.value; });
    var selected = current.length ? current : (el.dataset.savedRoleIds || "").split(",").filter(Boolean);
    el.innerHTML = '<option value="" disabled>Select extra role(s)…</option>';
    rl.forEach(function (x) {
      var o = document.createElement("option");
      o.value = String(x.id);
      o.textContent = x.name || String(x.id);
      o.selected = selected.indexOf(String(x.id)) !== -1;
      el.appendChild(o);
    });
    if (!rl.length) {
      var empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Roles unavailable — refresh server data";
      el.appendChild(empty);
    }
    var hint = $("app-pos-linked-hint");
    if (!hint) {
      hint = document.createElement("small");
      hint.id = "app-pos-linked-hint";
      hint.textContent = "Optional. Select extra Discord roles to grant alongside the main position role.";
      hint.style.cssText = "display:block;opacity:.7;margin-top:5px";
      el.insertAdjacentElement("afterend", hint);
    }
  }
  function fillAppSelects(force) {
    fillChannel("app-review-channel", force);
    fillChannel("app-announce-channel", force);
    fillRole("app-review-role", force);
    fillRole("app-pos-role", force);
    ensureLinkedRoleSelect();
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
      var linked = (p.linkedRoleIds || []).map(function (id) {
        var extra = rl.find(function (x) { return String(x.id) === String(id); });
        return extra ? extra.name : id;
      });
      return '<div class="level-role-row"><strong>' + esc(p.name || "Position") +
        '</strong> → ' + esc(role ? role.name : p.roleId) +
        (linked.length ? ' <span style="opacity:.75">+ ' + esc(linked.join(", ")) + '</span>' : '') +
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


  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function currentReviewGuildId() {
    var params = new URLSearchParams(location.search);
    var candidates = [
      params.get("guildId"), params.get("guild"), window.currentGuildId,
      window.selectedGuildId, window.activeGuildId, window.guildId,
      window.currentGuild && window.currentGuild.id,
      window.selectedGuild && window.selectedGuild.id,
      window.currentConfig && (window.currentConfig.guildId || window.currentConfig.id)
    ];
    try {
      Object.keys(window).filter(function (k) { return /guild.*id|selected.*guild|current.*guild/i.test(k); })
        .forEach(function (k) { try { candidates.push(window[k]); } catch (_) {} });
    } catch (_) {}
    var dom = document.querySelector('[data-guild-id], #guild-select, #server-select, select[name="guildId"]');
    if (dom) candidates.push(dom.getAttribute("data-guild-id"), dom.value);
    for (var i = 0; i < candidates.length; i++) {
      var v = candidates[i];
      if (v && typeof v === "object") v = v.id || v.guildId;
      if (/^\d{15,22}$/.test(String(v || ""))) return String(v);
    }
    return "";
  }
  var liveReviewData = null;
  var liveReviewBusy = false;
  function renderLiveReviews() {
    var root = $("app-live-review-list");
    var status = $("app-live-review-status");
    if (!root) return;
    var data = liveReviewData;
    if (!data || !Array.isArray(data.applications)) {
      root.innerHTML = '<div style="padding:18px;border:1px dashed rgba(168,85,247,.35);border-radius:12px;opacity:.8">Load the selected server to see pending applications.</div>';
      return;
    }
    if (!data.applications.length) {
      root.innerHTML = '<div style="padding:22px;border:1px dashed rgba(168,85,247,.35);border-radius:12px;text-align:center"><strong>No pending applications</strong><div style="opacity:.72;margin-top:5px">New submissions will appear here automatically.</div></div>';
      return;
    }
    root.innerHTML = data.applications.map(function (app) {
      var reviewers = Array.isArray(app.reviewerIds) ? app.reviewerIds : (data.reviewers || []).map(function (r) { return r.id; });
      var votes = app.votes || {}, modes = app.acceptModes || {}, picked = app.acceptPositions || {};
      var posNames = {};
      (data.positions || []).forEach(function (p) { posNames[String(p.id)] = p.name; });
      var statusRows = reviewers.map(function (id) {
        var vote = votes[id];
        var label = !vote ? "Not voted" : vote === "deny" ? "Deny" :
          (modes[id] === "rank" ? "Accept as " + (posNames[String(picked[id])] || "configured position") : "Normal Accept");
        var mark = !vote ? "◷" : vote === "deny" ? "✕" : "✓";
        return '<div style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;border-bottom:1px solid rgba(168,85,247,.12)"><span style="width:18px;opacity:.85">' + mark + '</span><span style="flex:1;min-width:0;overflow-wrap:anywhere"><strong>' + esc(id) + '</strong><span style="opacity:.8"> — ' + esc(label) + '</span></span></div>';
      }).join("");
      var answerRows = Object.entries(app.answers || {}).map(function (pair) {
        return '<div style="margin-top:10px"><div style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;opacity:.7;margin-bottom:3px">' + esc(pair[0]) + '</div><div style="white-space:pre-wrap;overflow-wrap:anywhere">' + esc(pair[1]) + '</div></div>';
      }).join("");
      var positionOptions = '<option value="">Choose configured position…</option>' + (data.positions || []).map(function (p) {
        return '<option value="' + esc(p.id) + '">' + esc(p.name) + (String(p.id) === String(app.suggestedPositionId) ? ' · applicant suggestion' : '') + '</option>';
      }).join("");
      var created = app.createdAt ? new Date(app.createdAt).toLocaleString() : "Date unavailable";
      return '<article style="border:1px solid rgba(168,85,247,.28);border-radius:16px;padding:16px;margin:12px 0;background:linear-gradient(145deg,rgba(124,58,237,.09),rgba(236,72,153,.035))">' +
        '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:flex-start"><div><div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.7">Pending application · ' + esc(app.id) + '</div><h3 style="margin:5px 0 3px;font-size:18px">Applicant <span style="font-family:monospace;font-size:14px;overflow-wrap:anywhere">' + esc(app.userId) + '</span></h3><div style="opacity:.78">Suggested position: <strong>' + esc(app.suggestedPosition) + '</strong> · ' + esc(created) + '</div></div>' +
        (app.reviewUrl ? '<a href="' + esc(app.reviewUrl) + '" target="_blank" rel="noopener noreferrer" style="color:#d8b4fe">Open Discord review ↗</a>' : '') + '</div>' +
        '<div style="margin-top:14px;padding:12px;border-radius:12px;background:rgba(8,5,18,.24)"><strong>Application answers</strong>' + (answerRows || '<div style="opacity:.7;margin-top:6px">No answers recorded.</div>') + '</div>' +
        '<div style="margin-top:14px"><strong>Individual staff votes</strong><div style="margin-top:5px">' + (statusRows || '<div style="opacity:.7">No configured reviewers were found.</div>') + '</div></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:15px;align-items:center"><select data-review-position="' + esc(app.id) + '" style="min-width:210px;flex:1;padding:10px;border-radius:10px;border:1px solid rgba(168,85,247,.45);background:#160d25;color:inherit">' + positionOptions + '</select>' +
        '<button type="button" data-review-vote="rank" data-review-app="' + esc(app.id) + '" style="padding:10px 13px;border:0;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#c026d3);color:white;font-weight:700;cursor:pointer">Accept as position</button>' +
        '<button type="button" data-review-vote="accept" data-review-app="' + esc(app.id) + '" style="padding:10px 13px;border:1px solid rgba(74,222,128,.4);border-radius:10px;background:rgba(22,101,52,.25);color:#bbf7d0;font-weight:700;cursor:pointer">Normal Accept</button>' +
        '<button type="button" data-review-vote="deny" data-review-app="' + esc(app.id) + '" style="padding:10px 13px;border:1px solid rgba(248,113,113,.4);border-radius:10px;background:rgba(127,29,29,.25);color:#fecaca;font-weight:700;cursor:pointer">Deny</button></div></article>';
    }).join("");
    if (status && !liveReviewBusy) status.textContent = data.applications.length + " pending application" + (data.applications.length === 1 ? "" : "s") + " · votes sync with Discord";
  }
  async function loadLiveReviews() {
    var status = $("app-live-review-status");
    var root = $("app-live-review-list");
    var guildId = currentReviewGuildId();
    if (!guildId) {
      if (status) status.textContent = "Open a server in the dashboard first. The selected server ID could not be detected.";
      if (root) root.innerHTML = '<div style="padding:16px;border:1px dashed rgba(248,113,113,.35);border-radius:12px">Could not identify the selected server. Select a server in the dashboard and refresh this panel.</div>';
      return;
    }
    if (status) status.textContent = "Loading live applications…";
    try {
      var res = await fetch("/api/config?resource=application-review&guildId=" + encodeURIComponent(guildId), { credentials: "same-origin", cache: "no-store" });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || "Could not load applications (" + res.status + ")");
      liveReviewData = data;
      renderLiveReviews();
    } catch (err) {
      if (status) status.textContent = "Could not load live applications.";
      if (root) root.innerHTML = '<div style="padding:16px;border:1px solid rgba(248,113,113,.35);border-radius:12px;color:#fecaca">' + esc(err.message || "Request failed") + '</div>';
    }
  }
  function ensureAcceptModeInfo() {
    var section = $("applications");
    if (!section || $("app-accept-mode-info")) return;
    var card = section.querySelector(".card") || section;
    var title = card.querySelector("h2");
    var note = document.createElement("div");
    note.id = "app-accept-mode-info";
    note.style.cssText = "margin:14px 0;padding:18px;border:1px solid rgba(168,85,247,.42);border-radius:16px;background:linear-gradient(135deg,rgba(124,58,237,.13),rgba(236,72,153,.08));";
    note.innerHTML =
      '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><strong style="display:block;font-size:18px;margin-bottom:5px">Live application review</strong><p style="margin:0;line-height:1.55;opacity:.82">Review real pending submissions here. Votes are checked against the configured Discord staff role and synced to the Discord review message. The applicant’s position remains a suggestion.</p></div><button type="button" id="app-live-review-refresh" style="padding:10px 14px;border:1px solid rgba(168,85,247,.45);border-radius:10px;background:rgba(124,58,237,.18);color:inherit;cursor:pointer;font-weight:700">Refresh applications ↻</button></div>' +
      '<div id="app-live-review-status" role="status" style="margin:12px 0 8px;opacity:.78">Loading…</div>' +
      '<div id="app-live-review-list"></div>';
    if (title && title.parentNode) title.parentNode.insertBefore(note, title.nextSibling);
    else card.insertBefore(note, card.firstChild);
    var refresh = $("app-live-review-refresh");
    if (refresh) refresh.addEventListener("click", loadLiveReviews);
    if (!window.__appLiveReviewVoteBound) {
      window.__appLiveReviewVoteBound = true;
      section.addEventListener("click", async function (event) {
        var button = event.target.closest("[data-review-vote]");
        if (!button) return;
        var guildId = currentReviewGuildId();
        var appId = button.getAttribute("data-review-app");
        var mode = button.getAttribute("data-review-vote");
        var positionSelect = section.querySelector('[data-review-position="' + appId + '"]');
        var positionId = positionSelect ? positionSelect.value : "";
        if (mode === "rank" && !positionId) {
          if ($("app-live-review-status")) $("app-live-review-status").textContent = "Choose a configured position first.";
          return;
        }
        button.disabled = true;
        var oldLabel = button.textContent;
        button.textContent = "Submitting…";
        liveReviewBusy = true;
        try {
          var response = await fetch("/api/config?resource=application-review&guildId=" + encodeURIComponent(guildId), {
            method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId: appId, vote: mode === "deny" ? "deny" : "accept", positionId: mode === "rank" ? positionId : null })
          });
          var result = await response.json().catch(function () { return {}; });
          if (!response.ok) throw new Error(result.error || "Vote failed");
          if ($("app-live-review-status")) $("app-live-review-status").textContent = "Vote submitted. Refreshing status…";
          await loadLiveReviews();
        } catch (err) {
          if ($("app-live-review-status")) $("app-live-review-status").textContent = err.message || "Vote failed";
        } finally {
          liveReviewBusy = false;
          button.disabled = false;
          button.textContent = oldLabel;
        }
      });
    }
    loadLiveReviews();
  }

  function applyApp() {
    ensureAcceptModeInfo();
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
    var linkedSelect = $("app-pos-linked");
    var linked = linkedSelect && linkedSelect.tagName === "SELECT"
      ? Array.from(linkedSelect.selectedOptions || []).map(function (o) { return String(o.value || ""); }).filter(Boolean)
      : [];
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
    if ($("app-pos-linked")) Array.from($("app-pos-linked").options).forEach(function (o) { o.selected = false; });
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
