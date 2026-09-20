/**
 * Adds per-category escalate role + user fields onto the Tickets v3 panel.
 * Report → support role, Partnership → owner user, etc.
 */
(function () {
  "use strict";
  if (window.__ticketsPercatV1) return;
  window.__ticketsPercatV1 = true;

  function roles() {
    try {
      if (window.syncGlobals) window.syncGlobals();
    } catch (_) {}
    return window.rolesCache || [];
  }

  function roleOptions(selected) {
    var html = '<option value="">Select role…</option>';
    roles().forEach(function (r) {
      html +=
        '<option value="' +
        r.id +
        '"' +
        (String(selected) === String(r.id) ? " selected" : "") +
        ">" +
        (r.name || r.id) +
        "</option>";
    });
    return html;
  }

  function enhanceCategoryCards() {
    var list = document.getElementById("ticket-cats-list");
    if (!list) return;
    list.querySelectorAll("[data-cat-i]").forEach(function (card) {
      if (card.querySelector("[data-percat-esc]")) return;

      var box = document.createElement("div");
      box.setAttribute("data-percat-esc", "1");
      box.style.marginTop = "10px";
      box.style.padding = "10px";
      box.style.border = "1px solid rgba(128,128,128,.3)";
      box.style.borderRadius = "10px";

      var existingRoles = (card.getAttribute("data-esc-roles") || "").split(",").filter(Boolean);
      var existingUsers = (card.getAttribute("data-esc-users") || "").split(",").filter(Boolean);

      box.innerHTML =
        "<strong>Escalate to (this category only)</strong>" +
        '<p class="form-hint" style="margin:4px 0 8px">When AI hands off / human is requested, or if AI is off for this type, these get pinged — not the global list.</p>' +
        '<div class="input-group"><label>Escalate role</label>' +
        '<div class="inline-row"><select data-percat-role>' +
        roleOptions("") +
        '</select> <button type="button" class="button" data-percat-add-role>Add role</button></div></div>' +
        '<div data-percat-role-list class="level-roles-list"></div>' +
        '<div class="input-group"><label>Escalate user ID (e.g. owner)</label>' +
        '<div class="inline-row"><input type="text" data-percat-user placeholder="User snowflake"> ' +
        '<button type="button" class="button" data-percat-add-user>Add user</button></div></div>' +
        '<div data-percat-user-list class="level-roles-list"></div>';

      card.appendChild(box);

      var roleIds = existingRoles.slice();
      var userIds = existingUsers.slice();

      function renderRoles() {
        var el = box.querySelector("[data-percat-role-list]");
        if (!roleIds.length) {
          el.innerHTML = '<p class="form-hint">None — will fall back to global staff if empty.</p>';
          return;
        }
        var rl = roles();
        el.innerHTML = roleIds
          .map(function (id) {
            var r = rl.find(function (x) {
              return String(x.id) === String(id);
            });
            return (
              '<div class="level-role-row">' +
              (r ? r.name : id) +
              ' <button type="button" data-rm-r="' +
              id +
              '">Remove</button></div>'
            );
          })
          .join("");
        el.querySelectorAll("[data-rm-r]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            roleIds = roleIds.filter(function (x) {
              return String(x) !== String(btn.getAttribute("data-rm-r"));
            });
            card.setAttribute("data-esc-roles", roleIds.join(","));
            renderRoles();
          });
        });
        card.setAttribute("data-esc-roles", roleIds.join(","));
      }

      function renderUsers() {
        var el = box.querySelector("[data-percat-user-list]");
        if (!userIds.length) {
          el.innerHTML = '<p class="form-hint">None.</p>';
          return;
        }
        el.innerHTML = userIds
          .map(function (id) {
            return (
              '<div class="level-role-row">' +
              id +
              ' <button type="button" data-rm-u="' +
              id +
              '">Remove</button></div>'
            );
          })
          .join("");
        el.querySelectorAll("[data-rm-u]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            userIds = userIds.filter(function (x) {
              return String(x) !== String(btn.getAttribute("data-rm-u"));
            });
            card.setAttribute("data-esc-users", userIds.join(","));
            renderUsers();
          });
        });
        card.setAttribute("data-esc-users", userIds.join(","));
      }

      box.querySelector("[data-percat-add-role]").addEventListener("click", function () {
        var sel = box.querySelector("[data-percat-role]");
        if (!sel || !sel.value) return;
        if (roleIds.indexOf(sel.value) < 0) roleIds.push(sel.value);
        renderRoles();
      });
      box.querySelector("[data-percat-add-user]").addEventListener("click", function () {
        var inp = box.querySelector("[data-percat-user]");
        var v = inp && inp.value.trim();
        if (!v) return;
        if (userIds.indexOf(v) < 0) userIds.push(v);
        if (inp) inp.value = "";
        renderUsers();
      });

      renderRoles();
      renderUsers();
    });
  }

  function seedFromConfig() {
    var cats = ((window.currentConfig || {}).tickets || {}).categories || [];
    var list = document.getElementById("ticket-cats-list");
    if (!list || !cats.length) return;
    list.querySelectorAll("[data-cat-i]").forEach(function (card, i) {
      var c = cats[i];
      if (!c) return;
      if (Array.isArray(c.escalateRoleIds) && c.escalateRoleIds.length) {
        card.setAttribute("data-esc-roles", c.escalateRoleIds.map(String).join(","));
      }
      if (Array.isArray(c.escalateUserIds) && c.escalateUserIds.length) {
        card.setAttribute("data-esc-users", c.escalateUserIds.map(String).join(","));
      }
    });
  }

  // Hook save: merge per-cat escalate into draft before saveConfig
  function patchSave() {
    var btn = document.getElementById("save-tickets");
    if (!btn || btn.__percatSave) return;
    btn.__percatSave = true;
    btn.addEventListener(
      "click",
      function () {
        // After features-tickets syncs draftCats, patch escalate fields from DOM
        setTimeout(function () {
          try {
            var list = document.getElementById("ticket-cats-list");
            if (!list) return;
            // Stash on window so next saveConfig body can be fixed via intercept
            window.__ticketPercatEsc = {};
            list.querySelectorAll("[data-cat-i]").forEach(function (card, i) {
              var roles = (card.getAttribute("data-esc-roles") || "").split(",").filter(Boolean);
              var users = (card.getAttribute("data-esc-users") || "").split(",").filter(Boolean);
              window.__ticketPercatEsc[i] = { escalateRoleIds: roles, escalateUserIds: users };
            });
          } catch (_) {}
        }, 0);
      },
      true
    );
  }

  // Intercept saveConfig to inject escalate into categories
  if (window.saveConfig && !window.saveConfig.__percat) {
    var orig = window.saveConfig;
    window.saveConfig = async function (body) {
      try {
        if (body && body.tickets && Array.isArray(body.tickets.categories)) {
          var list = document.getElementById("ticket-cats-list");
          if (list) {
            list.querySelectorAll("[data-cat-i]").forEach(function (card, i) {
              if (!body.tickets.categories[i]) return;
              var roles = (card.getAttribute("data-esc-roles") || "").split(",").filter(Boolean);
              var users = (card.getAttribute("data-esc-users") || "").split(",").filter(Boolean);
              body.tickets.categories[i].escalateRoleIds = roles;
              body.tickets.categories[i].escalateUserIds = users;
            });
          }
        }
      } catch (_) {}
      return orig.apply(this, arguments);
    };
    window.saveConfig.__percat = true;
  }

  function boot() {
    seedFromConfig();
    enhanceCategoryCards();
    patchSave();
    // re-intercept if saveConfig appeared late
    if (window.saveConfig && !window.saveConfig.__percat) {
      var orig = window.saveConfig;
      window.saveConfig = async function (body) {
        try {
          if (body && body.tickets && Array.isArray(body.tickets.categories)) {
            var list = document.getElementById("ticket-cats-list");
            if (list) {
              list.querySelectorAll("[data-cat-i]").forEach(function (card, i) {
                if (!body.tickets.categories[i]) return;
                body.tickets.categories[i].escalateRoleIds = (card.getAttribute("data-esc-roles") || "")
                  .split(",")
                  .filter(Boolean);
                body.tickets.categories[i].escalateUserIds = (card.getAttribute("data-esc-users") || "")
                  .split(",")
                  .filter(Boolean);
              });
            }
          }
        } catch (_) {}
        return orig.apply(this, arguments);
      };
      window.saveConfig.__percat = true;
    }
  }

  [500, 1200, 2500, 5000].forEach(function (ms) {
    setTimeout(boot, ms);
  });
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-tab="tickets"]');
      if (t) setTimeout(boot, 80);
    },
    true
  );
  document.addEventListener("tickets:upgrade", function () {
    setTimeout(boot, 100);
  });

  console.log("[tickets-percat] per-category escalate UI");
})();
