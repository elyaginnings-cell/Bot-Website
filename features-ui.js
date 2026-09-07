/**
 * Injects config panel UI (nav + sections + currency extras).
 * Does not replace features-config.js save/load logic.
 */
(function () {
  "use strict";
  if (window.__featuresUIInjected) return;

  function $(id) { return document.getElementById(id); }

  function inject() {
    var nav = document.querySelector(".navigation");
    var content = document.querySelector(".content");
    if (!nav || !content) return false;

    var settingsBtn = nav.querySelector('[data-tab="settings"]');
    var serverBtn = document.getElementById("nav-server-view");
    var insertBefore = settingsBtn || serverBtn;

    var tabs = [
      { tab: "bump", icon: "📢", label: "Bump", title: "Bump rewards" },
      { tab: "verification", icon: "✅", label: "Verify", title: "Verification" },
      { tab: "suggestions", icon: "💡", label: "Ideas", title: "Suggestions" },
      { tab: "tickets", icon: "🎫", label: "Tickets", title: "Tickets" },
      { tab: "qotd", icon: "❓", label: "QOTD", title: "QOTD" }
    ];

    tabs.forEach(function (t) {
      if (nav.querySelector('[data-tab="' + t.tab + '"]')) return;
      var btn = document.createElement("button");
      btn.className = "nav-item";
      btn.type = "button";
      btn.setAttribute("data-tab", t.tab);
      btn.title = t.title;
      btn.innerHTML = "<span>" + t.icon + "</span><em>" + t.label + "</em>";
      btn.addEventListener("click", function () {
        if (typeof window.showSection === "function") window.showSection(t.tab);
        else {
          document.querySelectorAll(".page-section").forEach(function (el) { el.classList.remove("active"); });
          var sec = document.getElementById(t.tab);
          if (sec) sec.classList.add("active");
          document.querySelectorAll(".nav-item").forEach(function (b) {
            b.classList.toggle("active", b.getAttribute("data-tab") === t.tab);
          });
        }
      });
      if (insertBefore) nav.insertBefore(btn, insertBefore);
      else nav.appendChild(btn);
    });

    var currencySection = document.getElementById("currency");
    if (currencySection && !$("cur-weekly-min")) {
      var saveBtn = currencySection.querySelector("#save-currency");
      var extras = document.createElement("div");
      extras.id = "currency-extras";
      extras.innerHTML =
        '<h3 class="subhead">Weekly</h3><div class="config-grid">' +
        '<div class="input-group"><label>Min</label><input id="cur-weekly-min" type="number" value="800"></div>' +
        '<div class="input-group"><label>Max</label><input id="cur-weekly-max" type="number" value="1500"></div></div>' +
        '<h3 class="subhead">Beg</h3><div class="config-grid">' +
        '<div class="input-group"><label>Min</label><input id="cur-beg-min" type="number" value="5"></div>' +
        '<div class="input-group"><label>Max</label><input id="cur-beg-max" type="number" value="40"></div>' +
        '<div class="input-group"><label>CD (min)</label><input id="cur-beg-cd" type="number" value="15"></div>' +
        '<div class="input-group"><label>Fail %</label><input id="cur-beg-fail" type="number" value="35"></div></div>' +
        '<label class="toggle"><input type="checkbox" id="cur-bank-enabled" checked> <span>Bank enabled (deposit / withdraw)</span></label>';
      if (saveBtn && saveBtn.parentNode) saveBtn.parentNode.insertBefore(extras, saveBtn);
      else {
        var card = currencySection.querySelector(".card");
        if (card) card.appendChild(extras);
      }
    }

    if (!$("bump")) {
      var html =
        '<section id="bump" class="page-section"><div class="card form-card wide">' +
        '<span class="eyebrow">BUMP</span><h2>Disboard bump rewards</h2>' +
        '<p class="form-hint">Auto-detects successful bumps and awards Beans.</p>' +
        '<label class="toggle"><input type="checkbox" id="bump-enabled" checked> <span>Bump rewards enabled</span></label>' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Reward min</label><input id="bump-reward-min" type="number" min="1" value="50"></div>' +
        '<div class="input-group"><label>Reward max</label><input id="bump-reward-max" type="number" min="1" value="150"></div>' +
        '<div class="input-group"><label>Cooldown (minutes)</label><input id="bump-cooldown" type="number" min="1" value="110"></div></div>' +
        '<button class="button" id="save-bump" type="button">Save Bump Settings</button>' +
        '<p class="form-hint" id="bump-status"></p></div></section>' +

        '<section id="verification" class="page-section"><div class="card form-card wide">' +
        '<span class="eyebrow">VERIFICATION</span><h2>Member verification</h2>' +
        '<p class="form-hint">After saving, run <code>/verification-setup</code> in Discord.</p>' +
        '<label class="toggle"><input type="checkbox" id="verify-enabled" checked> <span>Enabled</span></label>' +
        '<div class="input-group"><label>Verify channel</label><select id="verify-channel"><option value="">Select a channel...</option></select></div>' +
        '<div class="input-group"><label>Verified role</label><select id="verify-role"><option value="">Select a role...</option></select></div>' +
        '<div class="input-group"><label>Log channel</label><select id="verify-log-channel"><option value="">Select a channel...</option></select></div>' +
        '<div class="input-group"><label>Button label</label><input id="verify-btn-label" type="text" value="Verify"></div>' +
        '<div class="input-group"><label>Embed title</label><input id="verify-title" type="text" value="Verification"></div>' +
        '<div class="input-group"><label>Embed description</label><input id="verify-desc" type="text" value="Press the button below to gain access to the server."></div>' +
        '<button class="button" id="save-verification" type="button">Save Verification Settings</button>' +
        '<p class="form-hint" id="verify-status"></p></div></section>' +

        '<section id="suggestions" class="page-section"><div class="card form-card wide">' +
        '<span class="eyebrow">SUGGESTIONS</span><h2>Suggestion board</h2>' +
        '<label class="toggle"><input type="checkbox" id="suggest-enabled" checked> <span>Enabled</span></label>' +
        '<div class="input-group"><label>Suggestions channel</label><select id="suggest-channel"><option value="">Select a channel...</option></select></div>' +
        '<div class="input-group"><label>Staff review channel</label><select id="suggest-staff-channel"><option value="">Select a channel...</option></select></div>' +
        '<button class="button" id="save-suggestions" type="button">Save Suggestions Settings</button>' +
        '<p class="form-hint" id="suggest-status"></p></div></section>' +

        '<section id="tickets" class="page-section"><div class="card form-card wide">' +
        '<span class="eyebrow">TICKETS</span><h2>Support tickets</h2>' +
        '<p class="form-hint">After saving, run <code>/ticket-panel</code> in Discord.</p>' +
        '<label class="toggle"><input type="checkbox" id="ticket-enabled" checked> <span>Enabled</span></label>' +
        '<div class="input-group"><label>Category ID</label><input id="ticket-category-id" type="text" placeholder="Category snowflake ID"></div>' +
        '<div class="input-group"><label>Transcript channel</label><select id="ticket-transcript-channel"><option value="">Select a channel...</option></select></div>' +
        '<div class="input-group"><label>Welcome message</label><input id="ticket-welcome" type="text" value="Staff will be with you shortly. Please describe your issue."></div>' +
        '<h3 class="subhead">Staff roles</h3><div class="level-role-form">' +
        '<div class="input-group"><label>Role</label><select id="ticket-staff-role"><option value="">Select a role...</option></select></div>' +
        '<button class="button" id="add-ticket-staff" type="button">Add staff role</button></div>' +
        '<div id="ticket-staff-list" class="level-roles-list"></div>' +
        '<button class="button" id="save-tickets" type="button">Save Ticket Settings</button>' +
        '<p class="form-hint" id="ticket-status"></p></div></section>' +

        '<section id="qotd" class="page-section"><div class="card form-card wide">' +
        '<span class="eyebrow">QOTD</span><h2>Question of the Day</h2>' +
        '<p class="form-hint">Staff use <code>/qotd &lt;question&gt;</code>.</p>' +
        '<label class="toggle"><input type="checkbox" id="qotd-enabled" checked> <span>Enabled</span></label>' +
        '<div class="input-group"><label>QOTD channel</label><select id="qotd-channel"><option value="">Select a channel...</option></select></div>' +
        '<div class="input-group"><label>Manager role</label><select id="qotd-manager-role"><option value="">None</option></select></div>' +
        '<button class="button" id="save-qotd" type="button">Save QOTD Settings</button>' +
        '<p class="form-hint" id="qotd-status"></p></div></section>';

      var wrap = document.createElement("div");
      wrap.innerHTML = html;
      while (wrap.firstChild) content.appendChild(wrap.firstChild);
    }

    window.__featuresUIInjected = true;
    console.log("[features-ui] injected");
    return true;
  }

  var tries = 0;
  function boot() {
    tries++;
    if (inject()) return;
    if (tries < 40) setTimeout(boot, 150);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
