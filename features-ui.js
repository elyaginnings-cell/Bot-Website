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
      { tab: "qotd", icon: "❓", label: "QOTD", title: "QOTD" },
      { tab: "selfroles", icon: "🎭", label: "Roles", title: "Self Roles" },
      { tab: "ai", icon: "☕", label: "AI", title: "CoffeeBot AI chat" },
      { tab: "automod", icon: "🛡️", label: "Automod", title: "AI Automod" },
      { tab: "aistaff", icon: "🤖", label: "Staff", title: "AI Staff actions" }
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
        // Refill selects when opening these tabs (channels may load late)
        try {
          if (typeof window.fillAutomodStaffSelects === "function") window.fillAutomodStaffSelects();
        } catch (_) {}
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
        '<p class="form-hint">Staff use <code>/qotd <question></code>.</p>' +
        '<label class="toggle"><input type="checkbox" id="qotd-enabled" checked> <span>Enabled</span></label>' +
        '<div class="input-group"><label>QOTD channel</label><select id="qotd-channel"><option value="">Select a channel...</option></select></div>' +
        '<div class="input-group"><label>Manager role</label><select id="qotd-manager-role"><option value="">None</option></select></div>' +
        '<button class="button" id="save-qotd" type="button">Save QOTD Settings</button>' +
        '<p class="form-hint" id="qotd-status"></p></div></section>' +

        '<section id="selfroles" class="page-section"><div class="card form-card wide">' +
        '<span class="eyebrow">SELF ROLES</span><h2>Nested role picker</h2>' +
        '<p class="form-hint">Posts <strong>one button</strong> in Discord. Members click it → private menu of categories → sub-categories → roles. Only they see the menus.</p>' +
        '<label class="toggle"><input type="checkbox" id="sr-enabled" checked> <span>Enabled</span></label>' +
        '<div class="input-group"><label>Panel channel</label><select id="sr-channel"><option value="">Select a channel...</option></select></div>' +
        '<div class="input-group"><label>Button label</label><input id="sr-btn-label" type="text" placeholder="Choose your roles" maxlength="80"></div>' +
        '<div class="input-group"><label>Embed title</label><input id="sr-embed-title" type="text" placeholder="Self Roles" maxlength="256"></div>' +
        '<div class="input-group" style="grid-column:1/-1"><label>Embed description</label><textarea id="sr-embed-desc" rows="2" placeholder="Click the button below to pick your roles…" maxlength="2000"></textarea></div>' +
        '<h3 class="subhead">1 · Top category</h3><div class="config-grid">' +
        '<div class="input-group"><label>Emoji</label><input id="sr-cat-emoji" type="text" placeholder="🎮" maxlength="32"></div>' +
        '<div class="input-group"><label>Name</label><input id="sr-cat-name" type="text" placeholder="e.g. Interests" maxlength="100"></div>' +
        '<div class="input-group" style="grid-column:1/-1"><label>Description</label><input id="sr-cat-desc" type="text" placeholder="Shown under the category option" maxlength="500"></div>' +
        '</div>' +
        '<button class="button" id="sr-add-cat" type="button">Add top category</button>' +
        '<h3 class="subhead">2 · Sub-category (under a top category)</h3><div class="config-grid">' +
        '<div class="input-group"><label>Top category</label><select id="sr-parent-cat"><option value="">Select…</option></select></div>' +
        '<div class="input-group"><label>Emoji</label><input id="sr-sub-emoji" type="text" placeholder="🔔" maxlength="32"></div>' +
        '<div class="input-group"><label>Name</label><input id="sr-sub-name" type="text" placeholder="e.g. Notifications" maxlength="100"></div>' +
        '<div class="input-group"><label>Mode</label><select id="sr-sub-mode"><option value="multi">Multi-select</option><option value="single">Single-select</option></select></div>' +
        '<div class="input-group" style="grid-column:1/-1"><label>Description</label><input id="sr-sub-desc" type="text" placeholder="Optional" maxlength="500"></div>' +
        '</div>' +
        '<button class="button" id="sr-add-sub" type="button">Add sub-category</button>' +
        '<h3 class="subhead">3 · Role (under a sub-category)</h3><div class="level-role-form">' +
        '<div class="input-group"><label>Sub-category</label><select id="sr-target-sub"><option value="">Select…</option></select></div>' +
        '<div class="input-group"><label>Role</label><select id="sr-role"><option value="">Select a role...</option></select></div>' +
        '<div class="input-group"><label>Label</label><input id="sr-label" type="text" placeholder="e.g. Announcements" maxlength="100"></div>' +
        '<div class="input-group"><label>Emoji</label><input id="sr-emoji" type="text" placeholder="📢" maxlength="32"></div>' +
        '<div class="input-group" style="grid-column:1/-1"><label>Option description</label><input id="sr-role-desc" type="text" placeholder="Shown under the option" maxlength="100"></div>' +
        '<button class="button" id="sr-add-role" type="button">Add role</button></div>' +
        '<div id="sr-categories" class="level-roles-list" style="margin-top:1.25rem"></div>' +
        '<button class="button" id="save-selfroles" type="button" style="margin-top:1rem">Save Self Roles</button>' +
        '<p class="form-hint" id="sr-status"></p></div></section>';

      var wrap = document.createElement("div");
      wrap.innerHTML = html;
      while (wrap.firstChild) content.appendChild(wrap.firstChild);
    }

    // AI panel (can inject even if other sections already exist)
    if (!$("ai")) {
      var ai = document.createElement("section");
      ai.id = "ai";
      ai.className = "page-section";
      ai.innerHTML =
        '<div class="card form-card wide">' +
        '<span class="eyebrow">AI CHAT</span><h2>☕ CoffeeBot AI</h2>' +
        '<p class="form-hint">Controls when CoffeeBot joins chat. API key stays on Railway (AI_API_KEY) — not stored here.</p>' +
        '<label class="toggle"><input type="checkbox" id="ai-enabled"> <span>AI chat enabled</span></label>' +
        '<div class="config-grid">' +
        '<div class="input-group"><label>Reply chance (%)</label><input id="ai-chance" type="number" min="0" max="100" step="0.1" value="3"></div>' +
        '<div class="input-group"><label>Cooldown (seconds)</label><input id="ai-cooldown" type="number" min="0" max="3600" value="45"></div>' +
        '<div class="input-group"><label>Max replies / hour</label><input id="ai-max-hour" type="number" min="0" max="500" value="20"></div>' +
        '<div class="input-group"><label>Max replies / day</label><input id="ai-max-day" type="number" min="0" max="5000" value="200"></div>' +
        '<div class="input-group"><label>Context messages</label><input id="ai-context" type="number" min="0" max="25" value="10"></div>' +
        '</div>' +
        '<label class="toggle"><input type="checkbox" id="ai-mentions" checked> <span>Always reply to @mentions</span></label>' +
        '<label class="toggle"><input type="checkbox" id="ai-replies" checked> <span>Always reply when someone replies to CoffeeBot</span></label>' +
        '<div class="input-group" style="margin-top:0.75rem">' +
        '<label>Allowed channels (optional)</label>' +
        '<input id="ai-channels" type="text" placeholder="Leave empty = all channels. Or comma-separated channel IDs">' +
        '<p class="form-hint">Example: 123456789,987654321 — empty means every text channel.</p>' +
        '</div>' +
        '<button class="button" id="save-ai" type="button">Save AI Settings</button>' +
        '<p class="form-hint" id="ai-status"></p>' +
        '<p class="form-hint">Also available in Discord: <code>/ai status</code>, <code>/ai enable</code>, <code>/ai test</code>.</p>' +
        '</div>';
      content.appendChild(ai);
    }

    window.__featuresUIInjected = true;
    console.log("[features-ui] injected (incl. automod + aistaff nav)");
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
