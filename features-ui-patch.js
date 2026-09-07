/**
 * features-ui-patch v11 — applications tab + analytics
 */
(function () {
  "use strict";
  if (window.__featuresUIPatchV11) return;
  window.__featuresUIPatchV11 = true;

  function $(id) { return document.getElementById(id); }

  function ensureNavItem(tab, icon, label, title) {
    var nav = document.querySelector(".navigation");
    if (!nav) return false;
    if (nav.querySelector('[data-tab="' + tab + '"]')) return true;
    var settingsBtn = nav.querySelector('[data-tab="settings"]');
    var btn = document.createElement("button");
    btn.className = "nav-item";
    btn.type = "button";
    btn.setAttribute("data-tab", tab);
    btn.title = title || label;
    btn.innerHTML = "<span>" + icon + "</span><em>" + label + "</em>";
    btn.addEventListener("click", function () {
      if (typeof window.showSection === "function") window.showSection(tab);
      else {
        document.querySelectorAll(".page-section").forEach(function (el) { el.classList.remove("active"); });
        var sec = document.getElementById(tab);
        if (sec) sec.classList.add("active");
        document.querySelectorAll(".nav-item").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-tab") === tab);
        });
      }
    });
    if (settingsBtn) nav.insertBefore(btn, settingsBtn);
    else nav.appendChild(btn);
    return true;
  }

  function ensureSection(id, html) {
    var content = document.querySelector(".content");
    if (!content || $(id)) return !!$(id);
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    while (wrap.firstChild) content.appendChild(wrap.firstChild);
    return true;
  }

  function ensureApps() {
    ensureNavItem("applications", "📋", "Apply", "Staff applications");
    ensureSection(
      "applications",
      '<section id="applications" class="page-section"><div class="card form-card wide">' +
        '<span class="eyebrow">APPLICATIONS</span><h2>Staff applications</h2>' +
        '<p class="form-hint">Members click Apply → pick a position → answer questions. Staff Accept/Deny in the review channel. On accept: roles are granted and a welcome is posted.</p>' +
        '<label class="toggle"><input type="checkbox" id="app-enabled" checked> <span>Enabled</span></label>' +
        '<div class="input-group"><label>Review channel (staff sees applications)</label><select id="app-review-channel"><option value="">Select…</option></select></div>' +
        '<div class="input-group"><label>Announcements channel (welcome on accept)</label><select id="app-announce-channel"><option value="">Select…</option></select></div>' +
        '<div class="input-group"><label>Button label</label><input id="app-btn-label" type="text" value="Apply for Staff" maxlength="80"></div>' +
        '<div class="input-group"><label>Panel title</label><input id="app-embed-title" type="text" value="Staff Applications" maxlength="256"></div>' +
        '<div class="input-group"><label>Panel description</label><textarea id="app-embed-desc" rows="2">Interested in joining the team? Click Apply, pick a position, and answer the questions.</textarea></div>' +
        '<div class="input-group"><label>Welcome message (on accept)</label><textarea id="app-accept-msg" rows="3">Welcome to the team, {user}! You are now **{position}**.\n\nPlease:\n• Read staff guidelines\n• Check your new roles\n• Ask leads if you have questions</textarea>' +
        '<p class="form-hint">Use {user} and {position} placeholders.</p></div>' +
        '<h3 class="subhead">Positions</h3>' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Name</label><input id="app-pos-name" type="text" placeholder="e.g. Moderator" maxlength="100"></div>' +
        '<div class="input-group"><label>Role granted</label><select id="app-pos-role"><option value="">Select role…</option></select></div>' +
        '<div class="input-group"><label>Extra linked roles (comma IDs, optional)</label><input id="app-pos-linked" type="text" placeholder="roleId, roleId"></div>' +
        '<div class="input-group"><label>Short description</label><input id="app-pos-desc" type="text" placeholder="Shown in the dropdown" maxlength="100"></div>' +
        '</div>' +
        '<button class="button" id="app-add-pos" type="button">Add position</button>' +
        '<div id="app-pos-list" class="level-roles-list"></div>' +
        '<h3 class="subhead">Questions (max 5)</h3>' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Question label</label><input id="app-q-label" type="text" placeholder="Why do you want this role?" maxlength="45"></div>' +
        '<div class="input-group"><label>Placeholder</label><input id="app-q-placeholder" type="text" placeholder="Your answer…" maxlength="100"></div>' +
        '<div class="input-group"><label>Required</label><label class="toggle"><input type="checkbox" id="app-q-required" checked> <span>Required</span></label></div>' +
        '</div>' +
        '<button class="button" id="app-add-q" type="button">Add question</button>' +
        '<div id="app-q-list" class="level-roles-list"></div>' +
        '<button class="button" id="save-applications" type="button" style="margin-top:1rem">Save Application Settings</button>' +
        '<p class="form-hint" id="app-status"></p>' +
        '<p class="form-hint">After saving, run <code>/application-panel</code> in Discord to post the button.</p>' +
        '</div></section>'
    );
  }

  var n = 0;
  function boot() {
    n++;
    ensureApps();
    if (n < 60) setTimeout(boot, 200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[features-ui-patch] v11 applications");
})();
