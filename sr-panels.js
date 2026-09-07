/**
 * Multi-panel self-roles overlay. Runs after features-ui + features-config.
 */
(function () {
  "use strict";
  if (window.__srPanelsV1) return;
  window.__srPanelsV1 = true;

  function $(id) {
    return document.getElementById(id);
  }

  var srPanelId = null;

  function newId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function cfg() {
    window.currentConfig = window.currentConfig || {};
    var s = window.currentConfig.selfRoles || {};
    if (!Array.isArray(s.categories)) s.categories = [];
    if (!Array.isArray(s.panels) || !s.panels.length) {
      s.panels = [
        {
          id: newId(),
          name: "Main panel",
          channelId: s.channelId || null,
          messageId: s.messageId || null,
          buttonLabel: s.buttonLabel || "Add roles",
          removeButtonLabel: s.removeButtonLabel || "Remove roles",
          embedTitle: s.embedTitle || "Self Roles",
          embedDescription: s.embedDescription || "",
          categoryIds: s.categories.map(function (c) {
            return String(c.id);
          }),
        },
      ];
    }
    window.currentConfig.selfRoles = s;
    return s;
  }

  function selected() {
    var s = cfg();
    var p = s.panels.find(function (x) {
      return String(x.id) === String(srPanelId);
    });
    if (!p) {
      p = s.panels[0];
      srPanelId = p ? p.id : null;
    }
    return p;
  }

  function injectFields() {
    if ($("sr-panel-select")) return true;
    var channel = $("sr-channel");
    if (!channel || !channel.parentNode) return false;
    var mount = channel.parentNode;
    var block = document.createElement("div");
    block.id = "sr-panels-ui";
    block.innerHTML =
      '<h3 class="subhead">Panels</h3>' +
      '<p class="form-hint">Each panel can post to a different channel with a different set of categories. After saving, run <code>/selfroles-setup</code> or <code>/selfroles-setup panel:Name</code>.</p>' +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Edit panel</label><select id="sr-panel-select"></select></div>' +
      '<div class="input-group"><label>Panel name</label><input id="sr-panel-name" type="text" maxlength="80" placeholder="e.g. Colors"></div></div>' +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin:0.4rem 0 0.8rem">' +
      '<button class="button" type="button" id="sr-add-panel">New panel</button>' +
      '<button class="button" type="button" id="sr-delete-panel">Delete this panel</button></div>' +
      '<div class="input-group"><label>Remove button label</label><input id="sr-btn-remove" type="text" maxlength="80" placeholder="Remove roles"></div>' +
      '<div class="input-group" style="grid-column:1/-1"><label>Categories on this panel</label><div id="sr-panel-cats"></div></div>';
    mount.parentNode.insertBefore(block, mount);
    return true;
  }

  function fillSelect() {
    var el = $("sr-panel-select");
    if (!el) return;
    var s = cfg();
    el.innerHTML = "";
    s.panels.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.name || "Panel";
      el.appendChild(o);
    });
    if (srPanelId) el.value = srPanelId;
  }

  function renderChecks() {
    var box = $("sr-panel-cats");
    if (!box) return;
    var s = cfg();
    var p = selected();
    var assigned = (p && p.categoryIds) || [];
    if (!s.categories.length) {
      box.innerHTML = '<p class="form-hint">Add categories below, then tick which ones belong here.</p>';
      return;
    }
    box.innerHTML = s.categories
      .map(function (c) {
        var on = assigned.indexOf(String(c.id)) >= 0;
        return (
          '<label class="toggle" style="display:inline-flex;margin:0.2rem 0.8rem 0.2rem 0">' +
          '<input type="checkbox" data-sr-panel-cat="' +
          c.id +
          '"' +
          (on ? " checked" : "") +
          "> <span>" +
          (c.emoji ? c.emoji + " " : "") +
          (c.name || "Category") +
          "</span></label>"
        );
      })
      .join("");
  }

  function readIntoSelected() {
    var s = cfg();
    var p = selected();
    if (!p) return s;
    if ($("sr-panel-name")) p.name = ($("sr-panel-name").value || "").trim() || p.name || "Panel";
    if ($("sr-channel")) p.channelId = $("sr-channel").value || null;
    if ($("sr-btn-label")) p.buttonLabel = ($("sr-btn-label").value || "").trim() || "Add roles";
    if ($("sr-btn-remove"))
      p.removeButtonLabel = ($("sr-btn-remove").value || "").trim() || "Remove roles";
    if ($("sr-embed-title"))
      p.embedTitle = ($("sr-embed-title").value || "").trim() || p.name || "Self Roles";
    if ($("sr-embed-desc")) p.embedDescription = ($("sr-embed-desc").value || "").trim();
    var boxes = document.querySelectorAll("[data-sr-panel-cat]");
    if (boxes.length) {
      p.categoryIds = [];
      boxes.forEach(function (el) {
        if (el.checked) p.categoryIds.push(String(el.getAttribute("data-sr-panel-cat")));
      });
    }
    s.channelId = p.channelId;
    s.buttonLabel = p.buttonLabel;
    s.removeButtonLabel = p.removeButtonLabel;
    s.embedTitle = p.embedTitle;
    s.embedDescription = p.embedDescription;
    return s;
  }

  function applySelected() {
    var p = selected();
    if (!p) return;
    if ($("sr-panel-name")) $("sr-panel-name").value = p.name || "";
    if ($("sr-channel")) $("sr-channel").value = p.channelId || "";
    if ($("sr-btn-label")) $("sr-btn-label").value = p.buttonLabel || "Add roles";
    if ($("sr-btn-remove")) $("sr-btn-remove").value = p.removeButtonLabel || "Remove roles";
    if ($("sr-embed-title")) $("sr-embed-title").value = p.embedTitle || "Self Roles";
    if ($("sr-embed-desc")) $("sr-embed-desc").value = p.embedDescription || "";
    fillSelect();
    renderChecks();
  }

  async function persist(extraStatus) {
    var s = readIntoSelected();
    if (!window.saveConfig) throw new Error("saveConfig missing");
    var data = await window.saveConfig({
      selfRoles: {
        enabled: $("sr-enabled") ? $("sr-enabled").checked !== false : true,
        channelId: s.channelId || null,
        buttonLabel: s.buttonLabel || "Add roles",
        removeButtonLabel: s.removeButtonLabel || "Remove roles",
        embedTitle: s.embedTitle || "Self Roles",
        embedDescription: s.embedDescription || "",
        categories: s.categories || [],
        panels: s.panels || [],
      },
    });
    var el = $("sr-status");
    if (el) {
      el.style.color = "#4ade80";
      el.textContent =
        extraStatus ||
        (data && data.savedToBot === false
          ? "Saved on website. Run /selfroles-setup after the bot is online."
          : "✅ Saved. Run /selfroles-setup to post every panel, or /selfroles-setup panel:Name for one.");
    }
    return data;
  }

  function bind() {
    var save = $("save-selfroles");
    if (save && !save.dataset.srPanels) {
      save.dataset.srPanels = "1";
      save.addEventListener(
        "click",
        function (e) {
          e.stopImmediatePropagation();
          persist().catch(function (err) {
            var el = $("sr-status");
            if (el) {
              el.style.color = "#f87171";
              el.textContent = "❌ " + (err.message || "Failed");
            }
          });
        },
        true
      );
    }
    $("sr-panel-select") &&
      $("sr-panel-select").addEventListener("change", function () {
        readIntoSelected();
        srPanelId = $("sr-panel-select").value;
        applySelected();
      });
    $("sr-add-panel") &&
      $("sr-add-panel").addEventListener("click", async function () {
        var s = readIntoSelected();
        if (s.panels.length >= 10) return alert("Max 10 panels");
        var p = {
          id: newId(),
          name: "New panel",
          channelId: null,
          messageId: null,
          buttonLabel: "Add roles",
          removeButtonLabel: "Remove roles",
          embedTitle: "Self Roles",
          embedDescription:
            "Use **Add roles** to get roles, or **Remove roles** to drop them. Menus are private — only you see them.",
          categoryIds: [],
        };
        s.panels.push(p);
        srPanelId = p.id;
        await persist("New panel added. Set its channel and categories, then save again.");
        applySelected();
      });
    $("sr-delete-panel") &&
      $("sr-delete-panel").addEventListener("click", async function () {
        var s = cfg();
        if (s.panels.length <= 1) return alert("Keep at least one panel.");
        if (!confirm("Delete this panel?")) return;
        s.panels = s.panels.filter(function (p) {
          return String(p.id) !== String(srPanelId);
        });
        srPanelId = s.panels[0].id;
        await persist("Panel deleted.");
        applySelected();
      });
  }

  function boot() {
    if (!injectFields()) {
      setTimeout(boot, 200);
      return;
    }
    try {
      applySelected();
      bind();
    } catch (e) {
      console.warn("[sr-panels]", e);
    }
    var n = 0;
    var t = setInterval(function () {
      try {
        cfg();
        applySelected();
      } catch (_) {}
      if (++n > 15) clearInterval(t);
    }, 500);
    console.log("[sr-panels] ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
