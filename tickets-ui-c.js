  function applyFromConfig() {
    var T = ((window.currentConfig || {}).tickets || {});
    var ai = T.ai && typeof T.ai === "object" ? T.ai : {};
    var en = $("ticket-enabled");
    if (en) en.checked = T.enabled !== false;
    var max = $("ticket-max-open");
    if (max) max.value = T.maxOpenPerUser != null ? T.maxOpenPerUser : 1;
    var naming = $("ticket-naming");
    if (naming) naming.value = T.namingFormat || "{category}-{user}-{n}";
    var title = $("ticket-panel-title");
    if (title) title.value = T.panelTitle || "Support Center";
    var color = $("ticket-panel-color");
    if (color) color.value = T.panelColor != null ? T.panelColor : 5793266;
    var desc = $("ticket-panel-desc");
    if (desc) desc.value = T.panelDescription || "Need help?\n\nSelect a category below to open a private ticket with staff.";
    var welcome = $("ticket-welcome");
    if (welcome) welcome.value = T.welcomeMessage || "Staff will be with you shortly. Please describe your issue.";
    var aiEn = $("ticket-ai-enabled");
    if (aiEn) aiEn.checked = !!ai.enabled;
    var aiNom = $("ticket-ai-nomention");
    if (aiNom) aiNom.checked = ai.respondWithoutMention !== false;
    var aiIgn = $("ticket-ai-ignore-staff");
    if (aiIgn) aiIgn.checked = ai.ignoreStaffMessages !== false;
    var intro = $("ticket-ai-intro");
    if (intro) intro.value = ai.introMessage || DEFAULT_INTRO;
    var escMsg = $("ticket-ai-escalate-msg");
    if (escMsg) escMsg.value = ai.escalateMessage || "Got it — connecting you with a human representative now.";
    var kws = $("ticket-ai-keywords");
    if (kws) {
      kws.value = Array.isArray(ai.autoEscalateKeywords)
        ? ai.autoEscalateKeywords.join(", ")
        : "human, representative, staff please, escalate";
    }
    fillGlobalSelects(T);
    if (T.categoryId && $("ticket-category-id")) $("ticket-category-id").value = T.categoryId;
    if (T.transcriptChannelId && $("ticket-transcript-channel")) $("ticket-transcript-channel").value = T.transcriptChannelId;
    if (T.panelChannelId && $("ticket-panel-channel")) $("ticket-panel-channel").value = T.panelChannelId;
    renderStaff(T.staffRoleIds || []);
    if (!draftCats || !(T.categories && T.categories.length && window.__ticketsKeepDraft)) {
      draftCats = cloneCats(T.categories && T.categories.length ? T.categories.map(normalizeCat) : DEFAULT_CATS);
    }
    renderCats();
  }

  function collectPayload() {
    var cats = harvestCatsFromDom();
    var staff = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
    var catId = "";
    if ($("ticket-category-id") && $("ticket-category-id").value) catId = $("ticket-category-id").value;
    if ($("ticket-category-manual") && $("ticket-category-manual").value.trim()) {
      catId = $("ticket-category-manual").value.trim() || catId;
    }
    var kws = ($("ticket-ai-keywords") && $("ticket-ai-keywords").value) || "";
    return {
      enabled: $("ticket-enabled") ? $("ticket-enabled").checked : true,
      categoryId: catId || null,
      transcriptChannelId: $("ticket-transcript-channel") ? $("ticket-transcript-channel").value || null : null,
      panelChannelId: $("ticket-panel-channel") ? $("ticket-panel-channel").value || null : null,
      panelTitle: $("ticket-panel-title") ? $("ticket-panel-title").value || "Support Center" : "Support Center",
      panelDescription: $("ticket-panel-desc") ? $("ticket-panel-desc").value || "" : "",
      panelColor: $("ticket-panel-color") && $("ticket-panel-color").value ? Number($("ticket-panel-color").value) : 5793266,
      welcomeMessage: $("ticket-welcome") ? $("ticket-welcome").value || DEFAULT_INTRO : DEFAULT_INTRO,
      namingFormat: $("ticket-naming") ? $("ticket-naming").value || "{category}-{user}-{n}" : "{category}-{user}-{n}",
      maxOpenPerUser: Math.max(1, Math.min(10, Number($("ticket-max-open") && $("ticket-max-open").value) || 1)),
      staffRoleIds: staff.map(String),
      categories: cats,
      ai: {
        enabled: $("ticket-ai-enabled") ? $("ticket-ai-enabled").checked : false,
        respondWithoutMention: $("ticket-ai-nomention") ? $("ticket-ai-nomention").checked : true,
        ignoreStaffMessages: $("ticket-ai-ignore-staff") ? $("ticket-ai-ignore-staff").checked : true,
        introMessage: $("ticket-ai-intro") ? $("ticket-ai-intro").value || DEFAULT_INTRO : DEFAULT_INTRO,
        escalateMessage: $("ticket-ai-escalate-msg")
          ? $("ticket-ai-escalate-msg").value || "Got it — connecting you with a human representative now."
          : "Got it — connecting you with a human representative now.",
        autoEscalateKeywords: kws.split(",").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 40)
      }
    };
  }

  async function saveTickets(ev) {
    if (ev) { ev.preventDefault(); ev.stopImmediatePropagation(); }
    if (!window.saveConfig) { setStatus("Dashboard save is not ready yet. Refresh once.", false); return; }
    try {
      setStatus("Saving…", true);
      window.__ticketsKeepDraft = true;
      var payload = collectPayload();
      var d = await window.saveConfig({ tickets: payload });
      var msg = d && d.savedToBot === false ? "Saved on website. Bot offline — redeploy Railway, then /ticket-panel." : "✅ Tickets saved. Run /ticket-panel in Discord to refresh the menu.";
      setStatus(msg, true);
      if (window.currentConfig) window.currentConfig.tickets = Object.assign({}, window.currentConfig.tickets || {}, payload);
      if (window.loadGuildData) await window.loadGuildData();
      applyFromConfig();
    } catch (err) {
      setStatus("❌ " + (err && err.message ? err.message : "Save failed"), false);
    }
  }
  window.__ticketSaveNow = saveTickets;

  function bindGlobal() {
    var addStaff = $("add-ticket-staff");
    if (addStaff && !addStaff.__tv6) {
      addStaff.__tv6 = true;
      addStaff.addEventListener("click", function (e) {
        e.preventDefault(); e.stopImmediatePropagation();
        var sel = $("ticket-staff-role");
        var rid = sel && sel.value;
        if (!rid) return;
        if (!window.currentConfig) window.currentConfig = {};
        if (!window.currentConfig.tickets) window.currentConfig.tickets = {};
        var cur = window.currentConfig.tickets.staffRoleIds || [];
        if (cur.map(String).indexOf(String(rid)) < 0) cur = cur.concat([rid]);
        window.currentConfig.tickets.staffRoleIds = cur;
        renderStaff(cur);
      }, true);
    }
    var addCat = $("ticket-add-cat");
    if (addCat && !addCat.__tv6) {
      addCat.__tv6 = true;
      addCat.addEventListener("click", function () {
        harvestCatsFromDom();
        if (!draftCats) draftCats = [];
        if (draftCats.length >= 25) { setStatus("Max 25 ticket types.", false); return; }
        draftCats.push(normalizeCat({ id: "type" + (draftCats.length + 1), label: "New type", emoji: "🎫", aiEnabled: true, questions: [], escalateRoleIds: [], escalateUserIds: [] }, draftCats.length));
        renderCats();
      });
    }
    var saveBtn = $("save-tickets");
    if (saveBtn) {
      var fresh = saveBtn.cloneNode(true);
      fresh.__p26 = 1;
      fresh.__tv6owned = true;
      saveBtn.parentNode.replaceChild(fresh, saveBtn);
      fresh.addEventListener("click", saveTickets, true);
    }
  }

  function mount(force) {
    var section = $("tickets");
    if (!section) return false;
    var already = section.querySelector('[data-tickets-panel="v6"]');
    if (already && !force) { fillGlobalSelects(); return true; }
    section.innerHTML = panelHtml();
    mounted = true;
    applyFromConfig();
    bindGlobal();
    return true;
  }

  function onTicketsTab() {
    mount(false);
    setTimeout(function () { fillGlobalSelects(); renderCats(); }, 50);
  }

  function wrapShowSection() {
    if (typeof window.showSection !== "function" || window.showSection.__tv6) return;
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      if (String(tab) === "tickets") onTicketsTab();
      return r;
    };
    window.showSection.__tv6 = true;
  }

  function boot(force) {
    wrapShowSection();
    var section = $("tickets");
    if (section) mount(!!force);
    var active = document.querySelector("#tickets.page-section.active, #tickets.active");
    if (active) onTicketsTab();
  }

  window.__featuresTicketsV3Boot = boot;
  window.__featuresTicketsV5Boot = boot;
  window.__featuresTicketsV6Boot = boot;

  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest && ev.target.closest('[data-tab="tickets"]');
    if (t) setTimeout(onTicketsTab, 40);
  }, true);
  document.addEventListener("tickets:upgrade", function () { setTimeout(function () { boot(true); }, 40); });
  [0, 400, 1200, 3000, 7000].forEach(function (ms) { setTimeout(function () { boot(false); }, ms); });
  console.log("[features-tickets] v6 panel ready");
})();
