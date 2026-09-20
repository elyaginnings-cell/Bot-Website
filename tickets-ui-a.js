/**
 * Tickets dashboard — full customizable panel.
 */
(function () {
  "use strict";
  if (window.__featuresTicketsV6) return;
  window.__featuresTicketsV6 = true;

  var DEFAULT_INTRO =
    "Hello, I am AI, but I can help. If this is an issue you don't think I can handle then please ask for a human representative.";

  var DEFAULT_CATS = [
    { id: "general", label: "General Support", emoji: "🛠️", description: "Questions and help", aiEnabled: true, aiInstructions: "", questions: [], staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] },
    { id: "report", label: "Report a User", emoji: "🚨", description: "Report rule-breaking", aiEnabled: true, aiInstructions: "", questions: [{ id: "who", label: "Who are you reporting?", placeholder: "Username or ID", required: true, paragraph: false }, { id: "what", label: "What happened?", placeholder: "Describe what happened", required: true, paragraph: true }], staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] },
    { id: "partner", label: "Partnership", emoji: "🤝", description: "Partnership requests", aiEnabled: false, aiInstructions: "", questions: [], staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] }
  ];

  var draftCats = null;
  var mounted = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&").replace(/"/g, """).replace(/</g, "<").replace(/>/g, ">"); }
  function syncCaches() { try { if (typeof window.syncGlobals === "function") window.syncGlobals(); } catch (_) {} }
  function roles() { syncCaches(); return window.rolesCache || []; }
  function channels() { syncCaches(); return window.channelsCache || []; }
  function textChannels() { return channels().filter(function (c) { return c && (c.type === 0 || c.type === 5 || c.type == null || c.type === "GUILD_TEXT"); }); }
  function categoryChannels() { return channels().filter(function (c) { return c && (c.type === 4 || c.type === "4" || c.type === "GUILD_CATEGORY"); }); }
  function setStatus(text, ok) {
    var el = $("ticket-status");
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }
  function slugId(label, fallback) {
    var s = String(label || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    return s || fallback || "cat";
  }
  function cloneCats(list) { return JSON.parse(JSON.stringify(Array.isArray(list) && list.length ? list : DEFAULT_CATS)); }
  function normalizeQuestion(q, i) {
    q = q && typeof q === "object" ? q : {};
    return { id: String(q.id || "q" + i).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40) || "q" + i, label: String(q.label || "Question " + (i + 1)).slice(0, 45), placeholder: q.placeholder ? String(q.placeholder).slice(0, 100) : "", required: q.required !== false, paragraph: !!q.paragraph };
  }
  function normalizeCat(c, i) {
    c = c && typeof c === "object" ? c : {};
    return { id: String(c.id || slugId(c.label, "cat" + i)).slice(0, 40), label: String(c.label || c.id || "Category").slice(0, 80), emoji: String(c.emoji || "🎫").slice(0, 16), description: c.description ? String(c.description).slice(0, 100) : "", aiEnabled: c.aiEnabled !== false, aiInstructions: c.aiInstructions ? String(c.aiInstructions).slice(0, 800) : "", questions: (Array.isArray(c.questions) ? c.questions : []).slice(0, 5).map(normalizeQuestion), staffRoleIds: Array.isArray(c.staffRoleIds) ? c.staffRoleIds.map(String).slice(0, 15) : [], escalateRoleIds: Array.isArray(c.escalateRoleIds) ? c.escalateRoleIds.map(String).slice(0, 15) : [], escalateUserIds: Array.isArray(c.escalateUserIds) ? c.escalateUserIds.map(String).slice(0, 15) : [] };
  }
  function roleOptions(selected) {
    var html = '<option value="">Select role…</option>';
    roles().forEach(function (r) {
      html += '<option value="' + esc(r.id) + '"' + (String(selected) === String(r.id) ? " selected" : "") + ">" + esc(r.name || r.id) + "</option>";
    });
    return html;
  }
  function channelOptions(list, selected, emptyLabel) {
    var html = '<option value="">' + esc(emptyLabel || "Select…") + "</option>";
    list.forEach(function (c) {
      html += '<option value="' + esc(c.id) + '"' + (String(selected) === String(c.id) ? " selected" : "") + ">" + esc((c.type === 4 || c.type === "4" ? "" : "#") + (c.name || c.id)) + "</option>";
    });
    return html;
  }
  function chipList(ids, kind) {
    ids = ids || [];
    if (!ids.length) return '<p class="form-hint">None yet.</p>';
    var rl = roles();
    return ids.map(function (id) {
      var label = id;
      if (kind === "role") {
        var r = rl.find(function (x) { return String(x.id) === String(id); });
        label = r ? r.name : id;
      }
      return '<div class="level-role-row">' + esc(label) + ' <button type="button" class="button" data-rm-chip="' + kind + '" data-rm-id="' + esc(id) + '">Remove</button></div>';
    }).join("");
  }
  function panelHtml() {
    return (
      '<div class="card form-card wide" data-tickets-panel="v6" id="tickets-panel-host">' +
      '<span class="eyebrow">TICKETS</span>' +
      '<h2>Support tickets</h2>' +
      '<p class="form-hint">Build your own ticket types, intake questions, channel names, and per-type staff pings. After saving, run <code>/ticket-panel</code> in Discord to post the menu.</p>' +
      '<label class="toggle"><input type="checkbox" id="ticket-enabled" checked> <span>Tickets enabled</span></label>' +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Parent Discord category</label><select id="ticket-category-id"></select>' +
      '<input id="ticket-category-manual" type="text" placeholder="Or paste category ID…"></div>' +
      '<div class="input-group"><label>Transcript channel</label><select id="ticket-transcript-channel"></select></div>' +
      '<div class="input-group"><label>Panel channel (optional)</label><select id="ticket-panel-channel"></select></div>' +
      '<div class="input-group"><label>Max open tickets per user</label><input id="ticket-max-open" type="number" min="1" max="10" value="1"></div>' +
      '<div class="input-group" style="grid-column:1/-1"><label>Channel name format</label>' +
      '<input id="ticket-naming" type="text" placeholder="{category} - {user}" maxlength="80">' +
      '<p class="form-hint">Tokens: {category} {label} {user} {userid} {n} {id}</p></div>' +
      '<div class="input-group"><label>Panel title</label><input id="ticket-panel-title" type="text" maxlength="120" placeholder="Support Center"></div>' +
      '<div class="input-group"><label>Panel color (decimal)</label><input id="ticket-panel-color" type="number" placeholder="5793266"></div>' +
      '<div class="input-group" style="grid-column:1/-1"><label>Panel description</label><textarea id="ticket-panel-desc" rows="2" maxlength="2000"></textarea></div>' +
      '<div class="input-group" style="grid-column:1/-1"><label>Welcome message inside new tickets</label><textarea id="ticket-welcome" rows="2" maxlength="1500"></textarea></div>' +
      '</div>' +
      '<h3 class="subhead">Global ticket staff</h3>' +
      '<p class="form-hint">These roles can always see tickets. Per-type escalate pings are set on each category below.</p>' +
      '<div class="level-role-form"><div class="input-group"><label>Role</label><select id="ticket-staff-role"></select></div>' +
      '<button class="button" id="add-ticket-staff" type="button">Add staff role</button></div>' +
      '<div id="ticket-staff-list" class="level-roles-list"></div>' +
      '<h3 class="subhead">AI ticket agent</h3>' +
      '<label class="toggle"><input type="checkbox" id="ticket-ai-enabled"> <span>AI can handle tickets</span></label>' +
      '<label class="toggle"><input type="checkbox" id="ticket-ai-nomention" checked> <span>Reply without being pinged (until handed off)</span></label>' +
      '<label class="toggle"><input type="checkbox" id="ticket-ai-ignore-staff" checked> <span>Ignore staff messages (talk to the opener only)</span></label>' +
      '<div class="input-group"><label>Intro message (sent when a ticket opens)</label><textarea id="ticket-ai-intro" rows="3" maxlength="1900"></textarea></div>' +
      '<div class="input-group"><label>Handoff message (when a human is requested)</label><textarea id="ticket-ai-escalate-msg" rows="2" maxlength="500"></textarea></div>' +
      '<div class="input-group"><label>Words that request a human (comma-separated)</label><input id="ticket-ai-keywords" type="text" placeholder="human, representative, staff please"></div>' +
      '<p class="form-hint">After handoff the AI stays quiet unless someone pings the bot. Categories with AI off ping their escalate role as soon as the ticket opens.</p>' +
      '<h3 class="subhead">Ticket types</h3>' +
      '<p class="form-hint">Add your own categories, optional questions (max 5), and who gets pinged for that type.</p>' +
      '<div id="ticket-cats-list"></div>' +
      '<button class="button" id="ticket-add-cat" type="button">Add ticket type</button>' +
      '<div style="margin-top:1.25rem"><button class="button" id="save-tickets" type="button">Save Ticket Settings</button></div>' +
      '<p class="form-hint" id="ticket-status"></p></div>'
    );
  }
