/**
 * Extends AI Chat panel with ignore roles.
 * Members with these roles: no random AI chat, no reply when @mentioning the bot
 * (staff sudo/mod commands still work).
 */
(function () {
  "use strict";
  if (window.__aiIgnoreRolesUi) return;
  window.__aiIgnoreRolesUi = true;

  function $(id) { return document.getElementById(id); }

  function roles() {
    try {
      if (typeof window.syncGlobals === "function") window.syncGlobals();
    } catch (_) {}
    return window.rolesCache || [];
  }

  function ensureUi() {
    var section = $("aichat");
    if (!section) return false;
    if ($("aichat-ignore-roles")) return true;

    var saveBtn = $("save-aichat");
    var box = document.createElement("div");
    box.id = "aichat-ignore-roles";
    box.innerHTML =
      '<h3 class="subhead">Ignore roles</h3>' +
      '<p class="form-hint">People with these roles will <strong>not</strong> get random AI chat and the bot will <strong>not</strong> reply when they ping it. Staff sudo commands still work.</p>' +
      '<div class="level-role-form"><div class="input-group"><label>Role</label>' +
      '<select id="aichat-ignore-role-pick"><option value="">Select a role…</option></select></div>' +
      '<button class="button" type="button" id="aichat-add-ignore-role">Add ignore role</button></div>' +
      '<div id="aichat-ignore-roles-list" class="level-roles-list"></div>';

    if (saveBtn && saveBtn.parentNode) {
      saveBtn.parentNode.insertBefore(box, saveBtn);
    } else {
      section.querySelector(".card") && section.querySelector(".card").appendChild(box);
    }
    return true;
  }

  function getIgnoreIds() {
    var s = ((window.currentConfig || {}).ai || {}).settings || (window.currentConfig || {}).ai || {};
    var ids = s.ignoreRoleIds;
    if (!Array.isArray(ids)) ids = [];
    return ids.map(String);
  }

  function setIgnoreIds(ids) {
    if (!window.currentConfig) window.currentConfig = {};
    if (!window.currentConfig.ai) window.currentConfig.ai = {};
    if (!window.currentConfig.ai.settings) window.currentConfig.ai.settings = window.currentConfig.ai.settings || {};
    window.currentConfig.ai.settings.ignoreRoleIds = ids.map(String);
    // also flat for older save paths
    window.currentConfig.ai.ignoreRoleIds = ids.map(String);
  }

  function renderList() {
    var list = $("aichat-ignore-roles-list");
    if (!list) return;
    var ids = getIgnoreIds();
    var rl = roles();
    if (!ids.length) {
      list.innerHTML = '<p class="form-hint">None — AI can talk to everyone.</p>';
      return;
    }
    list.innerHTML = ids
      .map(function (id) {
        var r = rl.find(function (x) { return String(x.id) === String(id); });
        var name = r ? r.name : id;
        return (
          '<div class="level-role-row">' +
          name +
          ' <button type="button" class="button" data-rm-ignore="' +
          id +
          '">Remove</button></div>'
        );
      })
      .join("");
    list.querySelectorAll("[data-rm-ignore]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-rm-ignore");
        setIgnoreIds(getIgnoreIds().filter(function (x) { return String(x) !== String(id); }));
        renderList();
      });
    });
  }

  function fillPick() {
    var sel = $("aichat-ignore-role-pick");
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">Select a role…</option>';
    roles().forEach(function (r) {
      var o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.name || r.id;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }

  function bind() {
    var add = $("aichat-add-ignore-role");
    if (add && !add.__bound) {
      add.__bound = true;
      add.addEventListener("click", function () {
        var sel = $("aichat-ignore-role-pick");
        var id = sel && sel.value;
        if (!id) return;
        var ids = getIgnoreIds();
        if (ids.indexOf(String(id)) < 0) ids.push(String(id));
        setIgnoreIds(ids);
        renderList();
      });
    }

    // Hook save-aichat to include ignoreRoleIds
    var saveBtn = $("save-aichat");
    if (saveBtn && !saveBtn.__ignoreHook) {
      saveBtn.__ignoreHook = true;
      saveBtn.addEventListener(
        "click",
        function () {
          // ensure config has latest list before features-ai-chat save runs
          setIgnoreIds(getIgnoreIds());
        },
        true
      );
    }

    // Patch saveConfig path: wrap once
    if (!window.__aiIgnoreSaveWrap && typeof window.saveConfig === "function") {
      window.__aiIgnoreSaveWrap = true;
      var orig = window.saveConfig;
      window.saveConfig = function (body) {
        if (body && body.ai) {
          var ids = getIgnoreIds();
          if (!body.ai.settings) body.ai.settings = {};
          body.ai.settings.ignoreRoleIds = ids;
          body.ai.ignoreRoleIds = ids;
        }
        return orig.apply(this, arguments);
      };
    }
  }

  function refresh() {
    if (!ensureUi()) return;
    fillPick();
    renderList();
    bind();
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-tab="aichat"]');
      if (t) setTimeout(refresh, 80);
    },
    true
  );

  [0, 600, 2000, 5000].forEach(function (ms) {
    setTimeout(refresh, ms);
  });

  console.log("[features-ai-ignore-roles] ready");
})();
