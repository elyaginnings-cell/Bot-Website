/**
 * features-ui patch — adds Stats tab, analytics section, suggestion ping role.
 * Safe to load after base features-ui or alone.
 */
(function () {
  "use strict";
  if (window.__featuresUIPatchV8) return;
  window.__featuresUIPatchV8 = true;

  function $(id) { return document.getElementById(id); }

  function ensureNav() {
    var nav = document.querySelector(".navigation");
    if (!nav) return false;
    if (nav.querySelector('[data-tab="analytics"]')) return true;
    var settingsBtn = nav.querySelector('[data-tab="settings"]');
    var btn = document.createElement("button");
    btn.className = "nav-item";
    btn.type = "button";
    btn.setAttribute("data-tab", "analytics");
    btn.title = "Server analytics";
    btn.innerHTML = "<span>📊</span><em>Stats</em>";
    btn.addEventListener("click", function () {
      if (typeof window.showSection === "function") window.showSection("analytics");
      else {
        document.querySelectorAll(".page-section").forEach(function (el) { el.classList.remove("active"); });
        var sec = document.getElementById("analytics");
        if (sec) sec.classList.add("active");
        document.querySelectorAll(".nav-item").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-tab") === "analytics");
        });
      }
    });
    if (settingsBtn) nav.insertBefore(btn, settingsBtn);
    else nav.appendChild(btn);
    return true;
  }

  function ensureAnalyticsSection() {
    var content = document.querySelector(".content");
    if (!content || $("analytics")) return !!$("analytics");
    var html =
      '<section id="analytics" class="page-section"><div class="card form-card wide">' +
      '<span class="eyebrow">ANALYTICS</span><h2>Server analytics</h2>' +
      '<p class="form-hint">Track joins, leaves, and message activity.</p>' +
      '<label class="toggle"><input type="checkbox" id="analytics-enabled" checked> <span>Enabled</span></label>' +
      '<div class="input-group"><label>Log channel (optional)</label><select id="analytics-log-channel"><option value="">None</option></select></div>' +
      '<div class="input-group"><label>Track messages</label><label class="toggle"><input type="checkbox" id="analytics-track-messages" checked> <span>Count messages per channel</span></label></div>' +
      '<div class="input-group"><label>Track members</label><label class="toggle"><input type="checkbox" id="analytics-track-members" checked> <span>Joins / leaves</span></label></div>' +
      '<button class="button" id="save-analytics" type="button">Save Analytics Settings</button>' +
      '<p class="form-hint" id="analytics-status"></p>' +
      '<h3 class="subhead" style="margin-top:1.5rem">Live snapshot</h3>' +
      '<div id="analytics-snapshot" class="level-roles-list"><p class="form-hint">Open this tab after loading a server.</p></div>' +
      '<button class="button secondary" id="refresh-analytics" type="button" style="margin-top:0.75rem">Refresh snapshot</button>' +
      '</div></section>';
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    while (wrap.firstChild) content.appendChild(wrap.firstChild);
    return true;
  }

  function ensureSuggestPingRole() {
    var sec = $("suggestions");
    if (!sec) return false;
    if ($("suggest-ping-role")) return true;
    var staff = $("suggest-staff-channel");
    var group = document.createElement("div");
    group.className = "input-group";
    group.innerHTML =
      '<label>Ping role (on new suggestion)</label>' +
      '<select id="suggest-ping-role"><option value="">None</option></select>' +
      '<p class="form-hint">Optional. This role is mentioned when a member submits a suggestion.</p>';
    var saveBtn = $("save-suggestions");
    if (saveBtn && saveBtn.parentNode) {
      saveBtn.parentNode.insertBefore(group, saveBtn);
    } else if (staff && staff.parentNode && staff.parentNode.parentNode) {
      staff.parentNode.parentNode.insertBefore(group, staff.parentNode.nextSibling);
    } else {
      var card = sec.querySelector(".card");
      if (card) card.appendChild(group);
    }
    return true;
  }

  function boot() {
    ensureNav();
    ensureAnalyticsSection();
    ensureSuggestPingRole();
  }

  var n = 0;
  function tryBoot() {
    n++;
    boot();
    if (n < 60) setTimeout(tryBoot, 200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryBoot);
  else tryBoot();
  console.log("[features-ui-patch] v8 analytics + suggest ping role");
})();
