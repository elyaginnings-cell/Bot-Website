/**
 * Tickets dashboard panel v1 — full customization + AI agent settings
 */
(function () {
  "use strict";
  if (window.__featuresTicketsV1) return;
  window.__featuresTicketsV1 = true;

  function $(id) {
    return document.getElementById(id);
  }

  function channels() {
    try {
      if (window.syncGlobals) window.syncGlobals();
    } catch (_) {}
    return (window.channelsCache || []).filter(function (c) {
      return c && (c.type === 0 || c.type === 5 || c.type == null || c.type === "GUILD_TEXT");
    });
  }

  function categories() {
    try {
      if (window.syncGlobals) window.syncGlobals();
    } catch (_) {}
    return (window.channelsCache || []).filter(function (c) {
      return c && (c.type === 4 || c.type === "GUILD_CATEGORY" || String(c.type) === "4");
    });
  }

  function roles() {
    try {
      if (window.syncGlobals) window.syncGlobals();
    } catch (_) {}
    return window.rolesCache || [];
  }

  function fillSelect(el, items, placeholder, isRole) {
    if (!el) return;
    var cur = el.value;
    el.innerHTML = '<option value="">' + (placeholder || "Select…") + "</option>";
    items.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x.id;
      o.textContent = isRole ? x.name || x.id : "#" + (x.name || x.id);
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }

  function setStatus(text, ok) {
    var el = $("ticket-status");
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  function defaultCategories() {
    return [
      { id: "general", label: "General Support", emoji: "🛠️", aiEnabled: true, aiInstructions: "", staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] },
      { id: "report", label: "Report a User", emoji: "🚨", aiEnabled: true, aiInstructions: "Collect evidence and escalate serious reports.", staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] },
      { id: "partner", label: "Partnership", emoji: "🤝", aiEnabled: false, aiInstructions: "", staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] },
      { id: "bug", label: "Bug Report", emoji: "🐛", aiEnabled: true, aiInstructions: "Ask for steps to reproduce.", staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] },
      { id: "other", label: "Other", emoji: "💬", aiEnabled: true, aiInstructions: "", staffRoleIds: [], escalateRoleIds: [], escalateUserIds: [] }
    ];
  }

  var draftCats = defaultCategories();

  function ensureSection() {
    var sec = $("tickets");
    if (!sec) return false;

    // Replace minimal panel with full UI once
    if (sec.getAttribute("data-tickets-v1") === "1") return true;
    sec.setAttribute("data-tickets-v1", "1");

    sec.innerHTML =
      '<div class="card form-card wide">' +
      '<span class="eyebrow">TICKETS</span>' +
      "<h2>Support tickets</h2>" +
      '<p class="form-hint">Fully customizable. After saving, run <code>/ticket-panel</code> in Discord to post (or re-post) the panel.</p>' +
      '<label class="toggle"><input type="checkbox" id="ticket-enabled" checked> <span>Enabled</span></label>' +
      "<h3 class=\"subhead\">Channels & staff</h3>" +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Discord category (parent)</label><select id="ticket-category-id"><option value="">Select…</option></select></div>' +
      '<div class="input-group"><label>Or paste category ID</label><input id="ticket-category-manual" type="text" placeholder="Snowflake ID"></div>' +
      '<div class="input-group"><label>Transcript channel</label><select id="ticket-transcript-channel"><option value="">None</option></select></div>' +
      '<div class="input-group"><label>Max open tickets / user</label><input id="ticket-max-open" type="number" min="1" max="10" value="1"></div>' +
      "</div>" +
      '<div class="input-group"><label>Staff roles (see all tickets)</label><div class="inline-row"><select id="ticket-staff-role"><option value="">Select a role…</option></select> <button class="button" id="add-ticket-staff" type="button">Add</button></div></div>' +
      '<div id="ticket-staff-list" class="level-roles-list"></div>' +
      "<h3 class=\"subhead\">Panel look</h3>" +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Panel title</label><input id="ticket-panel-title" type="text" maxlength="120" placeholder="Support Center"></div>' +
      '<div class="input-group"><label>Panel color (hex)</label><input id="ticket-panel-color" type="text" placeholder="#5865F2"></div>' +
      "</div>" +
      '<div class="input-group" style="grid-column:1/-1"><label>Panel description</label><textarea id="ticket-panel-desc" rows="3" maxlength="2000" placeholder="Need help? Select a category…"></textarea></div>' +
      '<div class="input-group" style="grid-column:1/-1"><label>Welcome message (inside ticket)</label><textarea id="ticket-welcome" rows="2" maxlength="1500" placeholder="Staff will be with you shortly…"></textarea></div>' +
      "<h3 class=\"subhead\">Categories</h3>" +
      '<p class="form-hint">These appear in the dropdown on the panel. Up to 25. Toggle AI per category.</p>' +
      '<div id="ticket-cats-list"></div>' +
      '<div class="inline-row" style="margin-top:8px;gap:8px;flex-wrap:wrap">' +
      '<button class="button" type="button" id="ticket-cat-add">+ Add category</button>' +
      "</div>" +
      "<h3 class=\"subhead\">AI ticket agent</h3>" +
      '<label class="toggle"><input type="checkbox" id="ticket-ai-enabled"> <span>AI handles tickets automatically</span></label>' +
      '<p class="form-hint">When on, the bot replies in open tickets. If it cannot help (or the user says human / manager / escalate), it pings the roles/users below.</p>' +
      '<label class="toggle"><input type="checkbox" id="ticket-ai-no-mention" checked> <span>Reply without @mention (recommended)</span></label>' +
      '<label class="toggle"><input type="checkbox" id="ticket-ai-ignore-staff" checked> <span>Ignore staff messages in tickets</span></label>' +
      '<div class="input-group" style="grid-column:1/-1"><label>AI system instructions</label><textarea id="ticket-ai-prompt" rows="3" maxlength="2000" placeholder="You are a helpful support agent…"></textarea></div>' +
      '<div class="input-group" style="grid-column:1/-1"><label>Escalate keywords (comma-separated)</label><input id="ticket-ai-keywords" type="text" placeholder="human, manager, admin, staff please, escalate"></div>' +
      '<div class="input-group" style="grid-column:1/-1"><label>Message when escalating</label><input id="ticket-ai-escalate-msg" type="text" maxlength="400" placeholder="I\'ve looped in the team…"></div>' +
      '<div class="input-group"><label>Default escalate role</label><div class="inline-row"><select id="ticket-ai-esc-role"><option value="">Select…</option></select> <button class="button" type="button" id="ticket-ai-esc-role-add">Add</button></div></div>' +
      '<div id="ticket-ai-esc-roles" class="level-roles-list"></div>' +
      '<div class="input-group"><label>Default escalate user ID</label><div class="inline-row"><input id="ticket-ai-esc-user" type="text" placeholder="User snowflake"> <button class="button" type="button" id="ticket-ai-esc-user-add">Add</button></div></div>' +
      '<div id="ticket-ai-esc-users" class="level-roles-list"></div>' +
      '<button class="button" id="save-tickets" type="button" style="margin-top:12px">Save Ticket Settings</button>' +
      '<p class="form-hint" id="ticket-status"></p>' +
      "</div>";

    wire();
    return true;
  }

  function renderStaff() {
    var list = $("ticket-staff-list");
    if (!list) return;
    var ids = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
    // keep in sync with draft if we just edited — use data attribute store
    if (window.__ticketStaffIds) ids = window.__ticketStaffIds;
    else window.__ticketStaffIds = ids.slice();

    var rl = roles();
    if (!ids.length) {
      list.innerHTML = '<p class="form-hint">No staff roles yet.</p>';
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
          ' <button type="button" data-rm-staff="' +
          rid +
          '">Remove</button></div>'
        );
      })
      .join("");
    list.querySelectorAll("[data-rm-staff]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var rid = btn.getAttribute("data-rm-staff");
        window.__ticketStaffIds = (window.__ticketStaffIds || []).filter(function (x) {
          return String(x) !== String(rid);
        });
        renderStaff();
      });
    });
  }

  function renderEscRoles() {
    var list = $("ticket-ai-esc-roles");
    if (!list) return;
    var ids = window.__ticketEscRoles || [];
    var rl = roles();
    if (!ids.length) {
      list.innerHTML = '<p class="form-hint">None — will fall back to staff roles.</p>';
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
          ' <button type="button" data-rm-esc="' +
          rid +
          '">Remove</button></div>'
        );
      })
      .join("");
    list.querySelectorAll("[data-rm-esc]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var rid = btn.getAttribute("data-rm-esc");
        window.__ticketEscRoles = (window.__ticketEscRoles || []).filter(function (x) {
          return String(x) !== String(rid);
        });
        renderEscRoles();
      });
    });
  }

  function renderEscUsers() {
    var list = $("ticket-ai-esc-users");
    if (!list) return;
    var ids = window.__ticketEscUsers || [];
    if (!ids.length) {
      list.innerHTML = '<p class="form-hint">No specific users.</p>';
      return;
    }
    list.innerHTML = ids
      .map(function (uid) {
        return (
          '<div class="level-role-row">' +
          uid +
          ' <button type="button" data-rm-escu="' +
          uid +
          '">Remove</button></div>'
        );
      })
      .join("");
    list.querySelectorAll("[data-rm-escu]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var uid = btn.getAttribute("data-rm-escu");
        window.__ticketEscUsers = (window.__ticketEscUsers || []).filter(function (x) {
          return String(x) !== String(uid);
        });
        renderEscUsers();
      });
    });
  }

  function renderCats() {
    var list = $("ticket-cats-list");
    if (!list) return;
    if (!draftCats.length) draftCats = defaultCategories();
    list.innerHTML = draftCats
      .map(function (c, i) {
        return (
          '<div class="card" style="padding:12px;margin-bottom:10px" data-cat-i="' +
          i +
          '">' +
          '<div class="config-grid">' +
          '<div class="input-group"><label>ID</label><input data-f="id" value="' +
          escapeAttr(c.id) +
          '"></div>' +
          '<div class="input-group"><label>Label</label><input data-f="label" value="' +
          escapeAttr(c.label) +
          '"></div>' +
          '<div class="input-group"><label>Emoji</label><input data-f="emoji" value="' +
          escapeAttr(c.emoji || "") +
          '"></div>' +
          '<div class="input-group"><label>AI on this category</label><label class="toggle"><input type="checkbox" data-f="aiEnabled"' +
          (c.aiEnabled !== false ? " checked" : "") +
          '> <span>AI enabled</span></label></div>' +
          "</div>" +
          '<div class="input-group"><label>Description (dropdown hint)</label><input data-f="description" value="' +
          escapeAttr(c.description || "") +
          '"></div>' +
          '<div class="input-group"><label>AI instructions for this category</label><textarea data-f="aiInstructions" rows="2">' +
          escapeHtml(c.aiInstructions || "") +
          "</textarea></div>" +
          '<button type="button" class="button" data-rm-cat="' +
          i +
          '">Remove category</button>' +
          "</div>"
        );
      })
      .join("");

    list.querySelectorAll("[data-rm-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        syncCatsFromDom();
        var i = parseInt(btn.getAttribute("data-rm-cat"), 10);
        draftCats.splice(i, 1);
        renderCats();
      });
    });
  }

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/"/g, """)
      .replace(/</g, "<");
  }
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/</g, "<");
  }

  function syncCatsFromDom() {
    var list = $("ticket-cats-list");
    if (!list) return;
    var next = [];
    list.querySelectorAll("[data-cat-i]").forEach(function (card) {
      var get = function (f) {
        var el = card.querySelector('[data-f="' + f + '"]');
        if (!el) return "";
        if (el.type === "checkbox") return el.checked;
        return el.value;
      };
      next.push({
        id: String(get("id") || "cat").slice(0, 40),
        label: String(get("label") || "Category").slice(0, 80),
        emoji: String(get("emoji") || "🎫").slice(0, 16),
        description: String(get("description") || "").slice(0, 100),
        aiEnabled: !!get("aiEnabled"),
        aiInstructions: String(get("aiInstructions") || "").slice(0, 800),
        staffRoleIds: [],
        escalateRoleIds: [],
        escalateUserIds: []
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
    if ($("ticket-panel-title")) $("ticket-panel-title").value = T.panelTitle || "Support Center";
    if ($("ticket-panel-desc"))
      $("ticket-panel-desc").value =
        T.panelDescription || "Need help?\n\nSelect a category below to open a private ticket with staff.";
    if ($("ticket-panel-color")) $("ticket-panel-color").value = intToHex(T.panelColor);
    if ($("ticket-welcome"))
      $("ticket-welcome").value = T.welcomeMessage || "Staff will be with you shortly. Please describe your issue.";

    window.__ticketStaffIds = Array.isArray(T.staffRoleIds) ? T.staffRoleIds.map(String) : [];
    draftCats = Array.isArray(T.categories) && T.categories.length ? T.categories.map(function (c) {
      return {
        id: c.id,
        label: c.label,
        emoji: c.emoji,
        description: c.description || "",
        aiEnabled: c.aiEnabled !== false,
        aiInstructions: c.aiInstructions || "",
        staffRoleIds: c.staffRoleIds || [],
        escalateRoleIds: c.escalateRoleIds || [],
        escalateUserIds: c.escalateUserIds || []
      };
    }) : defaultCategories();

    var ai = T.ai || {};
    if ($("ticket-ai-enabled")) $("ticket-ai-enabled").checked = !!ai.enabled;
    if ($("ticket-ai-no-mention")) $("ticket-ai-no-mention").checked = ai.respondWithoutMention !== false;
    if ($("ticket-ai-ignore-staff")) $("ticket-ai-ignore-staff").checked = ai.ignoreStaffMessages !== false;
    if ($("ticket-ai-prompt"))
      $("ticket-ai-prompt").value =
        ai.systemPrompt ||
        "You are a helpful Discord support agent. Be concise. If you cannot help, end with ESCALATE: reason.";
    if ($("ticket-ai-keywords"))
      $("ticket-ai-keywords").value = (ai.autoEscalateKeywords || ["human", "manager", "admin", "staff please", "escalate"]).join(", ");
    if ($("ticket-ai-escalate-msg"))
      $("ticket-ai-escalate-msg").value =
        ai.escalateMessage || "I've looped in the team for this one — they'll take it from here.";

    window.__ticketEscRoles = Array.isArray(ai.escalateRoleIds) ? ai.escalateRoleIds.map(String) : [];
    window.__ticketEscUsers = Array.isArray(ai.escalateUserIds) ? ai.escalateUserIds.map(String) : [];

    fillSelects();
    renderStaff();
    renderEscRoles();
    renderEscUsers();
    renderCats();
  }

  function fillSelects() {
    fillSelect($("ticket-category-id"), categories(), "Select a category…", false);
    // category select uses category channels — fix labels
    var catEl = $("ticket-category-id");
    if (catEl) {
      var cur = catEl.value;
      catEl.innerHTML = '<option value="">Select a category…</option>';
      categories().forEach(function (c) {
        var o = document.createElement("option");
        o.value = c.id;
        o.textContent = c.name || c.id;
        catEl.appendChild(o);
      });
      if (cur) catEl.value = cur;
    }
    fillSelect($("ticket-transcript-channel"), channels(), "None", false);
    fillSelect($("ticket-staff-role"), roles(), "Select a role…", true);
    fillSelect($("ticket-ai-esc-role"), roles(), "Select…", true);
  }

  async function save() {
    try {
      if (!window.saveConfig) throw new Error("saveConfig missing");
      setStatus("Saving…", true);
      syncCatsFromDom();

      var catId =
        ($("ticket-category-manual") && $("ticket-category-manual").value.trim()) ||
        ($("ticket-category-id") && $("ticket-category-id").value) ||
        null;

      var keywords = String(($("ticket-ai-keywords") && $("ticket-ai-keywords").value) || "")
        .split(/[,\n]/)
        .map(function (s) {
          return s.trim();
        })
        .filter(Boolean);

      var body = {
        tickets: {
          enabled: $("ticket-enabled") ? $("ticket-enabled").checked : true,
          categoryId: catId,
          transcriptChannelId:
            $("ticket-transcript-channel") && $("ticket-transcript-channel").value
              ? $("ticket-transcript-channel").value
              : null,
          maxOpenPerUser: parseInt(($("ticket-max-open") && $("ticket-max-open").value) || "1", 10) || 1,
          staffRoleIds: window.__ticketStaffIds || [],
          panelTitle: ($("ticket-panel-title") && $("ticket-panel-title").value) || "Support Center",
          panelDescription:
            ($("ticket-panel-desc") && $("ticket-panel-desc").value) ||
            "Need help? Select a category below.",
          panelColor: hexToInt($("ticket-panel-color") && $("ticket-panel-color").value),
          welcomeMessage:
            ($("ticket-welcome") && $("ticket-welcome").value) ||
            "Staff will be with you shortly.",
          categories: draftCats,
          ai: {
            enabled: $("ticket-ai-enabled") ? $("ticket-ai-enabled").checked : false,
            respondWithoutMention: $("ticket-ai-no-mention") ? $("ticket-ai-no-mention").checked : true,
            ignoreStaffMessages: $("ticket-ai-ignore-staff") ? $("ticket-ai-ignore-staff").checked : true,
            systemPrompt: ($("ticket-ai-prompt") && $("ticket-ai-prompt").value) || "",
            autoEscalateKeywords: keywords.length ? keywords : ["human", "manager", "escalate"],
            escalateMessage:
              ($("ticket-ai-escalate-msg") && $("ticket-ai-escalate-msg").value) ||
              "I've looped in the team for this one.",
            escalateRoleIds: window.__ticketEscRoles || [],
            escalateUserIds: window.__ticketEscUsers || []
          }
        }
      };

      var d = await window.saveConfig(body);
      setStatus(
        d && d.savedToBot === false
          ? "Saved on website. Bot offline — will sync when bot is up."
          : "✅ Ticket settings saved. Run /ticket-panel to refresh the Discord panel.",
        true
      );
      if (window.loadGuildData) await window.loadGuildData();
      applyFromConfig();
    } catch (e) {
      setStatus("❌ " + (e.message || "Failed"), false);
    }
  }

  function wire() {
    var addStaff = $("add-ticket-staff");
    if (addStaff && !addStaff.__wired) {
      addStaff.__wired = true;
      addStaff.addEventListener("click", function () {
        var sel = $("ticket-staff-role");
        if (!sel || !sel.value) return;
        window.__ticketStaffIds = window.__ticketStaffIds || [];
        if (window.__ticketStaffIds.indexOf(sel.value) < 0) window.__ticketStaffIds.push(sel.value);
        renderStaff();
      });
    }
    var addEscR = $("ticket-ai-esc-role-add");
    if (addEscR && !addEscR.__wired) {
      addEscR.__wired = true;
      addEscR.addEventListener("click", function () {
        var sel = $("ticket-ai-esc-role");
        if (!sel || !sel.value) return;
        window.__ticketEscRoles = window.__ticketEscRoles || [];
        if (window.__ticketEscRoles.indexOf(sel.value) < 0) window.__ticketEscRoles.push(sel.value);
        renderEscRoles();
      });
    }
    var addEscU = $("ticket-ai-esc-user-add");
    if (addEscU && !addEscU.__wired) {
      addEscU.__wired = true;
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
    if (addCat && !addCat.__wired) {
      addCat.__wired = true;
      addCat.addEventListener("click", function () {
        syncCatsFromDom();
        draftCats.push({
          id: "cat" + (draftCats.length + 1),
          label: "New category",
          emoji: "🎫",
          description: "",
          aiEnabled: true,
          aiInstructions: "",
          staffRoleIds: [],
          escalateRoleIds: [],
          escalateUserIds: []
        });
        renderCats();
      });
    }
    var saveBtn = $("save-tickets");
    if (saveBtn && !saveBtn.__wired) {
      saveBtn.__wired = true;
      saveBtn.addEventListener("click", function (e) {
        e.preventDefault();
        save();
      });
    }
  }

  function boot() {
    if (!ensureSection()) return;
    fillSelects();
    applyFromConfig();
    wire();
  }

  [0, 400, 1200, 3000].forEach(function (ms) {
    setTimeout(boot, ms);
  });

  // re-apply when config loads
  var _apply = window.applyGuildConfigToUI;
  if (typeof _apply === "function" && !_apply.__ticketsWrapped) {
    window.applyGuildConfigToUI = function () {
      var r = _apply.apply(this, arguments);
      try {
        boot();
      } catch (_) {}
      return r;
    };
    window.applyGuildConfigToUI.__ticketsWrapped = true;
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-tab="tickets"]');
      if (t) setTimeout(boot, 50);
    },
    true
  );

  console.log("[features-tickets] v1 ready");
})();
