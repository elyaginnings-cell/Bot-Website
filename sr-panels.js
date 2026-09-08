/**
 * Self-role panels v2 — create/edit cards + top-category or sub-category includes.
 */
(function () {
  "use strict";
  window.__srPanelsV1 = true;
  if (window.__srPanelsV2) return;
  window.__srPanelsV2 = true;

  function $(id) { return document.getElementById(id); }
  var srPanelId = null;
  var draft = null;
  function newId() { return Math.random().toString(36).slice(2, 10); }
  function channelName(id) {
    if (!id) return "no channel";
    var list = window.channelsCache || [];
    var ch = list.find(function (c) { return String(c.id) === String(id); });
    return ch ? "#" + ch.name : "#" + String(id).slice(-4);
  }
  function cfg() {
    window.currentConfig = window.currentConfig || {};
    var s = window.currentConfig.selfRoles || {};
    if (!Array.isArray(s.categories)) s.categories = [];
    if (!Array.isArray(s.panels)) s.panels = [];
    s.panels.forEach(normalizePanel);
    if (!s.panels.length) {
      s.panels = [normalizePanel({
        id: newId(), name: "Main panel", channelId: s.channelId || null, messageId: s.messageId || null,
        buttonLabel: s.buttonLabel || "Add roles", removeButtonLabel: s.removeButtonLabel || "Remove roles",
        embedTitle: s.embedTitle || "Self Roles", embedDescription: s.embedDescription || "",
        categoryIds: s.categories.map(function (c) { return String(c.id); })
      })];
    }
    window.currentConfig.selfRoles = s;
    return s;
  }
  function normalizePanel(p) {
    if (!p || typeof p !== "object") return p;
    if (!p.id) p.id = newId();
    if (!p.name) p.name = "Panel";
    if (!Array.isArray(p.includes)) {
      p.includes = (p.categoryIds || []).map(function (id) { return { type: "cat", id: String(id) }; });
    }
    return p;
  }
  function selected() {
    if (draft && srPanelId === draft.id) return draft;
    var s = cfg();
    var p = s.panels.find(function (x) { return String(x.id) === String(srPanelId); });
    if (!p) { p = s.panels[0]; srPanelId = p ? p.id : null; }
    return p;
  }
  function injectFields() {
    var section = $("selfroles");
    if (!section) return false;
    if ($("sr-panels-ui")) return true;
    var card = section.querySelector(".card") || section;
    var block = document.createElement("div");
    block.id = "sr-panels-ui";
    block.innerHTML =
      '<h3 class="subhead">Discord panels</h3>' +
      '<p class="form-hint">A panel is the Add / Remove message in a channel. Tick a whole top category, or only the sub-categories you want.</p>' +
      '<div id="sr-panel-cards" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin:0.6rem 0"></div>' +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.9rem">' +
      '<button class="button" type="button" id="sr-add-panel">Create panel</button>' +
      '<button class="button" type="button" id="sr-delete-panel">Delete selected</button></div>' +
      '<div id="sr-panel-editor" style="padding:0.85rem;border:1px solid rgba(255,255,255,0.1);border-radius:10px;margin-bottom:1rem">' +
      '<p class="form-hint" id="sr-panel-editing" style="margin-top:0"></p>' +
      '<div class="config-grid"><div class="input-group"><label>Panel name</label><input id="sr-panel-name" type="text" maxlength="80" placeholder="e.g. Colors"></div></div>' +
      '<p class="form-hint" style="margin:0.75rem 0 0.35rem">Include on this panel</p>' +
      '<div id="sr-panel-cats"></div></div>';
    var enabled = $("sr-enabled");
    if (enabled && enabled.parentNode && enabled.parentNode.parentNode) enabled.parentNode.parentNode.insertBefore(block, enabled.parentNode.nextSibling);
    else card.insertBefore(block, card.firstChild);
    var chGroup = $("sr-channel") && $("sr-channel").closest(".input-group");
    if (chGroup) { var lab = chGroup.querySelector("label"); if (lab) lab.textContent = "Post this panel in"; }
    var btnLab = $("sr-btn-label") && $("sr-btn-label").closest(".input-group");
    if (btnLab) { var l2 = btnLab.querySelector("label"); if (l2) l2.textContent = "Add button"; }
    if (!$("sr-btn-remove")) {
      var afterBtn = $("sr-btn-label") && $("sr-btn-label").closest(".input-group");
      var wrap = document.createElement("div");
      wrap.className = "input-group";
      wrap.innerHTML = '<label>Remove button</label><input id="sr-btn-remove" type="text" maxlength="80" placeholder="Remove roles">';
      if (afterBtn && afterBtn.parentNode) afterBtn.parentNode.insertBefore(wrap, afterBtn.nextSibling);
    }
    return true;
  }
  function hasCat(p, id) {
    return (p.includes || []).some(function (it) { return (it.type === "cat" || (!it.type && !it.subId)) && String(it.id || it.catId) === String(id); });
  }
  function hasSub(p, catId, subId) {
    if (hasCat(p, catId)) return true;
    return (p.includes || []).some(function (it) { return (it.type === "sub" || it.subId) && String(it.catId) === String(catId) && String(it.subId) === String(subId); });
  }
  function renderCards() {
    var box = $("sr-panel-cards");
    if (!box) return;
    var s = cfg();
    var items = s.panels.slice();
    if (draft) items.push(draft);
    if (!items.length) { box.innerHTML = '<p class="form-hint">No panels yet. Click Create panel.</p>'; return; }
    box.innerHTML = items.map(function (p) {
      var on = String(p.id) === String(srPanelId);
      var n = (p.includes || []).length;
      var what = n ? n + " group" + (n === 1 ? "" : "s") : "nothing selected";
      return '<button type="button" data-sr-card="' + p.id + '" class="button" style="text-align:left;min-width:11rem;' + (on ? "outline:2px solid #5865f2;" : "opacity:0.85;") + '"><strong>' + (p.name || "Panel") + (p._draft ? " · draft" : "") + '</strong><br><span class="form-hint">' + channelName(p.channelId) + " · " + what + "</span></button>";
    }).join("");
    box.querySelectorAll("[data-sr-card]").forEach(function (btn) {
      btn.addEventListener("click", function () { readIntoSelected(); srPanelId = btn.getAttribute("data-sr-card"); applySelected(); });
    });
  }
  function renderChecks() {
    var box = $("sr-panel-cats");
    if (!box) return;
    var s = cfg();
    var p = selected();
    if (!s.categories.length) {
      box.innerHTML = '<p class="form-hint">Add top categories and sub-categories below first, then tick what this panel should offer.</p>';
      return;
    }
    box.innerHTML = s.categories.map(function (c) {
      var kids = c.children || [];
      var topOn = p && hasCat(p, c.id);
      var kidHtml = kids.map(function (ch) {
        var on = p && hasSub(p, c.id, ch.id);
        return '<label class="toggle" style="display:flex;margin:0.2rem 0 0.2rem 1.1rem"><input type="checkbox" data-sr-inc="sub" data-cat="' + c.id + '" data-sub="' + ch.id + '"' + (on ? " checked" : "") + '> <span>' + (ch.emoji ? ch.emoji + " " : "") + (ch.name || "Sub") + ' <em class="form-hint">sub</em></span></label>';
      }).join("") || '<p class="form-hint" style="margin-left:1.1rem">No sub-categories</p>';
      return '<div style="margin:0.35rem 0 0.7rem;padding:0.45rem 0.55rem;border-left:3px solid rgba(88,101,242,0.7)"><label class="toggle" style="display:flex"><input type="checkbox" data-sr-inc="cat" data-cat="' + c.id + '"' + (topOn ? " checked" : "") + '> <span><strong>' + (c.emoji ? c.emoji + " " : "") + (c.name || "Category") + '</strong> <em class="form-hint">whole top category</em></span></label>' + kidHtml + "</div>";
    }).join("");
    box.querySelectorAll('[data-sr-inc="cat"]').forEach(function (el) {
      el.addEventListener("change", function () {
        var catId = el.getAttribute("data-cat");
        box.querySelectorAll('[data-sr-inc="sub"][data-cat="' + catId + '"]').forEach(function (sub) { sub.checked = el.checked; });
      });
    });
    box.querySelectorAll('[data-sr-inc="sub"]').forEach(function (el) {
      el.addEventListener("change", function () {
        var catId = el.getAttribute("data-cat");
        var top = box.querySelector('[data-sr-inc="cat"][data-cat="' + catId + '"]');
        var subs = box.querySelectorAll('[data-sr-inc="sub"][data-cat="' + catId + '"]');
        var allOn = true;
        subs.forEach(function (x) { if (!x.checked) allOn = false; });
        if (top) top.checked = allOn && subs.length > 0;
      });
    });
  }
  function readIncludes() {
    var includes = [];
    document.querySelectorAll('[data-sr-inc="cat"]').forEach(function (el) {
      if (el.checked) includes.push({ type: "cat", id: String(el.getAttribute("data-cat")) });
    });
    document.querySelectorAll('[data-sr-inc="sub"]').forEach(function (el) {
      if (!el.checked) return;
      var catId = String(el.getAttribute("data-cat"));
      if (includes.some(function (it) { return it.type === "cat" && it.id === catId; })) return;
      includes.push({ type: "sub", catId: catId, subId: String(el.getAttribute("data-sub")) });
    });
    return includes;
  }
  function readIntoSelected() {
    var s = cfg();
    var p = selected();
    if (!p) return s;
    if ($("sr-panel-name")) p.name = ($("sr-panel-name").value || "").trim() || p.name || "Panel";
    if ($("sr-channel")) p.channelId = $("sr-channel").value || null;
    if ($("sr-btn-label")) p.buttonLabel = ($("sr-btn-label").value || "").trim() || "Add roles";
    if ($("sr-btn-remove")) p.removeButtonLabel = ($("sr-btn-remove").value || "").trim() || "Remove roles";
    if ($("sr-embed-title")) p.embedTitle = ($("sr-embed-title").value || "").trim() || p.name || "Self Roles";
    if ($("sr-embed-desc")) p.embedDescription = ($("sr-embed-desc").value || "").trim();
    if ($("sr-panel-cats") && $("sr-panel-cats").querySelector("[data-sr-inc]")) {
      p.includes = readIncludes();
      p.categoryIds = p.includes.filter(function (it) { return it.type === "cat"; }).map(function (it) { return it.id; });
    }
    if (!p._draft) {
      s.channelId = p.channelId; s.buttonLabel = p.buttonLabel; s.removeButtonLabel = p.removeButtonLabel;
      s.embedTitle = p.embedTitle; s.embedDescription = p.embedDescription;
    }
    return s;
  }
  function applySelected() {
    var p = selected();
    var tag = $("sr-panel-editing");
    if (!p) { if (tag) tag.textContent = "Create a panel to get started."; return; }
    if (tag) tag.textContent = p._draft ? "New panel — fill this in, then Save Self Roles to keep it." : "Editing \u201c" + (p.name || "Panel") + "\u201d";
    if ($("sr-panel-name")) $("sr-panel-name").value = p.name || "";
    if ($("sr-channel")) $("sr-channel").value = p.channelId || "";
    if ($("sr-btn-label")) $("sr-btn-label").value = p.buttonLabel || "Add roles";
    if ($("sr-btn-remove")) $("sr-btn-remove").value = p.removeButtonLabel || "Remove roles";
    if ($("sr-embed-title")) $("sr-embed-title").value = p.embedTitle || p.name || "Self Roles";
    if ($("sr-embed-desc")) $("sr-embed-desc").value = p.embedDescription || "";
    renderCards(); renderChecks();
  }
  function commitDraft() {
    if (!draft) return;
    var s = cfg();
    s.panels.push({
      id: draft.id.indexOf("draft-") === 0 ? newId() : draft.id,
      name: draft.name || "Panel",
      channelId: draft.channelId, messageId: null,
      buttonLabel: draft.buttonLabel, removeButtonLabel: draft.removeButtonLabel,
      embedTitle: draft.embedTitle || draft.name || "Self Roles",
      embedDescription: draft.embedDescription || "",
      includes: draft.includes || [], categoryIds: draft.categoryIds || []
    });
    srPanelId = s.panels[s.panels.length - 1].id;
    draft = null;
  }
  async function persist(extraStatus) {
    readIntoSelected();
    if (draft && srPanelId === draft.id) commitDraft();
    var s = cfg();
    if (!window.saveConfig) throw new Error("saveConfig missing");
    var data = await window.saveConfig({ selfRoles: {
      enabled: $("sr-enabled") ? $("sr-enabled").checked !== false : true,
      channelId: s.channelId || null, buttonLabel: s.buttonLabel || "Add roles",
      removeButtonLabel: s.removeButtonLabel || "Remove roles",
      embedTitle: s.embedTitle || "Self Roles", embedDescription: s.embedDescription || "",
      categories: s.categories || [], panels: s.panels || []
    }});
    var el = $("sr-status");
    if (el) {
      el.style.color = "#4ade80";
      el.textContent = extraStatus || (data && data.savedToBot === false ? "Saved on website. Run /selfroles-setup after the bot is online." : "✅ Saved. Run /selfroles-setup to post panels.");
    }
    applySelected();
    return data;
  }
  function startDraft() {
    readIntoSelected();
    if (cfg().panels.length + (draft ? 1 : 0) >= 10) return alert("Max 10 panels");
    draft = normalizePanel({
      id: "draft-" + newId(), name: "", channelId: null,
      buttonLabel: "Add roles", removeButtonLabel: "Remove roles", embedTitle: "",
      embedDescription: "Use **Add roles** to get roles, or **Remove roles** to drop them. Menus are private — only you see them.",
      includes: [], _draft: true
    });
    srPanelId = draft.id;
    applySelected();
    if ($("sr-panel-name")) { $("sr-panel-name").focus(); $("sr-panel-name").placeholder = "Name this panel…"; }
  }
  function bind() {
    var save = $("save-selfroles");
    if (save && !save.dataset.srPanelsV2) {
      save.dataset.srPanelsV2 = "1";
      save.addEventListener("click", function (e) {
        e.stopImmediatePropagation();
        persist().catch(function (err) {
          var el = $("sr-status");
          if (el) { el.style.color = "#f87171"; el.textContent = "❌ " + (err.message || "Failed"); }
        });
      }, true);
    }
    $("sr-add-panel") && $("sr-add-panel").addEventListener("click", startDraft);
    $("sr-delete-panel") && $("sr-delete-panel").addEventListener("click", async function () {
      var p = selected();
      if (!p) return;
      if (p._draft) { draft = null; srPanelId = null; applySelected(); return; }
      var s = cfg();
      if (s.panels.length <= 1) return alert("Keep at least one panel.");
      if (!confirm("Delete panel \u201c" + (p.name || "Panel") + "\u201d?")) return;
      s.panels = s.panels.filter(function (x) { return String(x.id) !== String(p.id); });
      srPanelId = s.panels[0].id;
      await persist("Panel deleted.");
    });
  }
  function boot() {
    if (!injectFields()) { setTimeout(boot, 200); return; }
    try { applySelected(); bind(); } catch (e) { console.warn("[sr-panels]", e); }
    var n = 0;
    var t = setInterval(function () { try { cfg(); renderCards(); renderChecks(); } catch (_) {} if (++n > 12) clearInterval(t); }, 400);
    console.log("[sr-panels] v2 ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
