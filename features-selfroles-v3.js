/**
 * Self Roles v3 — fast role picker
 * - Keep Add / Remove panel buttons (sr-panels.js)
 * - Categories only (no forced sub-category steps)
 * - Search + multi-select roles, one click to add many
 * - Auto label from role name
 * - Data shape stays bot-compatible: category → children[0] → roles
 */
(function () {
  "use strict";
  if (window.__selfRolesV3) return;
  window.__selfRolesV3 = true;

  function $(id) {
    return document.getElementById(id);
  }

  function newId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function getRoles() {
    try {
      if (typeof rolesCache !== "undefined" && Array.isArray(rolesCache) && rolesCache.length)
        return rolesCache;
    } catch (_) {}
    return window.rolesCache || [];
  }

  function roleName(id) {
    var r = getRoles().find(function (x) {
      return String(x.id) === String(id);
    });
    return r ? r.name : String(id || "").slice(-6);
  }

  function roleColor(id) {
    var r = getRoles().find(function (x) {
      return String(x.id) === String(id);
    });
    if (!r || r.color == null || r.color === 0) return null;
    var c = Number(r.color);
    if (!c) return null;
    return "#" + ("000000" + c.toString(16)).slice(-6);
  }

  function ensureCfg() {
    if (!window.currentConfig) window.currentConfig = {};
    var s = window.currentConfig.selfRoles || {};
    if (!Array.isArray(s.categories)) s.categories = [];
    // Normalize legacy / nested → always one default child bucket per category
    s.categories = s.categories.map(function (c) {
      c = Object.assign({}, c);
      if (!c.id) c.id = newId();
      if (!Array.isArray(c.children) || !c.children.length) {
        var roles = Array.isArray(c.roles) ? c.roles : [];
        c.children = [
          {
            id: (c.id || newId()) + "-roles",
            name: c.name || "Roles",
            emoji: c.emoji || "✨",
            description: c.description || "",
            mode: c.mode === "single" ? "single" : "multi",
            roles: roles
          }
        ];
        delete c.roles;
      } else {
        c.children = c.children.map(function (ch) {
          ch = Object.assign({}, ch);
          if (!ch.id) ch.id = newId();
          if (!Array.isArray(ch.roles)) ch.roles = [];
          ch.mode = ch.mode === "single" ? "single" : "multi";
          return ch;
        });
      }
      return c;
    });
    if (!Array.isArray(s.panels)) s.panels = [];
    window.currentConfig.selfRoles = s;
    return s;
  }

  var selectedRoleIds = {};

  function setStatus(msg, ok) {
    var el = $("sr-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  function rebuildSection() {
    var section = $("selfroles");
    if (!section) return false;

    // Preserve panels UI if already present — re-attach after rebuild
    var panelsWas = $("sr-panels-ui");

    var card = section.querySelector(".card") || section;
    // Mark so we only rebuild once structure
    if ($("sr-v3-root")) {
      renderAll();
      return true;
    }

    // Hide old nested form controls without breaking ids used by sr-panels
    var oldBits = card.querySelectorAll(
      "h3.subhead, #sr-add-cat, #sr-add-sub, #sr-add-role, .level-role-form, #sr-categories, #sr-cat-emoji, #sr-cat-name, #sr-cat-desc, #sr-parent-cat, #sr-sub-emoji, #sr-sub-name, #sr-sub-mode, #sr-sub-desc, #sr-target-sub, #sr-role, #sr-label, #sr-emoji, #sr-role-desc"
    );
    oldBits.forEach(function (el) {
      var group = el.closest(".input-group, .config-grid, .level-role-form") || el;
      if (group && group.id !== "sr-panels-ui") {
        // hide parent grid chunks carefully
        if (el.tagName === "H3" || el.id === "sr-add-cat" || el.id === "sr-add-sub" || el.id === "sr-add-role" || el.id === "sr-categories") {
          el.style.display = "none";
        } else if (group.classList && (group.classList.contains("input-group") || group.classList.contains("config-grid") || group.classList.contains("level-role-form"))) {
          // only hide if it's the old builder fields
          var id = el.id || "";
          if (/^sr-(cat|sub|target|role|label|emoji|parent)/.test(id) || id === "sr-role-desc") {
            group.style.display = "none";
          }
        }
      }
    });

    // Hide old subheads by text
    card.querySelectorAll("h3.subhead").forEach(function (h) {
      var t = (h.textContent || "").toLowerCase();
      if (/top category|sub-category|role \(under|nested/.test(t)) h.style.display = "none";
    });

    // Update title / hint
    var h2 = card.querySelector("h2");
    if (h2) h2.textContent = "Self Roles";
    var hint = card.querySelector(".form-hint");
    if (hint && !(hint.id || "").includes("status")) {
      hint.innerHTML =
        "Members use <strong>Add roles</strong> / <strong>Remove roles</strong> on your Discord panel. " +
        "Below: make categories, multi-select roles, save.";
    }

    var root = document.createElement("div");
    root.id = "sr-v3-root";
    root.innerHTML =
      '<style>' +
      "#sr-v3-root{margin-top:1rem}" +
      "#sr-v3-root .sr-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}" +
      "#sr-v3-root .sr-search{flex:1;min-width:160px;padding:10px 12px;border-radius:10px;border:1px solid rgba(128,128,128,.35);background:rgba(0,0,0,.15);color:inherit}" +
      "#sr-v3-root .sr-role-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;max-height:220px;overflow:auto;padding:8px;border-radius:12px;border:1px solid rgba(128,128,128,.25);background:rgba(0,0,0,.08);margin-bottom:12px}" +
      "#sr-v3-root .sr-chip{display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:10px;border:1px solid rgba(128,128,128,.3);cursor:pointer;user-select:none;font-size:13px;line-height:1.2;background:rgba(255,255,255,.04)}" +
      "#sr-v3-root .sr-chip.on{border-color:#60a5fa;background:rgba(96,165,250,.18);box-shadow:0 0 0 1px rgba(96,165,250,.35)}" +
      "#sr-v3-root .sr-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;background:#888}" +
      "#sr-v3-root .sr-cat{border:1px solid rgba(128,128,128,.28);border-radius:14px;padding:12px;margin:0 0 12px;background:rgba(0,0,0,.1)}" +
      "#sr-v3-root .sr-cat-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px}" +
      "#sr-v3-root .sr-cat-head input,#sr-v3-root .sr-cat-head select{padding:8px 10px;border-radius:8px;border:1px solid rgba(128,128,128,.3);background:rgba(0,0,0,.15);color:inherit}" +
      "#sr-v3-root .sr-roles-row{display:flex;flex-wrap:wrap;gap:6px;min-height:28px}" +
      "#sr-v3-root .sr-tag{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:999px;font-size:12px;background:rgba(255,255,255,.08);border:1px solid rgba(128,128,128,.25)}" +
      "#sr-v3-root .sr-tag button{border:0;background:transparent;color:inherit;cursor:pointer;opacity:.7;padding:0 2px;font-size:14px}" +
      "#sr-v3-root .sr-tag button:hover{opacity:1}" +
      "#sr-v3-root .sr-empty{opacity:.65;font-size:13px}" +
      "</style>" +
      '<h3 class="subhead">Pick roles (multi-select)</h3>' +
      '<div class="sr-toolbar">' +
      '<input class="sr-search" id="sr-v3-search" type="search" placeholder="Search roles…" autocomplete="off">' +
      '<button type="button" class="button" id="sr-v3-select-all">Select visible</button>' +
      '<button type="button" class="button" id="sr-v3-clear">Clear</button>' +
      "</div>" +
      '<div class="sr-role-grid" id="sr-v3-role-grid"></div>' +
      '<p class="form-hint" id="sr-v3-pick-count">0 roles selected</p>' +
      '<h3 class="subhead">Categories</h3>' +
      '<p class="form-hint">Add a category, then dump the selected roles into it. Mode: multi = pick many, single = one role only.</p>' +
      '<div id="sr-v3-cats"></div>' +
      '<div class="sr-toolbar" style="margin-top:8px">' +
      '<input id="sr-v3-new-name" type="text" maxlength="100" placeholder="New category name (e.g. Colors)" style="flex:1;min-width:160px;padding:10px 12px;border-radius:10px;border:1px solid rgba(128,128,128,.35);background:rgba(0,0,0,.15);color:inherit">' +
      '<input id="sr-v3-new-emoji" type="text" maxlength="16" placeholder="🎨" style="width:64px;padding:10px;border-radius:10px;border:1px solid rgba(128,128,128,.35);background:rgba(0,0,0,.15);color:inherit">' +
      '<button type="button" class="button" id="sr-v3-add-cat">+ Category</button>' +
      "</div>";

    var saveBtn = $("save-selfroles");
    if (saveBtn && saveBtn.parentNode) {
      saveBtn.parentNode.insertBefore(root, saveBtn);
    } else {
      card.appendChild(root);
    }

    // Soften old save label
    if (saveBtn) saveBtn.textContent = "Save Self Roles";

    bind();
    renderAll();
    return true;
  }

  function updatePickCount() {
    var n = Object.keys(selectedRoleIds).filter(function (k) {
      return selectedRoleIds[k];
    }).length;
    var el = $("sr-v3-pick-count");
    if (el) el.textContent = n + " role" + (n === 1 ? "" : "s") + " selected";
  }

  function renderRoleGrid() {
    var grid = $("sr-v3-role-grid");
    if (!grid) return;
    var q = (($("sr-v3-search") && $("sr-v3-search").value) || "").trim().toLowerCase();
    var roles = getRoles()
      .filter(function (r) {
        if (!r || r.managed) return false;
        // skip @everyone
        if (String(r.name) === "@everyone") return false;
        if (!q) return true;
        return String(r.name || "").toLowerCase().indexOf(q) >= 0;
      })
      .sort(function (a, b) {
        return String(a.name || "").localeCompare(String(b.name || ""));
      });

    if (!roles.length) {
      grid.innerHTML =
        '<p class="sr-empty">No roles loaded yet — open any settings tab once so the role list caches, or wait a moment.</p>';
      return;
    }

    grid.innerHTML = roles
      .map(function (r) {
        var on = !!selectedRoleIds[r.id];
        var col = roleColor(r.id);
        return (
          '<div class="sr-chip' +
          (on ? " on" : "") +
          '" data-role-id="' +
          String(r.id) +
          '" title="' +
          String(r.name || "").replace(/"/g, "") +
          '">' +
          '<span class="sr-dot" style="' +
          (col ? "background:" + col : "") +
          '"></span>' +
          "<span>" +
          String(r.name || r.id).replace(/</g, "<") +
          "</span></div>"
        );
      })
      .join("");
  }

  function renderCats() {
    var box = $("sr-v3-cats");
    if (!box) return;
    var cfg = ensureCfg();
    var cats = cfg.categories || [];
    if (!cats.length) {
      box.innerHTML =
        '<p class="sr-empty">No categories yet. Type a name above and hit + Category, then add roles.</p>';
      return;
    }

    box.innerHTML = cats
      .map(function (c, ci) {
        var child = (c.children && c.children[0]) || { roles: [], mode: "multi" };
        // flatten roles from all children for display
        var allRoles = [];
        (c.children || []).forEach(function (ch) {
          (ch.roles || []).forEach(function (r) {
            allRoles.push({ chId: ch.id, role: r });
          });
        });
        var mode = child.mode === "single" ? "single" : "multi";
        var tags =
          allRoles.length === 0
            ? '<span class="sr-empty">No roles in this category</span>'
            : allRoles
                .map(function (item, ri) {
                  var r = item.role;
                  var col = roleColor(r.roleId);
                  var label = (r.emoji ? r.emoji + " " : "") + (r.label || roleName(r.roleId));
                  return (
                    '<span class="sr-tag" title="' +
                    String(r.roleId || "") +
                    '">' +
                    (col
                      ? '<span class="sr-dot" style="background:' + col + '"></span>'
                      : "") +
                    "<span>" +
                    String(label).replace(/</g, "<") +
                    "</span>" +
                    '<button type="button" data-rm-ci="' +
                    ci +
                    '" data-rm-chid="' +
                    item.chId +
                    '" data-rm-rid="' +
                    String(r.roleId) +
                    '" aria-label="Remove">×</button></span>'
                  );
                })
                .join("");

        return (
          '<div class="sr-cat" data-ci="' +
          ci +
          '">' +
          '<div class="sr-cat-head">' +
          '<input data-cat-emoji="' +
          ci +
          '" value="' +
          String(c.emoji || "✨").replace(/"/g, """) +
          '" maxlength="16" style="width:52px" title="Emoji">' +
          '<input data-cat-name="' +
          ci +
          '" value="' +
          String(c.name || "").replace(/"/g, """) +
          '" maxlength="100" style="flex:1;min-width:120px" placeholder="Category name">' +
          '<select data-cat-mode="' +
          ci +
          '">' +
          '<option value="multi"' +
          (mode === "multi" ? " selected" : "") +
          ">Multi-select</option>" +
          '<option value="single"' +
          (mode === "single" ? " selected" : "") +
          ">Single-select</option>" +
          "</select>" +
          '<button type="button" class="button" data-add-to="' +
          ci +
          '">+ Add selected roles</button>' +
          '<button type="button" class="button" data-del-cat="' +
          ci +
          '" style="opacity:.85">Delete</button>' +
          "</div>" +
          '<div class="sr-roles-row">' +
          tags +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderAll() {
    ensureCfg();
    renderRoleGrid();
    renderCats();
    updatePickCount();
  }

  function selectedIdsList() {
    return Object.keys(selectedRoleIds).filter(function (k) {
      return selectedRoleIds[k];
    });
  }

  function addSelectedToCategory(ci) {
    var cfg = ensureCfg();
    var cat = cfg.categories[ci];
    if (!cat) return;
    if (!cat.children || !cat.children.length) {
      cat.children = [
        {
          id: (cat.id || newId()) + "-roles",
          name: cat.name || "Roles",
          emoji: cat.emoji || "✨",
          description: "",
          mode: "multi",
          roles: []
        }
      ];
    }
    // Put new roles on the first child (simple model)
    var child = cat.children[0];
    if (!Array.isArray(child.roles)) child.roles = [];
    var existing = {};
    child.roles.forEach(function (r) {
      existing[String(r.roleId)] = true;
    });
    // Also mark roles in other children as existing
    cat.children.forEach(function (ch) {
      (ch.roles || []).forEach(function (r) {
        existing[String(r.roleId)] = true;
      });
    });

    var added = 0;
    selectedIdsList().forEach(function (rid) {
      if (existing[String(rid)]) return;
      var name = roleName(rid);
      child.roles.push({
        roleId: String(rid),
        label: name.slice(0, 100),
        emoji: "",
        description: ""
      });
      existing[String(rid)] = true;
      added++;
    });

    if (!added) {
      setStatus("Nothing new to add (already in category or none selected).", false);
      return;
    }
    setStatus("Added " + added + " role(s). Click Save Self Roles when done.", true);
    renderCats();
  }

  function bind() {
    var root = $("sr-v3-root");
    if (!root || root.dataset.bound) return;
    root.dataset.bound = "1";

    root.addEventListener("click", function (e) {
      var chip = e.target.closest(".sr-chip");
      if (chip && chip.getAttribute("data-role-id")) {
        var id = chip.getAttribute("data-role-id");
        selectedRoleIds[id] = !selectedRoleIds[id];
        chip.classList.toggle("on", !!selectedRoleIds[id]);
        updatePickCount();
        return;
      }

      var addBtn = e.target.closest("[data-add-to]");
      if (addBtn) {
        addSelectedToCategory(Number(addBtn.getAttribute("data-add-to")));
        return;
      }

      var del = e.target.closest("[data-del-cat]");
      if (del) {
        var dci = Number(del.getAttribute("data-del-cat"));
        var cfg = ensureCfg();
        var name = (cfg.categories[dci] && cfg.categories[dci].name) || "category";
        if (!confirm('Delete category "' + name + '"?')) return;
        cfg.categories.splice(dci, 1);
        renderCats();
        setStatus("Category removed (save to keep).", true);
        return;
      }

      var rm = e.target.closest("[data-rm-rid]");
      if (rm) {
        var ci = Number(rm.getAttribute("data-rm-ci"));
        var chId = rm.getAttribute("data-rm-chid");
        var rid = rm.getAttribute("data-rm-rid");
        var cfg2 = ensureCfg();
        var cat = cfg2.categories[ci];
        if (!cat) return;
        (cat.children || []).forEach(function (ch) {
          if (String(ch.id) !== String(chId)) return;
          ch.roles = (ch.roles || []).filter(function (r) {
            return String(r.roleId) !== String(rid);
          });
        });
        renderCats();
        setStatus("Role removed from category (save to keep).", true);
        return;
      }
    });

    root.addEventListener("input", function (e) {
      var t = e.target;
      if (t.id === "sr-v3-search") {
        renderRoleGrid();
        return;
      }
      if (t.hasAttribute("data-cat-name")) {
        var ci = Number(t.getAttribute("data-cat-name"));
        var cfg = ensureCfg();
        if (cfg.categories[ci]) {
          cfg.categories[ci].name = t.value.slice(0, 100);
          // keep child name in sync
          if (cfg.categories[ci].children && cfg.categories[ci].children[0]) {
            cfg.categories[ci].children[0].name = cfg.categories[ci].name;
          }
        }
      }
      if (t.hasAttribute("data-cat-emoji")) {
        var ci2 = Number(t.getAttribute("data-cat-emoji"));
        var cfg2 = ensureCfg();
        if (cfg2.categories[ci2]) {
          cfg2.categories[ci2].emoji = t.value.slice(0, 16);
          if (cfg2.categories[ci2].children && cfg2.categories[ci2].children[0]) {
            cfg2.categories[ci2].children[0].emoji = cfg2.categories[ci2].emoji;
          }
        }
      }
    });

    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t.hasAttribute("data-cat-mode")) {
        var ci = Number(t.getAttribute("data-cat-mode"));
        var cfg = ensureCfg();
        if (cfg.categories[ci] && cfg.categories[ci].children) {
          cfg.categories[ci].children.forEach(function (ch) {
            ch.mode = t.value === "single" ? "single" : "multi";
          });
        }
      }
    });

    $("sr-v3-select-all") &&
      $("sr-v3-select-all").addEventListener("click", function () {
        document.querySelectorAll("#sr-v3-role-grid .sr-chip").forEach(function (chip) {
          var id = chip.getAttribute("data-role-id");
          selectedRoleIds[id] = true;
          chip.classList.add("on");
        });
        updatePickCount();
      });

    $("sr-v3-clear") &&
      $("sr-v3-clear").addEventListener("click", function () {
        selectedRoleIds = {};
        document.querySelectorAll("#sr-v3-role-grid .sr-chip.on").forEach(function (c) {
          c.classList.remove("on");
        });
        updatePickCount();
      });

    $("sr-v3-add-cat") &&
      $("sr-v3-add-cat").addEventListener("click", function () {
        var name = (($("sr-v3-new-name") && $("sr-v3-new-name").value) || "").trim();
        if (!name) return alert("Enter a category name");
        var emoji = (($("sr-v3-new-emoji") && $("sr-v3-new-emoji").value) || "").trim() || "✨";
        var cfg = ensureCfg();
        if (cfg.categories.length >= 25) return alert("Max 25 categories");
        var id = newId();
        cfg.categories.push({
          id: id,
          name: name.slice(0, 100),
          emoji: emoji,
          description: "",
          children: [
            {
              id: id + "-roles",
              name: name.slice(0, 100),
              emoji: emoji,
              description: "",
              mode: "multi",
              roles: []
            }
          ]
        });
        if ($("sr-v3-new-name")) $("sr-v3-new-name").value = "";
        renderCats();
        // auto-add current selection
        addSelectedToCategory(cfg.categories.length - 1);
        setStatus('Category "' + name + '" created.', true);
      });

    // Intercept save to include full state + panels
    var save = $("save-selfroles");
    if (save && !save.dataset.srV3) {
      save.dataset.srV3 = "1";
      save.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          persist().catch(function (err) {
            setStatus("❌ " + (err && err.message ? err.message : "Save failed"), false);
          });
        },
        true
      );
    }
  }

  async function persist() {
    if (!window.saveConfig) throw new Error("Save not ready");
    setStatus("Saving…", true);
    var cfg = ensureCfg();
    var payload = {
      selfRoles: Object.assign({}, cfg, {
        enabled: $("sr-enabled") ? $("sr-enabled").checked !== false : cfg.enabled !== false,
        channelId: $("sr-channel") ? $("sr-channel").value || null : cfg.channelId || null,
        buttonLabel:
          ($("sr-btn-label") && $("sr-btn-label").value.trim()) ||
          cfg.buttonLabel ||
          "Add roles",
        removeButtonLabel:
          ($("sr-btn-remove") && $("sr-btn-remove").value.trim()) ||
          cfg.removeButtonLabel ||
          "Remove roles",
        embedTitle:
          ($("sr-embed-title") && $("sr-embed-title").value.trim()) ||
          cfg.embedTitle ||
          "Self Roles",
        embedDescription:
          ($("sr-embed-desc") && $("sr-embed-desc").value.trim()) ||
          cfg.embedDescription ||
          "Use **Add roles** or **Remove roles**. Menus are private.",
        categories: cfg.categories
      })
    };
    var data = await window.saveConfig(payload);
    window.currentConfig.selfRoles = payload.selfRoles;
    var text =
      data && data.savedToBot === false
        ? "Saved on website. Bot did not sync. Run /selfroles-setup after the bot is online."
        : "✅ Saved. Run /selfroles-setup in Discord to refresh panels.";
    setStatus(text, true);
    return data;
  }

  function boot() {
    if (!$("selfroles")) {
      setTimeout(boot, 200);
      return;
    }
    rebuildSection();
    // roles may load late
    [400, 1200, 3000, 7000].forEach(function (ms) {
      setTimeout(renderAll, ms);
    });
    console.log("[selfroles-v3] ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
