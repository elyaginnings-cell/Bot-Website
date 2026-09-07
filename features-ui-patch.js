/**
 * features-ui-patch v9 — Stats tab, analytics section, suggest ping, tickets category select
 */
(function () {
  "use strict";
  if (window.__featuresUIPatchV9) return;
  window.__featuresUIPatchV9 = true;

  function $(id) { return document.getElementById(id); }

  function ensureNav() {
    var nav = document.querySelector(".navigation");
    if (!nav) return false;
    if (!nav.querySelector('[data-tab="analytics"]')) {
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
    }
    if (!nav.querySelector('[data-tab="tickets"]')) {
      var after = nav.querySelector('[data-tab="suggestions"]') || nav.querySelector('[data-tab="analytics"]');
      var tbtn = document.createElement("button");
      tbtn.className = "nav-item";
      tbtn.type = "button";
      tbtn.setAttribute("data-tab", "tickets");
      tbtn.title = "Tickets";
      tbtn.innerHTML = "<span>🎫</span><em>Tickets</em>";
      tbtn.addEventListener("click", function () {
        if (typeof window.showSection === "function") window.showSection("tickets");
        else {
          document.querySelectorAll(".page-section").forEach(function (el) { el.classList.remove("active"); });
          var sec = document.getElementById("tickets");
          if (sec) sec.classList.add("active");
          document.querySelectorAll(".nav-item").forEach(function (b) {
            b.classList.toggle("active", b.getAttribute("data-tab") === "tickets");
          });
        }
      });
      if (after && after.nextSibling) nav.insertBefore(tbtn, after.nextSibling);
      else nav.appendChild(tbtn);
    }
    return true;
  }

  function ensureAnalyticsSection() {
    var content = document.querySelector(".content");
    if (!content) return false;
    if ($("analytics")) return true;
    var html =
      '<section id="analytics" class="page-section"><div class="card form-card wide">' +
      '<span class="eyebrow">ANALYTICS</span><h2>Server analytics</h2>' +
      '<p class="form-hint">Track joins, leaves, and message activity. Use <code>/analytics</code> in Discord for live reports.</p>' +
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

  function ensureTicketsSection() {
    var content = document.querySelector(".content");
    if (!content) return false;
    if ($("tickets") && $("ticket-category-id") && $("ticket-category-id").tagName === "SELECT") return true;
    if ($("tickets")) {
      var old = $("ticket-category-id");
      if (old && old.tagName === "INPUT") {
        var sel = document.createElement("select");
        sel.id = "ticket-category-id";
        sel.innerHTML = '<option value="">Select a category…</option>';
        old.parentNode.replaceChild(sel, old);
        var lab = sel.parentNode.querySelector("label");
        if (lab) lab.textContent = "Ticket category (parent)";
      }
      return true;
    }
    var html =
      '<section id="tickets" class="page-section"><div class="card form-card wide">' +
      '<span class="eyebrow">TICKETS</span><h2>Support tickets</h2>' +
      '<p class="form-hint">After saving, run <code>/ticket-panel</code> in Discord to post the panel.</p>' +
      '<label class="toggle"><input type="checkbox" id="ticket-enabled" checked> <span>Enabled</span></label>' +
      '<div class="input-group"><label>Ticket category (parent)</label><select id="ticket-category-id"><option value="">Select a category…</option></select></div>' +
      '<p class="form-hint">New tickets are created under this Discord category.</p>' +
      '<div class="input-group"><label>Transcript channel</label><select id="ticket-transcript-channel"><option value="">Select a channel...</option></select></div>' +
      '<div class="input-group"><label>Welcome message</label><input id="ticket-welcome" type="text" value="Staff will be with you shortly. Please describe your issue."></div>' +
      '<h3 class="subhead">Staff roles</h3><div class="level-role-form">' +
      '<div class="input-group"><label>Role</label><select id="ticket-staff-role"><option value="">Select a role...</option></select></div>' +
      '<button class="button" id="add-ticket-staff" type="button">Add staff role</button></div>' +
      '<div id="ticket-staff-list" class="level-roles-list"></div>' +
      '<button class="button" id="save-tickets" type="button">Save Ticket Settings</button>' +
      '<p class="form-hint" id="ticket-status"></p></div></section>';
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    while (wrap.firstChild) content.appendChild(wrap.firstChild);
    return true;
  }

  function ensureSuggestPingRole() {
    var sec = $("suggestions");
    if (!sec) return false;
    if ($("suggest-ping-role")) return true;
    var group = document.createElement("div");
    group.className = "input-group";
    group.innerHTML =
      '<label>Ping role (on new suggestion)</label>' +
      '<select id="suggest-ping-role"><option value="">None</option></select>' +
      '<p class="form-hint">Optional. This role is mentioned when a member submits a suggestion.</p>';
    var saveBtn = $("save-suggestions");
    if (saveBtn && saveBtn.parentNode) saveBtn.parentNode.insertBefore(group, saveBtn);
    else {
      var card = sec.querySelector(".card");
      if (card) card.appendChild(group);
    }
    return true;
  }

  function boot() {
    ensureNav();
    ensureAnalyticsSection();
    ensureTicketsSection();
    ensureSuggestPingRole();
  }

  var n = 0;
  function tryBoot() {
    n++;
    boot();
    if (n < 80) setTimeout(tryBoot, 200);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tryBoot);
  else tryBoot();
  console.log("[features-ui-patch] v9 tickets category select + analytics");
})();
