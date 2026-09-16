/**
 * Staff AI Operator (sudo) — website config panel extension
 * Adds sudo role selector to the existing AI Staff section.
 */
(function () {
  "use strict";
  if (window.__featuresSudoOperator) return;
  window.__featuresSudoOperator = true;

  function $(id) {
    return document.getElementById(id);
  }

  function roles() {
    try {
      if (typeof rolesCache !== "undefined" && rolesCache && rolesCache.length) return rolesCache;
    } catch (_) {}
    return window.rolesCache || [];
  }

  function fillSudoSelect() {
    var sel = $("aistaff-sudo-role");
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">None (operator off)</option>';
    roles().forEach(function (r) {
      if (!r || r.name === "@everyone") return;
      var o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.name || r.id;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }

  function ensureSudoUi() {
    var section = $("aistaff");
    if (!section) return false;
    if ($("aistaff-sudo-role")) return true;

    var card = section.querySelector(".card") || section;
    var status = $("aistaff-status");
    var insertBefore = status || $("save-aistaff");

    var block = document.createElement("div");
    block.id = "aistaff-sudo-block";
    block.style.margin = "1rem 0";
    block.style.padding = "0.75rem";
    block.style.border = "1px solid rgba(196,164,132,0.35)";
    block.style.borderRadius = "8px";
    block.innerHTML =
      '<p class="eyebrow" style="margin:0 0 0.5rem">SUDO OPERATOR</p>' +
      "<p class=\"form-hint\">High-trust only. Members with this role can @mention the bot and run operator actions (moderation, beans, announcements) with confirmations for destructive steps. Server owner always has access. Leave empty to keep the operator off.</p>" +
      '<label class="toggle"><input type="checkbox" id="aistaff-operator-enabled" checked> <span>Operator enabled</span></label>' +
      '<div class="input-group" style="margin-top:0.5rem"><label>Sudo role</label>' +
      '<select id="aistaff-sudo-role"><option value="">None (operator off)</option></select></div>';

    if (insertBefore && insertBefore.parentNode) {
      insertBefore.parentNode.insertBefore(block, insertBefore);
    } else {
      card.appendChild(block);
    }
    fillSudoSelect();
    return true;
  }

  function applySudoFromConfig() {
    ensureSudoUi();
    fillSudoSelect();
    var c = window.currentConfig || {};
    var st = (c.ai && c.ai.staff) || {};
    if ($("aistaff-operator-enabled"))
      $("aistaff-operator-enabled").checked = st.operatorEnabled !== false;
    if ($("aistaff-sudo-role")) $("aistaff-sudo-role").value = st.sudoRoleId || "";
  }

  // Hook into existing save if possible by wrapping saveConfig path used by AI Staff
  var origSave = null;
  function hookSaveButton() {
    var btn = $("save-aistaff");
    if (!btn || btn.__sudoHooked) return;
    btn.__sudoHooked = true;
    btn.addEventListener(
      "click",
      function () {
        // After the main save runs, push sudo fields in a follow-up if needed.
        // Prefer piggybacking: override window path used by features-automod-staff.
        setTimeout(function () {
          try {
            var payload = {
              ai: {
                staff: {
                  sudoRoleId:
                    $("aistaff-sudo-role") && $("aistaff-sudo-role").value
                      ? $("aistaff-sudo-role").value
                      : null,
                  operatorEnabled: $("aistaff-operator-enabled")
                    ? $("aistaff-operator-enabled").checked
                    : true,
                },
              },
            };
            if (typeof window.saveConfig === "function") {
              window.saveConfig(payload).then(function () {
                var el = $("aistaff-status");
                if (el && el.textContent && el.textContent.indexOf("✅") >= 0) {
                  el.textContent = el.textContent.replace(
                    /AI Staff saved/, "AI Staff + Sudo Operator saved"
                  );
                }
              });
            }
          } catch (e) {
            console.error("[sudo-ui]", e);
          }
        }, 400);
      },
      true
    );
  }

  // Patch saveAiStaff by wrapping when the page defines it later — also include sudo in any saveConfig for ai.staff
  var _saveConfig = window.saveConfig;
  Object.defineProperty(window, "saveConfig", {
    configurable: true,
    get: function () {
      return function (body) {
        try {
          if (body && body.ai && body.ai.staff) {
            if ($("aistaff-sudo-role")) {
              body.ai.staff.sudoRoleId = $("aistaff-sudo-role").value || null;
            }
            if ($("aistaff-operator-enabled")) {
              body.ai.staff.operatorEnabled = $("aistaff-operator-enabled").checked;
            }
          }
        } catch (_) {}
        return _saveConfig.apply(this, arguments);
      };
    },
    set: function (fn) {
      _saveConfig = fn;
    },
  });

  var n = 0;
  function boot() {
    n++;
    ensureSudoUi();
    applySudoFromConfig();
    hookSaveButton();
    fillSudoSelect();
    if (n < 80) setTimeout(boot, 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // Re-apply when guild data loads
  var _load = window.loadGuildData;
  if (typeof _load === "function") {
    window.loadGuildData = async function () {
      var r = await _load.apply(this, arguments);
      try {
        applySudoFromConfig();
      } catch (_) {}
      return r;
    };
  }

  console.log("[features-sudo-operator] loaded");
})();
