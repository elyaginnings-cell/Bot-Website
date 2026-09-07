/**
 * Extra feature config panels: economy extras, bump, verification,
 * suggestions, tickets, QOTD, self-roles categories. Hooks into existing saveConfig / applyConfig.
 */
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "className") n.className = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else if (k.startsWith("on") && typeof attrs[k] === "function") n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else n.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  // —— Self Roles ——
  function renderSelfRolesList() {
    var list = $("selfroles-list");
    if (!list) return;
    list.innerHTML = "";
    var cfg = (window.currentConfig && window.currentConfig.selfRoles) || {};
    var cats = Array.isArray(cfg.categories) ? cfg.categories : [];
    if (!cats.length) {
      list.innerHTML = '<p class="form-hint">No categories yet. Add one below.</p>';
      return;
    }
    cats.forEach(function (c, idx) {
      var card = el("div", { className: "sr-cat-card", style: "border:1px solid var(--border,#333);border-radius:10px;padding:0.85rem;margin-bottom:0.75rem;background:var(--card-bg,#1a1a1e)" });
      var head = el("div", { style: "display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.5rem" });
      head.appendChild(el("span", { text: (c.emoji || "✨") + " ", style: "font-size:1.2rem" }));
      head.appendChild(el("strong", { text: c.name || "Category" }));
      head.appendChild(el("span", { className: "badge", text: c.mode === "single" ? "single" : "multi", style: "font-size:0.7rem;opacity:0.8" }));
      var delBtn = el("button", { type: "button", className: "button secondary", text: "Remove", style: "margin-left:auto;font-size:0.8rem;padding:0.25rem 0.5rem" });
      delBtn.addEventListener("click", function () {
        var next = cats.slice();
        next.splice(idx, 1);
        window.currentConfig = window.currentConfig || {};
        window.currentConfig.selfRoles = Object.assign({}, cfg, { categories: next });
        renderSelfRolesList();
      });
      head.appendChild(delBtn);
      card.appendChild(head);
      if (c.description) card.appendChild(el("p", { className: "form-hint", text: c.description, style: "margin:0 0 0.4rem" }));
      if (c.tip) card.appendChild(el("p", { className: "form-hint", text: "Tip: " + c.tip, style: "margin:0 0 0.4rem;opacity:0.85" }));
      var roles = Array.isArray(c.roles) ? c.roles : [];
      if (roles.length) {
        var ul = el("ul", { style: "margin:0;padding-left:1.2rem;font-size:0.9rem" });
        roles.forEach(function (r) {
          ul.appendChild(el("li", { text: (r.emoji ? r.emoji + " " : "") + (r.label || r.roleId) }));
        });
        card.appendChild(ul);
      } else {
        card.appendChild(el("p", { className: "form-hint", text: "No roles in this category." }));
      }
      list.appendChild(card);
    });
  }

  function saveSelfRoles() {
    var channelId = ($("selfroles-channel") && $("selfroles-channel").value) || "";
    var enabled = $("selfroles-enabled") ? $("selfroles-enabled").checked : true;
    var cfg = (window.currentConfig && window.currentConfig.selfRoles) || {};
    var cats = Array.isArray(cfg.categories) ? cfg.categories : [];
    var payload = {
      selfRoles: {
        enabled: !!enabled,
        channelId: channelId || null,
        categories: cats
      }
    };
    if (typeof window.saveConfig === "function") {
      window.saveConfig(payload).then(function (ok) {
        var msg = $("selfroles-status");
        if (msg) {
          msg.textContent = ok
            ? "✅ Saved. Run /selfroles-setup in Discord to post/refresh panels."
            : "Saved to website. Bot did not sync. Run /selfroles-setup in Discord.";
        }
      }).catch(function (e) {
        var msg = $("selfroles-status");
        if (msg) msg.textContent = "Error: " + (e && e.message ? e.message : e);
      });
    } else {
      window.currentConfig = window.currentConfig || {};
      window.currentConfig.selfRoles = payload.selfRoles;
      var msg = $("selfroles-status");
      if (msg) msg.textContent = "Config updated locally. Use main Save if available.";
    }
  }

  function addSelfRoleCategory() {
    var name = ($("sr-cat-name") && $("sr-cat-name").value || "").trim();
    if (!name) {
      alert("Category name required");
      return;
    }
    var emoji = ($("sr-cat-emoji") && $("sr-cat-emoji").value || "✨").trim() || "✨";
    var desc = ($("sr-cat-desc") && $("sr-cat-desc").value || "").trim();
    var tip = ($("sr-cat-tip") && $("sr-cat-tip").value || "").trim();
    var footer = ($("sr-cat-footer") && $("sr-cat-footer").value || "").trim();
    var placeholder = ($("sr-cat-placeholder") && $("sr-cat-placeholder").value || "").trim();
    var mode = ($("sr-cat-mode") && $("sr-cat-mode").value) || "multi";
    var roleId = ($("sr-role-id") && $("sr-role-id").value || "").trim();
    var roleLabel = ($("sr-role-label") && $("sr-role-label").value || "").trim();
    var roleEmoji = ($("sr-role-emoji") && $("sr-role-emoji").value || "").trim();
    var roleDesc = ($("sr-role-desc") && $("sr-role-desc").value || "").trim();

    var roles = [];
    if (roleId) {
      roles.push({
        roleId: roleId,
        label: roleLabel || roleId,
        emoji: roleEmoji || null,
        description: roleDesc || null
      });
    }

    var cfg = (window.currentConfig && window.currentConfig.selfRoles) || {};
    var cats = Array.isArray(cfg.categories) ? cfg.categories.slice() : [];
    cats.push({
      id: Math.random().toString(16).slice(2, 10),
      name: name,
      emoji: emoji,
      description: desc,
      tip: tip,
      footer: footer,
      placeholder: placeholder,
      mode: mode === "single" ? "single" : "multi",
      messageId: null,
      roles: roles
    });
    window.currentConfig = window.currentConfig || {};
    window.currentConfig.selfRoles = Object.assign({}, cfg, { categories: cats });
    renderSelfRolesList();
    if ($("sr-cat-name")) $("sr-cat-name").value = "";
    if ($("sr-cat-desc")) $("sr-cat-desc").value = "";
    if ($("sr-cat-tip")) $("sr-cat-tip").value = "";
    if ($("sr-role-id")) $("sr-role-id").value = "";
    if ($("sr-role-label")) $("sr-role-label").value = "";
  }

  function addRoleToLastCategory() {
    var cfg = (window.currentConfig && window.currentConfig.selfRoles) || {};
    var cats = Array.isArray(cfg.categories) ? cfg.categories.slice() : [];
    if (!cats.length) {
      alert("Add a category first");
      return;
    }
    var roleId = ($("sr-role-id") && $("sr-role-id").value || "").trim();
    if (!roleId) {
      alert("Role ID required");
      return;
    }
    var roleLabel = ($("sr-role-label") && $("sr-role-label").value || "").trim();
    var roleEmoji = ($("sr-role-emoji") && $("sr-role-emoji").value || "").trim();
    var roleDesc = ($("sr-role-desc") && $("sr-role-desc").value || "").trim();
    var last = Object.assign({}, cats[cats.length - 1]);
    last.roles = (last.roles || []).concat([{
      roleId: roleId,
      label: roleLabel || roleId,
      emoji: roleEmoji || null,
      description: roleDesc || null
    }]);
    cats[cats.length - 1] = last;
    window.currentConfig.selfRoles = Object.assign({}, cfg, { categories: cats });
    renderSelfRolesList();
    if ($("sr-role-id")) $("sr-role-id").value = "";
    if ($("sr-role-label")) $("sr-role-label").value = "";
  }

  // —— Apply config from bot ——
  function applyExtraConfig() {
    var c = window.currentConfig || {};
    var SR = c.selfRoles || {};
    if ($("selfroles-enabled")) $("selfroles-enabled").checked = SR.enabled !== false;
    if ($("selfroles-channel")) $("selfroles-channel").value = SR.channelId || "";
    renderSelfRolesList();

    // currency extras, bump, etc. (if elements exist)
    var cur = c.currency || {};
    if ($("currency-weekly")) $("currency-weekly").value = cur.weeklyAmount != null ? cur.weeklyAmount : "";
    if ($("currency-beg")) $("currency-beg").value = cur.begMax != null ? cur.begMax : "";
    if ($("currency-bank")) $("currency-bank").checked = !!cur.bankEnabled;

    var bump = c.bump || {};
    if ($("bump-enabled")) $("bump-enabled").checked = bump.enabled !== false;
    if ($("bump-channel")) $("bump-channel").value = bump.channelId || "";
    if ($("bump-reward")) $("bump-reward").value = bump.reward != null ? bump.reward : "";

    var ver = c.verification || {};
    if ($("ver-enabled")) $("ver-enabled").checked = !!ver.enabled;
    if ($("ver-role")) $("ver-role").value = ver.roleId || "";
    if ($("ver-channel")) $("ver-channel").value = ver.channelId || "";

    var sug = c.suggestions || {};
    if ($("sug-enabled")) $("sug-enabled").checked = !!sug.enabled;
    if ($("sug-channel")) $("sug-channel").value = sug.channelId || "";

    var tix = c.tickets || {};
    if ($("tix-enabled")) $("tix-enabled").checked = !!tix.enabled;
    if ($("tix-category")) $("tix-category").value = tix.categoryId || "";
    if ($("tix-support")) $("tix-support").value = tix.supportRoleId || "";

    var qotd = c.qotd || {};
    if ($("qotd-enabled")) $("qotd-enabled").checked = !!qotd.enabled;
    if ($("qotd-channel")) $("qotd-channel").value = qotd.channelId || "";
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

  function patchSaveCurrency() {
    // optional: leave core save alone
  }

  function patchFillSelects() {
    // channel/role selects filled by main app
  }

  function extendTitles() {
    // already injected via features-ui
  }

  function bindButtons() {
    $("save-selfroles")?.addEventListener("click", saveSelfRoles);
    $("sr-add-category")?.addEventListener("click", addSelfRoleCategory);
    $("sr-add-role")?.addEventListener("click", addRoleToLastCategory);
  }

  function boot() {
    var tries = 0;
    function tryPatch() {
      tries++;
      if (window.currentConfig !== undefined || $("selfroles") || tries > 40) {
        patchSaveCurrency();
        patchApplyConfig();
        patchFillSelects();
        extendTitles();
        bindButtons();
        applyExtraConfig();
        console.log("[features-config] panels ready");
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
