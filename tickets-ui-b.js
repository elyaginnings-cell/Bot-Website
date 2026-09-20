  function renderQuestions(cat, idx) {
    var qs = cat.questions || [];
    if (!qs.length) return '<p class="form-hint">No questions — ticket opens immediately.</p>';
    return qs.map(function (q, qi) {
      return '<div class="level-role-row" style="flex-wrap:wrap;gap:6px;align-items:flex-end">' +
        '<input data-q-label type="text" maxlength="45" value="' + esc(q.label) + '" placeholder="Question">' +
        '<input data-q-ph type="text" maxlength="100" value="' + esc(q.placeholder || "") + '" placeholder="Placeholder">' +
        '<label class="toggle" style="margin:0"><input data-q-req type="checkbox"' + (q.required !== false ? " checked" : "") + '> required</label>' +
        '<label class="toggle" style="margin:0"><input data-q-para type="checkbox"' + (q.paragraph ? " checked" : "") + '> long answer</label>' +
        '<button type="button" class="button" data-rm-q="' + qi + '">Remove</button></div>';
    }).join("");
  }

  function renderCatCard(cat, idx) {
    cat = normalizeCat(cat, idx);
    return '<div class="card" data-cat-i="' + idx + '" data-percat-esc="1" data-esc-roles="' + esc((cat.escalateRoleIds || []).join(",")) + '" data-esc-users="' + esc((cat.escalateUserIds || []).join(",")) + '" style="margin:0 0 12px;padding:12px;border:1px solid rgba(128,128,128,.28);border-radius:12px">' +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Emoji</label><input data-cat-emoji type="text" maxlength="16" value="' + esc(cat.emoji) + '"></div>' +
      '<div class="input-group"><label>Name</label><input data-cat-label type="text" maxlength="80" value="' + esc(cat.label) + '"></div>' +
      '<div class="input-group"><label>ID (used in channel names as {category})</label><input data-cat-id type="text" maxlength="40" value="' + esc(cat.id) + '"></div>' +
      '<div class="input-group"><label>Short description</label><input data-cat-desc type="text" maxlength="100" value="' + esc(cat.description || "") + '"></div>' +
      '</div>' +
      '<label class="toggle"><input data-cat-ai type="checkbox"' + (cat.aiEnabled !== false ? " checked" : "") + '> <span>AI handles this type</span></label>' +
      '<div class="input-group"><label>AI notes for this type (optional)</label><textarea data-cat-ai-notes rows="2" maxlength="800">' + esc(cat.aiInstructions || "") + '</textarea></div>' +
      '<strong>Questions</strong><div data-q-wrap>' + renderQuestions(cat, idx) + '</div>' +
      '<button type="button" class="button" data-add-q>Add question</button>' +
      '<div style="margin-top:10px;padding:10px;border:1px solid rgba(128,128,128,.25);border-radius:10px">' +
      '<strong>Escalate to (this type only)</strong>' +
      '<p class="form-hint" style="margin:4px 0 8px">Report → support role. Partnership → owner user. If AI is off, these are pinged immediately.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select data-esc-role>' + roleOptions("") + '</select> <button type="button" class="button" data-add-esc-role>Add role</button></div>' +
      '<div data-esc-role-list class="level-roles-list">' + chipList(cat.escalateRoleIds, "role") + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px"><input data-esc-user type="text" placeholder="User ID (owner, etc.)"> <button type="button" class="button" data-add-esc-user>Add user</button></div>' +
      '<div data-esc-user-list class="level-roles-list">' + chipList(cat.escalateUserIds, "user") + '</div></div>' +
      '<button type="button" class="button" data-rm-cat style="margin-top:10px">Delete type</button></div>';
  }

  function harvestCatsFromDom() {
    var list = $("ticket-cats-list");
    if (!list) return draftCats || [];
    var next = [];
    list.querySelectorAll("[data-cat-i]").forEach(function (card, i) {
      var prev = (draftCats && draftCats[i]) || {};
      var qs = [];
      card.querySelectorAll("[data-q-wrap] .level-role-row").forEach(function (row, qi) {
        var lab = row.querySelector("[data-q-label]");
        if (!lab || !lab.value.trim()) return;
        qs.push(normalizeQuestion({ id: (prev.questions && prev.questions[qi] && prev.questions[qi].id) || "q" + qi, label: lab.value, placeholder: (row.querySelector("[data-q-ph]") || {}).value || "", required: !!(row.querySelector("[data-q-req]") && row.querySelector("[data-q-req]").checked), paragraph: !!(row.querySelector("[data-q-para]") && row.querySelector("[data-q-para]").checked) }, qi));
      });
      next.push(normalizeCat({ id: (card.querySelector("[data-cat-id]") || {}).value || prev.id, label: (card.querySelector("[data-cat-label]") || {}).value || prev.label, emoji: (card.querySelector("[data-cat-emoji]") || {}).value || "🎫", description: (card.querySelector("[data-cat-desc]") || {}).value || "", aiEnabled: !!(card.querySelector("[data-cat-ai]") && card.querySelector("[data-cat-ai]").checked), aiInstructions: (card.querySelector("[data-cat-ai-notes]") || {}).value || "", questions: qs, staffRoleIds: prev.staffRoleIds || [], escalateRoleIds: (card.getAttribute("data-esc-roles") || "").split(",").filter(Boolean), escalateUserIds: (card.getAttribute("data-esc-users") || "").split(",").filter(Boolean) }, i));
    });
    draftCats = next;
    return next;
  }

  function renderCats() {
    var list = $("ticket-cats-list");
    if (!list) return;
    if (!draftCats) draftCats = cloneCats(DEFAULT_CATS);
    list.innerHTML = draftCats.map(renderCatCard).join("") || '<p class="form-hint">No ticket types yet.</p>';
    bindCatEvents();
  }

  function bindCatEvents() {
    var list = $("ticket-cats-list");
    if (!list) return;
    list.querySelectorAll("[data-cat-i]").forEach(function (card) {
      var idx = Number(card.getAttribute("data-cat-i"));
      function refreshChips() {
        var cat = draftCats[idx];
        if (!cat) return;
        card.setAttribute("data-esc-roles", (cat.escalateRoleIds || []).join(","));
        card.setAttribute("data-esc-users", (cat.escalateUserIds || []).join(","));
        var rl = card.querySelector("[data-esc-role-list]");
        var ul = card.querySelector("[data-esc-user-list]");
        if (rl) rl.innerHTML = chipList(cat.escalateRoleIds, "role");
        if (ul) ul.innerHTML = chipList(cat.escalateUserIds, "user");
        bindChipRemoves(card, idx);
      }
      var addRole = card.querySelector("[data-add-esc-role]");
      if (addRole && !addRole.__bound) {
        addRole.__bound = true;
        addRole.addEventListener("click", function () {
          harvestCatsFromDom();
          var sel = card.querySelector("[data-esc-role]");
          var v = sel && sel.value;
          if (!v) return;
          draftCats[idx] = draftCats[idx] || normalizeCat({}, idx);
          if (draftCats[idx].escalateRoleIds.indexOf(v) < 0) draftCats[idx].escalateRoleIds.push(v);
          refreshChips();
        });
      }
      var addUser = card.querySelector("[data-add-esc-user]");
      if (addUser && !addUser.__bound) {
        addUser.__bound = true;
        addUser.addEventListener("click", function () {
          harvestCatsFromDom();
          var inp = card.querySelector("[data-esc-user]");
          var v = inp && String(inp.value || "").trim();
          if (!v) return;
          draftCats[idx] = draftCats[idx] || normalizeCat({}, idx);
          if (draftCats[idx].escalateUserIds.indexOf(v) < 0) draftCats[idx].escalateUserIds.push(v);
          if (inp) inp.value = "";
          refreshChips();
        });
      }
      bindChipRemoves(card, idx);
      var addQ = card.querySelector("[data-add-q]");
      if (addQ && !addQ.__bound) {
        addQ.__bound = true;
        addQ.addEventListener("click", function () {
          harvestCatsFromDom();
          var cat = draftCats[idx];
          if (!cat) return;
          if (cat.questions.length >= 5) { setStatus("Discord only allows 5 questions per type.", false); return; }
          cat.questions.push(normalizeQuestion({ id: "q" + cat.questions.length, label: "New question", required: true }, cat.questions.length));
          renderCats();
        });
      }
      card.querySelectorAll("[data-rm-q]").forEach(function (btn) {
        if (btn.__bound) return;
        btn.__bound = true;
        btn.addEventListener("click", function () {
          harvestCatsFromDom();
          var qi = Number(btn.getAttribute("data-rm-q"));
          if (draftCats[idx] && draftCats[idx].questions) draftCats[idx].questions.splice(qi, 1);
          renderCats();
        });
      });
      var rm = card.querySelector("[data-rm-cat]");
      if (rm && !rm.__bound) {
        rm.__bound = true;
        rm.addEventListener("click", function () {
          harvestCatsFromDom();
          draftCats.splice(idx, 1);
          renderCats();
        });
      }
    });
  }

  function bindChipRemoves(card, idx) {
    card.querySelectorAll("[data-rm-chip]").forEach(function (btn) {
      if (btn.__bound) return;
      btn.__bound = true;
      btn.addEventListener("click", function () {
        harvestCatsFromDom();
        var kind = btn.getAttribute("data-rm-chip");
        var id = btn.getAttribute("data-rm-id");
        var cat = draftCats[idx];
        if (!cat) return;
        if (kind === "role") cat.escalateRoleIds = (cat.escalateRoleIds || []).filter(function (x) { return String(x) !== String(id); });
        if (kind === "user") cat.escalateUserIds = (cat.escalateUserIds || []).filter(function (x) { return String(x) !== String(id); });
        card.setAttribute("data-esc-roles", (cat.escalateRoleIds || []).join(","));
        card.setAttribute("data-esc-users", (cat.escalateUserIds || []).join(","));
        var rl = card.querySelector("[data-esc-role-list]");
        var ul = card.querySelector("[data-esc-user-list]");
        if (rl) rl.innerHTML = chipList(cat.escalateRoleIds, "role");
        if (ul) ul.innerHTML = chipList(cat.escalateUserIds, "user");
        bindChipRemoves(card, idx);
      });
    });
  }

  function fillGlobalSelects(cfg) {
    cfg = cfg || ((window.currentConfig || {}).tickets || {});
    var catSel = $("ticket-category-id");
    var trans = $("ticket-transcript-channel");
    var panel = $("ticket-panel-channel");
    var staff = $("ticket-staff-role");
    if (catSel) catSel.innerHTML = channelOptions(categoryChannels(), cfg.categoryId, "Select a category…");
    if (trans) trans.innerHTML = channelOptions(textChannels(), cfg.transcriptChannelId, "None");
    if (panel) panel.innerHTML = channelOptions(textChannels(), cfg.panelChannelId, "None");
    if (staff) staff.innerHTML = roleOptions("");
    var man = $("ticket-category-manual");
    if (man && cfg.categoryId && catSel && !catSel.value) man.value = cfg.categoryId;
  }

  function renderStaff(ids) {
    var list = $("ticket-staff-list");
    if (!list) return;
    ids = ids || ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
    list.innerHTML = chipList(ids, "role");
    list.querySelectorAll("[data-rm-chip]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var rid = btn.getAttribute("data-rm-id");
        var cur = ((window.currentConfig || {}).tickets || {}).staffRoleIds || [];
        var next = cur.filter(function (x) { return String(x) !== String(rid); });
        if (!window.currentConfig) window.currentConfig = {};
        if (!window.currentConfig.tickets) window.currentConfig.tickets = {};
        window.currentConfig.tickets.staffRoleIds = next;
        renderStaff(next);
      });
    });
  }
