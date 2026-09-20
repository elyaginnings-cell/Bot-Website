/**
 * Tickets dashboard v3 — force-replaces the old panel when Tickets tab opens
 * Categories, questions, naming, AI intro + escalate
 */
(function () {
  "use strict";
  if (window.__featuresTicketsV3) return;
  window.__featuresTicketsV3 = true;

  function $(id) { return document.getElementById(id); }

  function channels() {
    try { if (window.syncGlobals) window.syncGlobals(); } catch (_) {}
    return (window.channelsCache || []).filter(function (c) {
      return c && (c.type === 0 || c.type === 5 || c.type == null || c.type === "GUILD_TEXT");
    });
  }
  function categoryChannels() {
    try { if (window.syncGlobals) window.syncGlobals(); } catch (_) {}
    return (window.channelsCache || []).filter(function (c) {
      return c && (c.type === 4 || c.type === "GUILD_CATEGORY" || String(c.type) === "4");
    });
  }
  function roles() {
    try { if (window.syncGlobals) window.syncGlobals(); } catch (_) {}
    return window.rolesCache || [];
  }
  function setStatus(text, ok) {
    var el = $("ticket-status");
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }
  function escapeAttr(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }
  function escapeHtml(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  function defaultCategories() {
    return [
      { id: "general", label: "General Support", emoji: "🛠️", aiEnabled: true, aiInstructions: "", description: "", questions: [] },
      {
        id: "report", label: "Report a User", emoji: "🚨", aiEnabled: true, aiInstructions: "Collect evidence.", description: "",
        questions: [
          { id: "who", label: "Who are you reporting?", placeholder: "Username or ID", required: true, paragraph: false },
          { id: "what", label: "What happened?", placeholder: "Describe the issue", required: true, paragraph: true }
        ]
      }
    ];
  }

  var draftCats = defaultCategories();
  var DEFAULT_INTRO =
    "Hello! I'm the **AI support assistant** for this server. " +
    "I can help with a lot of common questions right here in this ticket.\n\n" +
    "If this is something you don't think I can handle, just say **human** " +
    "(or **yes** if I already offered) and I'll ping a staff representative for you.";

  function panelHtml() {
    return (
      '<div class="card form-card wide" data-tickets-panel="v3">' +
      '<span class="eyebrow">TICKETS</span><h2>Support tickets</h2>' +
      '<p class="form-hint">Build categories, questions, and channel names. Save, then run <code>/ticket-panel</code> in Discord.</p>' +
      '<label class="toggle"><input type="checkbox" id="ticket-enabled" checked> <span>Enabled</span></label>' +
      "<h3 class=\"subhead\">Channels &amp; staff</h3>" +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Discord category (parent)</label><select id="ticket-category-id"><option value="">Select…</option></select></div>' +
      '<div class="input-group"><label>Or paste category ID</label><input id="ticket-category-manual" type="text" placeholder="Snowflake ID"></div>' +
      '<div class="input-group"><label>Transcript channel</label><select id="ticket-transcript-channel"><option value="">None</option></select></div>' +
      '<div class="input-group"><label>Max open / user</label><input id="ticket-max-open" type="number" min="1" max="10" value="1"></div>' +
      "</div>" +
      '<div class="input-group"><label>Staff / support roles (see tickets + human handoff pings)</label>' +
      '<div class="inline-row"><select id="ticket-staff-role"><option value="">Select…</option></select> <button class="button" id="add-ticket-staff" type="button">Add</button></div></div>' +
      '<div id="ticket-staff-list" class="level-roles-list"></div>' +
      "<h3 class=\"subhead\">Channel naming</h3>" +
      '<p class="form-hint">Tokens: <code>{category}</code> <code>{label}</code> <code>{user}</code> <code>{n}</code> <code>{id}</code></p>' +
      '<div class="input-group"><label>Naming format</label><input id="ticket-naming" type="text" maxlength="80" placeholder="{category}-{user}-{n}"></div>' +
      "<h3 class=\"subhead\">Panel look</h3>" +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Panel title</label><input id="ticket-panel-title" type="text" maxlength="120"></div>' +
      '<div class="input-group"><label>Panel color (hex)</label><input id="ticket-panel-color" type="text" placeholder="#5865F2"></div>' +
      "</div>" +
      '<div class="input-group"><label>Panel description</label><textarea id="ticket-panel-desc" rows="3" maxlength="2000"></textarea></div>' +
      '<div class="input-group"><label>Welcome message (embed)</label><textarea id="ticket-welcome" rows="2" maxlength="1500"></textarea></div>' +
      "<h3 class=\"subhead\">Your categories</h3>" +
      '<p class="form-hint">Add your own. Each can have up to 5 questions.</p>' +
      '<div id="ticket-cats-list"></div>' +
      '<button class="button" type="button" id="ticket-cat-add" style="margin-top:8px">+ Add category</button>' +
      "<h3 class=\"subhead\">AI ticket agent</h3>" +
      '<label class="toggle"><input type="checkbox" id="ticket-ai-enabled"> <span>AI handles tickets</span></label>' +
      '<label class="toggle"><input type="checkbox" id="ticket-ai-no-mention" checked> <span>Reply without @mention</span></label>' +
      '<label class="toggle"><input type="checkbox" id="ticket-ai-ignore-staff" checked> <span>Ignore staff messages</span></label>' +
      '<div class="input-group"><label>AI intro (auto when ticket opens)</label><textarea id="ticket-ai-intro" rows="4" maxlength="1800"></textarea></div>' +
      '<div class="input-group"><label>AI system instructions</label><textarea id="ticket-ai-prompt" rows="3" maxlength="2000"></textarea></div>' +
      '<div class="input-group"><label>Escalate keywords</label><input id="ticket-ai-keywords" type="text" placeholder="human, representative, staff please"></div>' +
      '<div class="input-group"><label>Message when escalating</label><input id="ticket-ai-escalate-msg" type="text" maxlength="400"></div>' +
      '<div class="input-group"><label>Extra escalate role</label><div class="inline-row"><select id="ticket-ai-esc-role"><option value="">Select…</option></select> <button class="button" type="button" id="ticket-ai-esc-role-add">Add</button></div></div>' +
      '<div id="ticket-ai-esc-roles" class="level-roles-list"></div>' +
      '<div class="input-group"><label>Extra escalate user ID</label><div class="inline-row"><input id="ticket-ai-esc-user" type="text" placeholder="User snowflake"> <button class="button" type="button" id="ticket-ai-esc-user-add">Add</button></div></div>' +
      '<div id="ticket-ai-esc-users" class="level-roles-list"></div>' +
      '<button class="button" id="save-tickets" type="button" style="margin-top:12px">Save Ticket Settings</button>' +
      '<p class="form-hint" id="ticket-status"></p></div>'
    );
  }

  function ensureSection(force) {
    var content = document.querySelector(".content") || document.querySelector("main .content");
    var sec = $("tickets");
    if (!sec && content) {
      sec = document.createElement("section");
      sec.id = "tickets";
      sec.className = "page-section";
      content.appendChild(sec);
    }
    if (!sec) return false;
    var hasV3 = sec.querySelector('[data-tickets-panel="v3"]');
    if (force || !hasV3) {
      sec.innerHTML = panelHtml();
      wire();
    }
    return true;
  }

  function fillSelects() {
    var catEl = $("ticket-category-id");
    if (catEl) {
      var cur = catEl.value;
      catEl.innerHTML = '<option value="">Select a category…</option>';
      categoryChannels().forEach(function (c) {
        var o = document.createElement("option");
        o.value = c.id;
        o.textContent = c.name || c.id;
        catEl.appendChild(o);
      });
      if (cur) catEl.value = cur;
    }
    function fill(el, items, ph, isRole) {
      if (!el) return;
      var c = el.value;
      el.innerHTML = '<option value="">' + (ph || "Select…") + "</option>";
      items.forEach(function (x) {
        var o = document.createElement("option");
        o.value = x.id;
        o.textContent = isRole ? x.name || x.id : "#" + (x.name || x.id);
        el.appendChild(o);
      });
      if (c) el.value = c;
    }
    fill($("ticket-transcript-channel"), channels(), "None", false);
    fill($("ticket-staff-role"), roles(), "Select…", true);
    fill($("ticket-ai-esc-role"), roles(), "Select…", true);
  }

  function renderList(listId, ids, labelFn, rmAttr, onRm) {
    var list = $(listId);
    if (!list) return;
    if (!ids.length) { list.innerHTML = '<p class="form-hint">None yet.</p>'; return; }
    list.innerHTML = ids.map(function (id) {
      return '<div class="level-role-row">' + labelFn(id) + ' <button type="button" ' + rmAttr + '="' + id + '">Remove</button></div>';
    }).join("");
    list.querySelectorAll("[" + rmAttr + "]").forEach(function (btn) {
      btn.addEventListener("click", function () { onRm(btn.getAttribute(rmAttr)); });
    });
  }

  function renderStaff() {
    var rl = roles();
    renderList("ticket-staff-list", window.__ticketStaffIds || [], function (rid) {
      var r = rl.find(function (x) { return String(x.id) === String(rid); });
      return r ? r.name : rid;
    }, "data-rm-staff", function (rid) {
      window.__ticketStaffIds = (window.__ticketStaffIds || []).filter(function (x) { return String(x) !== String(rid); });
      renderStaff();
    });
  }
  function renderEscRoles() {
    var rl = roles();
    renderList("ticket-ai-esc-roles", window.__ticketEscRoles || [], function (rid) {
      var r = rl.find(function (x) { return String(x.id) === String(rid); });
      return r ? r.name : rid;
    }, "data-rm-esc", function (rid) {
      window.__ticketEscRoles = (window.__ticketEscRoles || []).filter(function (x) { return String(x) !== String(rid); });
      renderEscRoles();
    });
  }
  function renderEscUsers() {
    renderList("ticket-ai-esc-users", window.__ticketEscUsers || [], function (uid) { return uid; }, "data-rm-escu", function (uid) {
      window.__ticketEscUsers = (window.__ticketEscUsers || []).filter(function (x) { return String(x) !== String(uid); });
      renderEscUsers();
    });
  }

  function renderCats() {
    var list = $("ticket-cats-list");
    if (!list) return;
    if (!draftCats.length) draftCats = defaultCategories();
    list.innerHTML = draftCats.map(function (c, i) {
      var qs = Array.isArray(c.questions) ? c.questions : [];
      var qHtml = qs.map(function (q, qi) {
        return '<div class="config-grid" style="margin:6px 0;padding:8px;border:1px solid rgba(128,128,128,.25);border-radius:10px" data-q-i="' + qi + '">' +
          '<div class="input-group"><label>Q label</label><input data-qf="label" value="' + escapeAttr(q.label) + '"></div>' +
          '<div class="input-group"><label>Placeholder</label><input data-qf="placeholder" value="' + escapeAttr(q.placeholder || "") + '"></div>' +
          '<div class="input-group"><label>Long?</label><label class="toggle"><input type="checkbox" data-qf="paragraph"' + (q.paragraph ? " checked" : "") + '> <span>Paragraph</span></label></div>' +
          '<div class="input-group"><label>Required?</label><label class="toggle"><input type="checkbox" data-qf="required"' + (q.required !== false ? " checked" : "") + '> <span>Required</span></label></div>' +
          '<button type="button" class="button" data-rm-q="' + i + ":" + qi + '">Remove question</button></div>';
      }).join("");
      return '<div class="card" style="padding:12px;margin-bottom:12px" data-cat-i="' + i + '">' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>ID</label><input data-f="id" value="' + escapeAttr(c.id) + '"></div>' +
        '<div class="input-group"><label>Label</label><input data-f="label" value="' + escapeAttr(c.label) + '"></div>' +
        '<div class="input-group"><label>Emoji</label><input data-f="emoji" value="' + escapeAttr(c.emoji || "") + '"></div>' +
        '<div class="input-group"><label>AI</label><label class="toggle"><input type="checkbox" data-f="aiEnabled"' + (c.aiEnabled !== false ? " checked" : "") + '> <span>On</span></label></div></div>' +
        '<div class="input-group"><label>Description</label><input data-f="description" value="' + escapeAttr(c.description || "") + '"></div>' +
        '<div class="input-group"><label>AI instructions</label><textarea data-f="aiInstructions" rows="2">' + escapeHtml(c.aiInstructions || "") + '</textarea></div>' +
        '<h4 class="subhead">Questions</h4><div data-q-wrap="' + i + '">' + qHtml + '</div>' +
        '<button type="button" class="button" data-add-q="' + i + '">+ Add question</button> ' +
        '<button type="button" class="button" data-rm-cat="' + i + '">Remove category</button></div>';
    }).join("");
    list.querySelectorAll("[data-rm-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        syncCatsFromDom();
        draftCats.splice(parseInt(btn.getAttribute("data-rm-cat"), 10), 1);
        renderCats();
      });
    });
    list.querySelectorAll("[data-add-q]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        syncCatsFromDom();
        var i = parseInt(btn.getAttribute("data-add-q"), 10);
        if (!draftCats[i].questions) draftCats[i].questions = [];
        if (draftCats[i].questions.length >= 5) return;
        draftCats[i].questions.push({ id: "q" + (draftCats[i].questions.length + 1), label: "New question", placeholder: "", required: true, paragraph: false });
        renderCats();
      });
    });
    list.querySelectorAll("[data-rm-q]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        syncCatsFromDom();
        var p = btn.getAttribute("data-rm-q").split(":");
        draftCats[parseInt(p[0], 10)].questions.splice(parseInt(p[1], 10), 1);
        renderCats();
      });
    });
  }

  function syncCatsFromDom() {
    var list = $("ticket-cats-list");
    if (!list) return;
    var next = [];
    list.querySelectorAll("[data-cat-i]").forEach(function (card) {
      var get = function (f) {
        var el = null;
        card.querySelectorAll("[data-f]").forEach(function (node) {
          if (node.closest("[data-q-i]")) return;
          if (node.getAttribute("data-f") === f) el = node;
        });
        if (!el) return "";
        if (el.type === "checkbox") return el.checked;
        return el.value;
      };
      var questions = [];
      card.querySelectorAll("[data-q-i]").forEach(function (qcard, qi) {
        var qget = function (f) {
          var el = qcard.querySelector('[data-qf="' + f + '"]');
          if (!el) return "";
          if (el.type === "checkbox") return el.checked;
          return el.value;
        };
        questions.push({ id: "q" + (qi + 1), label: String(qget("label") || "Question").slice(0, 45), placeholder: String(qget("placeholder") || "").slice(0, 100), required: !!qget("required"), paragraph: !!qget("paragraph") });
      });
      next.push({
        id: String(get("id") || "cat").slice(0, 40),
        label: String(get("label") || "Category").slice(0, 80),
        emoji: String(get("emoji") || "🎫").slice(0, 16),
        description: String(get("description") || "").slice(0, 100),
        aiEnabled: !!get("aiEnabled"),
        aiInstructions: String(get("aiInstructions") || "").slice(0, 800),
        questions: questions,
        staffRoleIds: [], escalateRoleIds: [], escalateUserIds: []
      });
    });
    if (next.length) draftCats = next;
  }

  function hexToInt(hex) {
    var h = String(hex || "").replace("#", "").trim();
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return 0x5865f2;
    return parseInt(h, 16);
  }
  function intToHex(n) {
    var x = Number(n);
    if (!Number.isFinite(x)) return "#5865F2";
    return "#" + ("000000" + (x >>> 0).toString(16)).slice(-6).toUpperCase();
  }

  function applyFromConfig() {
    var T = (window.currentConfig || {}).tickets || {};
    if ($("ticket-enabled")) $("ticket-enabled").checked = T.enabled !== false;
    if ($("ticket-category-id")) $("ticket-category-id").value = T.categoryId || "";
    if ($("ticket-category-manual")) $("ticket-category-manual").value = T.categoryId || "";
    if ($("ticket-transcript-channel")) $("ticket-transcript-channel").value = T.transcriptChannelId || "";
    if ($("ticket-max-open")) $("ticket-max-open").value = T.maxOpenPerUser != null ? T.maxOpenPerUser : 1;
    if ($("ticket-naming")) $("ticket-naming").value = T.namingFormat || "{category}-{user}-{n}";
    if ($("ticket-panel-title")) $("ticket-panel-title").value = T.panelTitle || "Support Center";
    if ($("ticket-panel-desc")) $("ticket-panel-desc").value = T.panelDescription || "Need help?\n\nSelect a category below.";
    if ($("ticket-panel-color")) $("ticket-panel-color").value = intToHex(T.panelColor);
    if ($("ticket-welcome")) $("ticket-welcome").value = T.welcomeMessage || "Staff will be with you shortly.";
    window.__ticketStaffIds = Array.isArray(T.staffRoleIds) ? T.staffRoleIds.map(String) : [];
    draftCats = Array.isArray(T.categories) && T.categories.length ? T.categories.map(function (c) {
      return { id: c.id, label: c.label, emoji: c.emoji, description: c.description || "", aiEnabled: c.aiEnabled !== false, aiInstructions: c.aiInstructions || "", questions: Array.isArray(c.questions) ? c.questions : [], staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] };
    }) : defaultCategories();
    var ai = T.ai || {};
    if ($("ticket-ai-enabled")) $("ticket-ai-enabled").checked = !!ai.enabled;
    if ($("ticket-ai-no-mention")) $("ticket-ai-no-mention").checked = ai.respondWithoutMention !== false;
    if ($("ticket-ai-ignore-staff")) $("ticket-ai-ignore-staff").checked = ai.ignoreStaffMessages !== false;
    if ($("ticket-ai-intro")) $("ticket-ai-intro").value = ai.introMessage || DEFAULT_INTRO;
    if ($("ticket-ai-prompt")) $("ticket-ai-prompt").value = ai.systemPrompt || "You are a helpful support agent. Remind them they can say human for staff.";
    if ($("ticket-ai-keywords")) $("ticket-ai-keywords").value = (ai.autoEscalateKeywords || ["human", "representative", "staff please"]).join(", ");
    if ($("ticket-ai-escalate-msg")) $("ticket-ai-escalate-msg").value = ai.escalateMessage || "Got it — connecting you with a human representative now.";
    window.__ticketEscRoles = Array.isArray(ai.escalateRoleIds) ? ai.escalateRoleIds.map(String) : [];
    window.__ticketEscUsers = Array.isArray(ai.escalateUserIds) ? ai.escalateUserIds.map(String) : [];
    fillSelects();
    renderStaff();
    renderEscRoles();
    renderEscUsers();
    renderCats();
  }

  async function save() {
    try {
      if (!window.saveConfig) throw new Error("saveConfig missing — are you logged in?");
      setStatus("Saving…", true);
      syncCatsFromDom();
      var catId = ($("ticket-category-manual") && $("ticket-category-manual").value.trim()) || ($("ticket-category-id") && $("ticket-category-id").value) || null;
      var keywords = String(($("ticket-ai-keywords") && $("ticket-ai-keywords").value) || "").split(/[,\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
      var body = {
        tickets: {
          enabled: $("ticket-enabled") ? $("ticket-enabled").checked : true,
          categoryId: catId,
          transcriptChannelId: $("ticket-transcript-channel") && $("ticket-transcript-channel").value ? $("ticket-transcript-channel").value : null,
          maxOpenPerUser: parseInt(($("ticket-max-open") && $("ticket-max-open").value) || "1", 10) || 1,
          namingFormat: ($("ticket-naming") && $("ticket-naming").value.trim()) || "{category}-{user}-{n}",
          staffRoleIds: window.__ticketStaffIds || [],
          panelTitle: ($("ticket-panel-title") && $("ticket-panel-title").value) || "Support Center",
          panelDescription: ($("ticket-panel-desc") && $("ticket-panel-desc").value) || "Need help?",
          panelColor: hexToInt($("ticket-panel-color") && $("ticket-panel-color").value),
          welcomeMessage: ($("ticket-welcome") && $("ticket-welcome").value) || "Staff will be with you shortly.",
          categories: draftCats,
          ai: {
            enabled: $("ticket-ai-enabled") ? $("ticket-ai-enabled").checked : false,
            respondWithoutMention: $("ticket-ai-no-mention") ? $("ticket-ai-no-mention").checked : true,
            ignoreStaffMessages: $("ticket-ai-ignore-staff") ? $("ticket-ai-ignore-staff").checked : true,
            introMessage: ($("ticket-ai-intro") && $("ticket-ai-intro").value) || DEFAULT_INTRO,
            systemPrompt: ($("ticket-ai-prompt") && $("ticket-ai-prompt").value) || "",
            autoEscalateKeywords: keywords.length ? keywords : ["human", "representative", "staff please"],
            escalateMessage: ($("ticket-ai-escalate-msg") && $("ticket-ai-escalate-msg").value) || "Got it — connecting you with a human representative now.",
            escalateRoleIds: window.__ticketEscRoles || [],
            escalateUserIds: window.__ticketEscUsers || []
          }
        }
      };
      var d = await window.saveConfig(body);
      setStatus(d && d.savedToBot === false ? "Saved on website. Bot offline." : "✅ Saved. Run /ticket-panel in Discord.", true);
      if (window.loadGuildData) await window.loadGuildData();
      applyFromConfig();
    } catch (e) {
      setStatus("❌ " + (e.message || "Failed"), false);
    }
  }

  function wire() {
    var addStaff = $("add-ticket-staff");
    if (addStaff) {
      var ns = addStaff.cloneNode(true);
      addStaff.parentNode.replaceChild(ns, addStaff);
      ns.addEventListener("click", function () {
        var sel = $("ticket-staff-role");
        if (!sel || !sel.value) return;
        window.__ticketStaffIds = window.__ticketStaffIds || [];
        if (window.__ticketStaffIds.indexOf(sel.value) < 0) window.__ticketStaffIds.push(sel.value);
        renderStaff();
      });
    }
    var addEscR = $("ticket-ai-esc-role-add");
    if (addEscR && !addEscR.__w3) {
      addEscR.__w3 = true;
      addEscR.addEventListener("click", function () {
        var sel = $("ticket-ai-esc-role");
        if (!sel || !sel.value) return;
        window.__ticketEscRoles = window.__ticketEscRoles || [];
        if (window.__ticketEscRoles.indexOf(sel.value) < 0) window.__ticketEscRoles.push(sel.value);
        renderEscRoles();
      });
    }
    var addEscU = $("ticket-ai-esc-user-add");
    if (addEscU && !addEscU.__w3) {
      addEscU.__w3 = true;
      addEscU.addEventListener("click", function () {
        var inp = $("ticket-ai-esc-user");
        var v = inp && inp.value.trim();
        if (!v) return;
        window.__ticketEscUsers = window.__ticketEscUsers || [];
        if (window.__ticketEscUsers.indexOf(v) < 0) window.__ticketEscUsers.push(v);
        if (inp) inp.value = "";
        renderEscUsers();
      });
    }
    var addCat = $("ticket-cat-add");
    if (addCat && !addCat.__w3) {
      addCat.__w3 = true;
      addCat.addEventListener("click", function () {
        syncCatsFromDom();
        draftCats.push({ id: "cat" + (draftCats.length + 1), label: "New category", emoji: "🎫", description: "", aiEnabled: true, aiInstructions: "", questions: [], staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] });
        renderCats();
      });
    }
    var saveBtn = $("save-tickets");
    if (saveBtn) {
      var neo = saveBtn.cloneNode(true);
      neo.__p26 = 1; // stop features-config-patch from rebinding
      saveBtn.parentNode.replaceChild(neo, saveBtn);
      neo.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        save();
      }, true);
    }
  }

  function boot(force) {
    if (!ensureSection(!!force)) return;
    fillSelects();
    applyFromConfig();
    wire();
  }
  window.__featuresTicketsV3Boot = boot;

  [0, 200, 600, 1500, 3000, 6000].forEach(function (ms) {
    setTimeout(function () { boot(true); }, ms);
  });

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-tab="tickets"]');
    if (t) setTimeout(function () { boot(true); }, 40);
  }, true);

  document.addEventListener("tickets:upgrade", function () { boot(true); });

  console.log("[features-tickets] v3 — hooks drawer Tickets tab");
})();
