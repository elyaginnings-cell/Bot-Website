/**
 * Extra feature config panels: economy extras, bump, verification,
 * suggestions, tickets, QOTD, self-roles categories. Hooks into existing saveConfig / applyConfig.
 */
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function setVal(id, v) {
    var el = $(id);
    if (el) el.value = v == null ? "" : String(v);
  }

  function setCheck(id, v) {
    var el = $(id);
    if (el) el.checked = !!v;
  }

  function setStatus(id, text, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  function fillSelect(id, items, emptyLabel) {
    var el = $(id);
    if (!el) return;
    var cur = el.value;
    el.innerHTML = "";
    var o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = emptyLabel || "Select…";
    el.appendChild(o0);
    (items || []).forEach(function (it) {
      var o = document.createElement("option");
      o.value = it.id;
      o.textContent = it.name || it.id;
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }

  function fillExtraSelects() {
    var channels = window.channelsCache || [];
    var roles = window.rolesCache || [];
    [
      "sr-channel",
      "bump-channel",
      "verify-channel",
      "verify-log-channel",
      "suggest-channel",
      "suggest-staff-channel",
      "ticket-transcript-channel",
      "qotd-channel",
    ].forEach(function (id) {
      fillSelect(id, channels, "Select a channel…");
    });
    ["sr-role", "verify-role", "qotd-manager-role", "ticket-support-role"].forEach(
      function (id) {
        fillSelect(id, roles, "Select a role…");
      }
    );
  }

  function getSelfRolesState() {
    var cfg = (window.currentConfig && window.currentConfig.selfRoles) || {};
    if (!Array.isArray(cfg.categories)) cfg.categories = [];
    if (Array.isArray(cfg.roles) && cfg.roles.length && !cfg.categories.length) {
      cfg.categories = [
        {
          id: "legacy",
          name: "Roles",
          emoji: "✨",
          description: "",
          mode: "multi",
          roles: cfg.roles,
        },
      ];
    }
    return cfg;
  }

  function fillCategorySelect() {
    var el = $("sr-target-cat");
    if (!el) return;
    var cfg = getSelfRolesState();
    var current = el.value;
    el.innerHTML = '<option value="">Select section...</option>';
    (cfg.categories || []).forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = (c.emoji ? c.emoji + " " : "") + c.name + (c.mode === "single" ? " (single)" : " (multi)");
      el.appendChild(opt);
    });
    if (current) el.value = current;
  }

  function renderSelfRolesList() {
    var list = $("sr-categories");
    if (!list) return;
    var cfg = getSelfRolesState();
    var cats = cfg.categories || [];
    var roleCache = window.rolesCache || [];
    if (!cats.length) {
      list.innerHTML = '<p class="form-hint">No categories yet. Create one above.</p>';
      fillCategorySelect();
      return;
    }
    list.innerHTML = cats
      .map(function (c, ci) {
        var mode = c.mode === "single" ? "Single-select" : "Multi-select";
        var rolesHtml = (c.roles || [])
          .map(function (r, ri) {
            var role = roleCache.find(function (x) {
              return String(x.id) === String(r.roleId);
            });
            var name = role ? role.name : r.roleId;
            var em = r.emoji ? r.emoji + " " : "";
            return (
              '<div class="level-role-row" style="display:flex;gap:0.5rem;align-items:center;margin:0.25rem 0">' +
              "<span>" +
              em +
              "<strong>" +
              (r.label || name) +
              "</strong> <code style=\"opacity:0.7;font-size:0.75rem\">" +
              r.roleId +
              "</code></span>" +
              '<button type="button" class="button secondary" data-rm-cat="' +
              ci +
              '" data-rm-role="' +
              ri +
              '" style="margin-left:auto;font-size:0.75rem;padding:0.2rem 0.45rem">Remove</button></div>'
            );
          })
          .join("");
        return (
          '<div class="sr-cat-card" style="border:1px solid var(--border,#333);border-radius:10px;padding:0.85rem;margin-bottom:0.75rem;background:var(--card-bg,#1a1a1e)">' +
          '<div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.4rem">' +
          "<span style=\"font-size:1.15rem\">" +
          (c.emoji || "✨") +
          "</span><strong>" +
          (c.name || "Category") +
          '</strong> <span class="badge" style="font-size:0.7rem;opacity:0.85">' +
          mode +
          "</span>" +
          '<button type="button" class="button secondary" data-rm-section="' +
          ci +
          '" style="margin-left:auto;font-size:0.75rem;padding:0.2rem 0.45rem">Delete section</button></div>' +
          (c.description
            ? '<p class="form-hint" style="margin:0 0 0.35rem">' + c.description + "</p>"
            : "") +
          (c.tip
            ? '<p class="form-hint" style="margin:0 0 0.35rem;opacity:0.85">Tip: ' +
              c.tip +
              "</p>"
            : "") +
          (rolesHtml || '<p class="form-hint">No roles yet — add one below.</p>') +
          "</div>"
        );
      })
      .join("");

    list.querySelectorAll("[data-rm-section]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var ci = parseInt(btn.getAttribute("data-rm-section"), 10);
        var cfg = getSelfRolesState();
        var next = (cfg.categories || []).slice();
        next.splice(ci, 1);
        try {
          await window.saveConfig({
            selfRoles: Object.assign({}, cfg, {
              categories: next,
              enabled: $("sr-enabled")?.checked !== false,
              channelId: $("sr-channel")?.value || null,
            }),
          });
          if (typeof window.loadGuildData === "function") await window.loadGuildData();
          else applyExtraConfig();
        } catch (e) {
          alert(e.message || "Failed");
        }
      });
    });
    list.querySelectorAll("[data-rm-role]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var ci = parseInt(btn.getAttribute("data-rm-cat"), 10);
        var ri = parseInt(btn.getAttribute("data-rm-role"), 10);
        var cfg = getSelfRolesState();
        var cats = (cfg.categories || []).map(function (c, i) {
          if (i !== ci) return c;
          var roles = (c.roles || []).slice();
          roles.splice(ri, 1);
          return Object.assign({}, c, { roles: roles });
        });
        try {
          await window.saveConfig({
            selfRoles: Object.assign({}, cfg, {
              categories: cats,
              enabled: $("sr-enabled")?.checked !== false,
              channelId: $("sr-channel")?.value || null,
            }),
          });
          if (typeof window.loadGuildData === "function") await window.loadGuildData();
          else applyExtraConfig();
        } catch (e) {
          alert(e.message || "Failed");
        }
      });
    });
    fillCategorySelect();
  }

  async function saveSelfRoles() {
    try {
      setStatus("sr-status", "Saving…", true);
      var cfg = getSelfRolesState();
      var data = await window.saveConfig({
        selfRoles: {
          enabled: $("sr-enabled")?.checked !== false,
          channelId: $("sr-channel")?.value || null,
          categories: cfg.categories || [],
        },
      });
      var ok = data && data.ok !== false;
      var text = !ok
        ? "Saved to website. Bot did not sync. Run /selfroles-setup in Discord."
        : "✅ Saved. Run /selfroles-setup in Discord to post/refresh panels.";
      setStatus("sr-status", text, true);
    } catch (e) {
      setStatus("sr-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function addCategory() {
    var name = ($("sr-cat-name")?.value || "").trim();
    if (!name) {
      alert("Section name required");
      return;
    }
    try {
      var cfg = getSelfRolesState();
      var mode = $("sr-cat-mode")?.value === "single" ? "single" : "multi";
      var cats = (cfg.categories || []).slice();
      cats.push({
        id: Math.random().toString(16).slice(2, 10),
        name: name.slice(0, 100),
        emoji: ($("sr-cat-emoji")?.value || "").trim() || "✨",
        description: ($("sr-cat-desc")?.value || "").trim().slice(0, 500),
        tip: ($("sr-cat-tip")?.value || "").trim().slice(0, 300),
        footer:
          ($("sr-cat-footer")?.value || "").trim() ||
          (mode === "single" ? "Choose one option" : "Multiple selections allowed"),
        placeholder: ($("sr-cat-placeholder")?.value || "").trim().slice(0, 150),
        mode: mode,
        messageId: null,
        roles: [],
      });
      await window.saveConfig({
        selfRoles: {
          enabled: $("sr-enabled")?.checked !== false,
          channelId: $("sr-channel")?.value || null,
          categories: cats,
        },
      });
      if ($("sr-cat-name")) $("sr-cat-name").value = "";
      if ($("sr-cat-desc")) $("sr-cat-desc").value = "";
      if ($("sr-cat-emoji")) $("sr-cat-emoji").value = "";
      if ($("sr-cat-tip")) $("sr-cat-tip").value = "";
      if ($("sr-cat-footer")) $("sr-cat-footer").value = "";
      if ($("sr-cat-placeholder")) $("sr-cat-placeholder").value = "";
      if (typeof window.loadGuildData === "function") await window.loadGuildData();
      else applyExtraConfig();
    } catch (e) {
      alert(e.message || "Failed");
    }
  }

  async function addSelfRole() {
    var catId = $("sr-target-cat")?.value;
    var rid = $("sr-role")?.value;
    var label = ($("sr-label")?.value || "").trim();
    if (!catId) {
      alert("Select a section first");
      return;
    }
    if (!rid) {
      alert("Select a role");
      return;
    }
    try {
      var cfg = getSelfRolesState();
      var cats = (cfg.categories || []).map(function (c) {
        if (String(c.id) !== String(catId)) return c;
        var roles = (c.roles || []).slice();
        if (roles.some(function (r) {
          return String(r.roleId) === String(rid);
        }))
          return c;
        roles.push({
          roleId: String(rid),
          label: label || (window.rolesCache || []).find(function (x) {
            return String(x.id) === String(rid);
          })?.name || rid,
          emoji: ($("sr-emoji")?.value || "").trim() || null,
          description: ($("sr-role-desc")?.value || "").trim().slice(0, 100) || null,
        });
        return Object.assign({}, c, { roles: roles });
      });
      await window.saveConfig({
        selfRoles: {
          enabled: $("sr-enabled")?.checked !== false,
          channelId: $("sr-channel")?.value || null,
          categories: cats,
        },
      });
      if ($("sr-label")) $("sr-label").value = "";
      if ($("sr-emoji")) $("sr-emoji").value = "";
      if ($("sr-role-desc")) $("sr-role-desc").value = "";
      if (typeof window.loadGuildData === "function") await window.loadGuildData();
      else applyExtraConfig();
    } catch (e) {
      alert(e.message || "Failed");
    }
  }

  function applyExtraConfig() {
    var c = window.currentConfig || {};
    var SR = c.selfRoles || {};
    setCheck("sr-enabled", SR.enabled !== false);
    setVal("sr-channel", SR.channelId || "");
    fillExtraSelects();
    renderSelfRolesList();
  }

  function patchApplyConfig() {
    var orig = window.applyConfig;
    if (typeof orig !== "function") return;
    window.applyConfig = function (cfg) {
      orig(cfg);
      try {
        applyExtraConfig();
      } catch (e) {
        console.warn("[features-config] applyExtra", e);
      }
    };
  }

  function bindButtons() {
    $("save-selfroles")?.addEventListener("click", saveSelfRoles);
    $("sr-add-role")?.addEventListener("click", addSelfRole);
    $("sr-add-cat")?.addEventListener("click", addCategory);
  }

  function boot() {
    var tries = 0;
    function tryPatch() {
      tries++;
      if (window.currentConfig !== undefined || $("selfroles") || tries > 40) {
        patchApplyConfig();
        bindButtons();
        applyExtraConfig();
        console.log("[features-config] panels ready (self-roles)");
        return;
      }
      if (tries < 40) setTimeout(tryPatch, 150);
    }
    tryPatch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
