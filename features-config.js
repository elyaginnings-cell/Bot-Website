/**
 * Extra feature config panels — nested self-roles + channel fill fix + EDIT support.
 */
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }
  function setVal(id, v) {
    var el = $(id);
    if (el && v !== undefined && v !== null) el.value = v;
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

  function getChannels() {
    try {
      if (typeof channelsCache !== "undefined" && Array.isArray(channelsCache) && channelsCache.length)
        return channelsCache;
    } catch (_) {}
    try {
      if (typeof window.syncGlobals === "function") window.syncGlobals();
    } catch (_) {}
    return window.channelsCache || [];
  }
  function getRoles() {
    try {
      if (typeof rolesCache !== "undefined" && Array.isArray(rolesCache) && rolesCache.length)
        return rolesCache;
    } catch (_) {}
    return window.rolesCache || [];
  }

  // Edit mode: { type: 'cat'|'sub'|'role', ci, chi?, ri? }
  var srEdit = null;

  function clearSrEdit() {
    srEdit = null;
    var addCat = $("sr-add-cat");
    var addSub = $("sr-add-sub");
    var addRole = $("sr-add-role");
    if (addCat) addCat.textContent = "Add top category";
    if (addSub) addSub.textContent = "Add sub-category";
    if (addRole) addRole.textContent = "Add role";
  }

  function setEditModeButtons() {
    if (!srEdit) return clearSrEdit();
    if (srEdit.type === "cat") {
      var b = $("sr-add-cat");
      if (b) b.textContent = "Save category edits";
    } else if (srEdit.type === "sub") {
      var b = $("sr-add-sub");
      if (b) b.textContent = "Save sub-category edits";
    } else if (srEdit.type === "role") {
      var b = $("sr-add-role");
      if (b) b.textContent = "Save role edits";
    }
  }

  function fillExtraSelects() {
    var channels = getChannels();
    var roles = getRoles();
    [
      "verify-channel",
      "verify-log-channel",
      "suggest-channel",
      "suggest-staff-channel",
      "ticket-transcript-channel",
      "qotd-channel",
      "sr-channel",
    ].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var cur = el.value;
      el.innerHTML = '<option value="">Select a channel...</option>';
      channels.forEach(function (ch) {
        var o = document.createElement("option");
        o.value = ch.id;
        o.textContent = "#" + (ch.name || ch.id);
        el.appendChild(o);
      });
      if (cur) el.value = cur;
    });
    ["verify-role", "qotd-manager-role", "ticket-staff-role", "sr-role"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var cur = el.value;
      el.innerHTML =
        '<option value="">' + (id === "qotd-manager-role" ? "None" : "Select a role...") + "</option>";
      roles.forEach(function (r) {
        var o = document.createElement("option");
        o.value = r.id;
        o.textContent = r.name;
        el.appendChild(o);
      });
      if (cur) el.value = cur;
    });
    renderSelfRolesList();
  }

  function getSelfRolesState() {
    var cfg = (window.currentConfig && window.currentConfig.selfRoles) || {};
    if (!Array.isArray(cfg.categories)) cfg.categories = [];
    cfg.categories = cfg.categories.map(function (c) {
      if (Array.isArray(c.children)) return c;
      if (Array.isArray(c.roles) && c.roles.length) {
        return Object.assign({}, c, {
          children: [
            {
              id: (c.id || "g") + "-sub",
              name: c.name || "Roles",
              emoji: c.emoji || "✨",
              description: c.description || "",
              mode: c.mode === "single" ? "single" : "multi",
              roles: c.roles,
            },
          ],
        });
      }
      return Object.assign({}, c, { children: c.children || [] });
    });
    return cfg;
  }

  function fillParentCatSelect() {
    var el = $("sr-parent-cat");
    if (!el) return;
    var cfg = getSelfRolesState();
    var cur = el.value;
    el.innerHTML = '<option value="">Select top category…</option>';
    (cfg.categories || []).forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id;
      o.textContent = (c.emoji ? c.emoji + " " : "") + (c.name || "Category");
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }

  function fillTargetSubSelect() {
    var el = $("sr-target-sub");
    if (!el) return;
    var cfg = getSelfRolesState();
    var cur = el.value;
    el.innerHTML = '<option value="">Select sub-category…</option>';
    (cfg.categories || []).forEach(function (c) {
      (c.children || []).forEach(function (ch) {
        var o = document.createElement("option");
        o.value = c.id + "::" + ch.id;
        o.textContent =
          (c.name || "Cat") + " → " + (ch.emoji ? ch.emoji + " " : "") + (ch.name || "Sub");
        el.appendChild(o);
      });
    });
    if (cur) el.value = cur;
  }

  function renderSelfRolesList() {
    var list = $("sr-categories");
    if (!list) return;
    var cfg = getSelfRolesState();
    var cats = cfg.categories || [];
    var roleCache = getRoles();
    if (!cats.length) {
      list.innerHTML = '<p class="form-hint">No categories yet. Add a top category above.</p>';
      fillParentCatSelect();
      fillTargetSubSelect();
      return;
    }
    list.innerHTML = cats
      .map(function (c, ci) {
        var kids = (c.children || [])
          .map(function (ch, chi) {
            var mode = ch.mode === "single" ? "single" : "multi";
            var rolesHtml = (ch.roles || [])
              .map(function (r, ri) {
                var role = roleCache.find(function (x) {
                  return String(x.id) === String(r.roleId);
                });
                var name = role ? role.name : r.roleId;
                var em = r.emoji ? r.emoji + " " : "";
                return (
                  '<div class="level-role-row" style="margin-left:1.25rem">' +
                  em +
                  "<strong>" +
                  (r.label || "Role") +
                  "</strong> — @" +
                  name +
                  ' <button type="button" data-edit-role="' +
                  ci +
                  ":" +
                  chi +
                  ":" +
                  ri +
                  '">Edit</button> <button type="button" data-rm-role="' +
                  ci +
                  ":" +
                  chi +
                  ":" +
                  ri +
                  '">Remove</button></div>'
                );
              })
              .join("") ||
              '<p class="form-hint" style="margin-left:1.25rem">No roles yet.</p>';
            return (
              '<div style="margin:0.4rem 0 0.4rem 0.75rem;padding:0.5rem;border-left:2px solid rgba(88,101,242,0.5)">' +
              "<div><strong>" +
              (ch.emoji || "") +
              " " +
              (ch.name || "Sub") +
              '</strong> <span class="form-hint">· ' +
              mode +
              '</span> <button type="button" data-edit-sub="' +
              ci +
              ":" +
              chi +
              '">Edit</button> <button type="button" data-rm-sub="' +
              ci +
              ":" +
              chi +
              '">Delete sub</button></div>' +
              rolesHtml +
              "</div>"
            );
          })
          .join("") ||
          '<p class="form-hint" style="margin-left:0.75rem">No sub-categories yet.</p>';
        return (
          '<div class="level-role-row" style="flex-direction:column;align-items:stretch;gap:0.35rem;margin-bottom:0.75rem;padding:0.75rem;border:1px solid rgba(255,255,255,0.08);border-radius:8px">' +
          "<div><strong>" +
          (c.emoji || "") +
          " " +
          (c.name || "Category") +
          '</strong> <button type="button" data-edit-cat="' +
          ci +
          '">Edit</button> <button type="button" data-rm-cat="' +
          ci +
          '">Delete category</button></div>' +
          (c.description
            ? '<p class="form-hint" style="margin:0">' + c.description + "</p>"
            : "") +
          kids +
          "</div>"
        );
      })
      .join("");

    list.querySelectorAll("[data-rm-cat]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        try {
          var ci = Number(btn.getAttribute("data-rm-cat"));
          var cfg = getSelfRolesState();
          var next = (cfg.categories || []).filter(function (_, i) {
            return i !== ci;
          });
          clearSrEdit();
          await window.saveConfig({ selfRoles: Object.assign({}, cfg, { categories: next }) });
          if (typeof window.loadGuildData === "function") await window.loadGuildData();
          else applyExtraConfig();
        } catch (e) {
          alert(e.message || "Failed");
        }
      });
    });
    list.querySelectorAll("[data-rm-sub]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        try {
          var p = btn.getAttribute("data-rm-sub").split(":");
          var ci = Number(p[0]),
            chi = Number(p[1]);
          var cfg = getSelfRolesState();
          var cats = (cfg.categories || []).map(function (c, i) {
            if (i !== ci) return c;
            return Object.assign({}, c, {
              children: (c.children || []).filter(function (_, j) {
                return j !== chi;
              }),
            });
          });
          clearSrEdit();
          await window.saveConfig({ selfRoles: Object.assign({}, cfg, { categories: cats }) });
          if (typeof window.loadGuildData === "function") await window.loadGuildData();
          else applyExtraConfig();
        } catch (e) {
          alert(e.message || "Failed");
        }
      });
    });
    list.querySelectorAll("[data-rm-role]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        try {
          var p = btn.getAttribute("data-rm-role").split(":");
          var ci = Number(p[0]),
            chi = Number(p[1]),
            ri = Number(p[2]);
          var cfg = getSelfRolesState();
          var cats = (cfg.categories || []).map(function (c, i) {
            if (i !== ci) return c;
            return Object.assign({}, c, {
              children: (c.children || []).map(function (ch, j) {
                if (j !== chi) return ch;
                return Object.assign({}, ch, {
                  roles: (ch.roles || []).filter(function (_, k) {
                    return k !== ri;
                  }),
                });
              }),
            });
          });
          clearSrEdit();
          await window.saveConfig({ selfRoles: Object.assign({}, cfg, { categories: cats }) });
          if (typeof window.loadGuildData === "function") await window.loadGuildData();
          else applyExtraConfig();
        } catch (e) {
          alert(e.message || "Failed");
        }
      });
    });

    list.querySelectorAll("[data-edit-cat]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var ci = Number(btn.getAttribute("data-edit-cat"));
        var cfg = getSelfRolesState();
        var c = (cfg.categories || [])[ci];
        if (!c) return;
        srEdit = { type: "cat", ci: ci };
        if ($("sr-cat-name")) $("sr-cat-name").value = c.name || "";
        if ($("sr-cat-emoji")) $("sr-cat-emoji").value = c.emoji || "";
        if ($("sr-cat-desc")) $("sr-cat-desc").value = c.description || "";
        setEditModeButtons();
        var el = $("sr-cat-name");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    list.querySelectorAll("[data-edit-sub]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = btn.getAttribute("data-edit-sub").split(":");
        var ci = Number(p[0]),
          chi = Number(p[1]);
        var cfg = getSelfRolesState();
        var c = (cfg.categories || [])[ci];
        var ch = c && (c.children || [])[chi];
        if (!ch) return;
        srEdit = { type: "sub", ci: ci, chi: chi };
        fillParentCatSelect();
        if ($("sr-parent-cat")) $("sr-parent-cat").value = c.id || "";
        if ($("sr-sub-name")) $("sr-sub-name").value = ch.name || "";
        if ($("sr-sub-emoji")) $("sr-sub-emoji").value = ch.emoji || "";
        if ($("sr-sub-desc")) $("sr-sub-desc").value = ch.description || "";
        if ($("sr-sub-mode")) $("sr-sub-mode").value = ch.mode === "single" ? "single" : "multi";
        setEditModeButtons();
        var el = $("sr-sub-name");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    list.querySelectorAll("[data-edit-role]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = btn.getAttribute("data-edit-role").split(":");
        var ci = Number(p[0]),
          chi = Number(p[1]),
          ri = Number(p[2]);
        var cfg = getSelfRolesState();
        var c = (cfg.categories || [])[ci];
        var ch = c && (c.children || [])[chi];
        var r = ch && (ch.roles || [])[ri];
        if (!r) return;
        srEdit = { type: "role", ci: ci, chi: chi, ri: ri };
        fillTargetSubSelect();
        if ($("sr-target-sub")) $("sr-target-sub").value = (c.id || "") + "::" + (ch.id || "");
        if ($("sr-role")) $("sr-role").value = r.roleId || "";
        if ($("sr-label")) $("sr-label").value = r.label || "";
        if ($("sr-emoji")) $("sr-emoji").value = r.emoji || "";
        if ($("sr-role-desc")) $("sr-role-desc").value = r.description || "";
        setEditModeButtons();
        var el = $("sr-label");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    fillParentCatSelect();
    fillTargetSubSelect();
  }

  async function saveSelfRoles() {
    try {
      setStatus("sr-status", "Saving…", true);
      var cfg = getSelfRolesState();
      var data = await window.saveConfig({
        selfRoles: {
          enabled: $("sr-enabled")?.checked !== false,
          channelId: $("sr-channel")?.value || null,
          buttonLabel: ($("sr-btn-label")?.value || "").trim() || "Choose your roles",
          embedTitle: ($("sr-embed-title")?.value || "").trim() || "Self Roles",
          embedDescription:
            ($("sr-embed-desc")?.value || "").trim() ||
            "Click the button below to pick your roles. Everything is private — only you see the menus.",
          categories: cfg.categories || [],
        },
      });
      var text =
        data?.savedToBot === false
          ? "Saved to website. Bot did not sync. Run /selfroles-setup in Discord."
          : "✅ Saved. Run /selfroles-setup in Discord to post the button.";
      setStatus("sr-status", text, true);
    } catch (e) {
      setStatus("sr-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function addCategory() {
    var name = ($("sr-cat-name")?.value || "").trim();
    if (!name) return alert("Enter a top category name");
    try {
      var cfg = getSelfRolesState();
      var cats = (cfg.categories || []).slice();
      var emoji = ($("sr-cat-emoji")?.value || "").trim() || "✨";
      var desc = ($("sr-cat-desc")?.value || "").trim().slice(0, 500);
      if (srEdit && srEdit.type === "cat") {
        var ci = srEdit.ci;
        cats = cats.map(function (c, i) {
          if (i !== ci) return c;
          return Object.assign({}, c, {
            name: name.slice(0, 100),
            emoji: emoji,
            description: desc,
          });
        });
        clearSrEdit();
      } else {
        if (cats.length >= 15) return alert("Max 15 top categories");
        cats.push({
          id: Math.random().toString(36).slice(2, 10),
          name: name.slice(0, 100),
          emoji: emoji,
          description: desc,
          children: [],
        });
      }
      await window.saveConfig({
        selfRoles: Object.assign({}, cfg, {
          categories: cats,
          enabled: $("sr-enabled")?.checked !== false,
          channelId: $("sr-channel")?.value || null,
        }),
      });
      if ($("sr-cat-name")) $("sr-cat-name").value = "";
      if ($("sr-cat-desc")) $("sr-cat-desc").value = "";
      if ($("sr-cat-emoji")) $("sr-cat-emoji").value = "";
      if (typeof window.loadGuildData === "function") await window.loadGuildData();
      else applyExtraConfig();
    } catch (e) {
      alert(e.message || "Failed");
    }
  }

  async function addSubCategory() {
    var parentId = $("sr-parent-cat")?.value;
    var name = ($("sr-sub-name")?.value || "").trim();
    if (!name) return alert("Enter a sub-category name");
    try {
      var cfg = getSelfRolesState();
      var emoji = ($("sr-sub-emoji")?.value || "").trim() || "✨";
      var desc = ($("sr-sub-desc")?.value || "").trim().slice(0, 500);
      var mode = $("sr-sub-mode")?.value === "single" ? "single" : "multi";
      var cats;
      if (srEdit && srEdit.type === "sub") {
        var eci = srEdit.ci,
          echi = srEdit.chi;
        cats = (cfg.categories || []).map(function (c, i) {
          if (i !== eci) return c;
          return Object.assign({}, c, {
            children: (c.children || []).map(function (ch, j) {
              if (j !== echi) return ch;
              return Object.assign({}, ch, {
                name: name.slice(0, 100),
                emoji: emoji,
                description: desc,
                mode: mode,
              });
            }),
          });
        });
        clearSrEdit();
      } else {
        if (!parentId) return alert("Pick a top category");
        cats = (cfg.categories || []).map(function (c) {
          if (String(c.id) !== String(parentId)) return c;
          var children = (c.children || []).slice();
          if (children.length >= 15) throw new Error("Max 15 sub-categories");
          children.push({
            id: Math.random().toString(36).slice(2, 10),
            name: name.slice(0, 100),
            emoji: emoji,
            description: desc,
            mode: mode,
            roles: [],
          });
          return Object.assign({}, c, { children: children });
        });
      }
      await window.saveConfig({
        selfRoles: Object.assign({}, cfg, {
          categories: cats,
          enabled: $("sr-enabled")?.checked !== false,
          channelId: $("sr-channel")?.value || null,
        }),
      });
      if ($("sr-sub-name")) $("sr-sub-name").value = "";
      if ($("sr-sub-desc")) $("sr-sub-desc").value = "";
      if ($("sr-sub-emoji")) $("sr-sub-emoji").value = "";
      if (typeof window.loadGuildData === "function") await window.loadGuildData();
      else applyExtraConfig();
    } catch (e) {
      alert(e.message || "Failed");
    }
  }

  async function addSelfRole() {
    var target = $("sr-target-sub")?.value || "";
    var rid = $("sr-role")?.value;
    var label = ($("sr-label")?.value || "").trim();
    if (!label) return alert("Enter a label");
    if (!rid) return alert("Pick a role");
    try {
      var cfg = getSelfRolesState();
      var emoji = ($("sr-emoji")?.value || "").trim() || null;
      var rdesc = ($("sr-role-desc")?.value || "").trim().slice(0, 100) || null;
      var cats;
      if (srEdit && srEdit.type === "role") {
        var eci = srEdit.ci,
          echi = srEdit.chi,
          eri = srEdit.ri;
        cats = (cfg.categories || []).map(function (c, i) {
          if (i !== eci) return c;
          return Object.assign({}, c, {
            children: (c.children || []).map(function (ch, j) {
              if (j !== echi) return ch;
              return Object.assign({}, ch, {
                roles: (ch.roles || []).map(function (r, k) {
                  if (k !== eri) return r;
                  return {
                    roleId: rid,
                    label: label.slice(0, 100),
                    emoji: emoji,
                    description: rdesc,
                  };
                }),
              });
            }),
          });
        });
        clearSrEdit();
      } else {
        if (!target || target.indexOf("::") < 0) return alert("Pick a sub-category");
        var parts = target.split("::");
        var catId = parts[0],
          subId = parts[1];
        cats = (cfg.categories || []).map(function (c) {
          if (String(c.id) !== String(catId)) return c;
          return Object.assign({}, c, {
            children: (c.children || []).map(function (ch) {
              if (String(ch.id) !== String(subId)) return ch;
              var roles = (ch.roles || []).slice();
              if (
                roles.some(function (r) {
                  return String(r.roleId) === String(rid);
                })
              )
                throw new Error("That role is already in this group");
              if (roles.length >= 25) throw new Error("Max 25 roles per sub-category");
              roles.push({
                roleId: rid,
                label: label.slice(0, 100),
                emoji: emoji,
                description: rdesc,
              });
              return Object.assign({}, ch, { roles: roles });
            }),
          });
        });
      }
      await window.saveConfig({
        selfRoles: Object.assign({}, cfg, {
          categories: cats,
          enabled: $("sr-enabled")?.checked !== false,
          channelId: $("sr-channel")?.value || null,
        }),
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
    setVal("sr-btn-label", SR.buttonLabel || "Choose your roles");
    setVal("sr-embed-title", SR.embedTitle || SR.title || "Self Roles");
    setVal(
      "sr-embed-desc",
      SR.embedDescription ||
        SR.description ||
        "Click the button below to pick your roles. Everything is private — only you see the menus."
    );
    fillExtraSelects();
  }

  function patchFillSelects() {
    try {
      if (typeof fillChannelSelects === "function") {
        var _fc = fillChannelSelects;
        window.fillChannelSelects = fillChannelSelects = function () {
          _fc();
          fillExtraSelects();
        };
      }
      if (typeof fillRoleSelects === "function") {
        var _fr = fillRoleSelects;
        window.fillRoleSelects = fillRoleSelects = function () {
          _fr();
          fillExtraSelects();
        };
      }
    } catch (_) {}
    try {
      if (typeof showSection === "function") {
        var _ss = showSection;
        window.showSection = showSection = function (section) {
          _ss(section);
          setTimeout(fillExtraSelects, 50);
        };
      } else if (typeof window.showSection === "function") {
        var o2 = window.showSection;
        window.showSection = function (section) {
          o2(section);
          setTimeout(fillExtraSelects, 50);
        };
      }
    } catch (_) {}
  }

  function patchApplyConfig() {
    var orig = window.applyConfig || window.applyConfigToForms;
    if (typeof orig !== "function") return;
    var name = window.applyConfig ? "applyConfig" : "applyConfigToForms";
    window[name] = function () {
      orig.apply(this, arguments);
      try {
        applyExtraConfig();
      } catch (e) {
        console.warn("[features-config]", e);
      }
    };
  }

  function bindButtons() {
    $("save-selfroles")?.addEventListener("click", saveSelfRoles);
    $("sr-add-cat")?.addEventListener("click", addCategory);
    $("sr-add-sub")?.addEventListener("click", addSubCategory);
    $("sr-add-role")?.addEventListener("click", addSelfRole);
  }

  function boot() {
    var tries = 0;
    function tryPatch() {
      tries++;
      if (typeof window.saveConfig === "function" || typeof saveConfig === "function") {
        if (!window.saveConfig && typeof saveConfig === "function") window.saveConfig = saveConfig;
        if (!window.loadGuildData && typeof loadGuildData === "function")
          window.loadGuildData = loadGuildData;
        patchApplyConfig();
        patchFillSelects();
        bindButtons();
        applyExtraConfig();
        var n = 0;
        var t = setInterval(function () {
          fillExtraSelects();
          n++;
          if (n >= 20 || getChannels().length) clearInterval(t);
        }, 400);
        console.log("[features-config] ready (edit support)");
        return;
      }
      if (tries < 40) setTimeout(tryPatch, 150);
    }
    tryPatch();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
