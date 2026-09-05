/** Settings: tab title + bot status + invite */
(function () {
  function ensureSettingsForm() {
    var section = document.getElementById("settings");
    if (!section) return;
    if (document.getElementById("save-branding")) return;
    section.innerHTML =
      '<div class="card form-card wide">' +
      '<span class="eyebrow">SETTINGS</span>' +
      '<h2>Browser tab title</h2>' +
      '<p class="form-hint">This only changes the name in the browser tab. Your dashboard stays Coffee Shop / your bot.</p>' +
      '<div class="input-group"><label for="site-name">Tab title</label>' +
      '<input id="site-name" type="text" maxlength="120" placeholder="Amazon.com. Spend Less. Smile More."></div>' +
      '<button class="button" id="save-branding" type="button">Save tab title</button> ' +
      '<button class="button secondary" id="reset-branding" type="button">Reset default</button>' +
      '<p class="form-hint" id="branding-status"></p>' +
      '</div>' +

      '<div class="card form-card wide" style="margin-top:16px">' +
      '<span class="eyebrow">BOT PRESENCE</span>' +
      '<h2>Bot status</h2>' +
      '<p class="form-hint">Change what Discord shows under the bot name (Online / Idle / DND / Invisible + activity text).</p>' +
      '<div class="config-grid">' +
      '<div class="input-group"><label for="bot-status">Status</label>' +
      '<select id="bot-status">' +
      '<option value="online">Online</option>' +
      '<option value="idle">Idle</option>' +
      '<option value="dnd">Do Not Disturb</option>' +
      '<option value="invisible">Invisible</option>' +
      '</select></div>' +
      '<div class="input-group"><label for="bot-activity-type">Activity type</label>' +
      '<select id="bot-activity-type">' +
      '<option value="0">Playing</option>' +
      '<option value="2">Listening</option>' +
      '<option value="3">Watching</option>' +
      '<option value="5">Competing</option>' +
      '<option value="4">Custom</option>' +
      '</select></div>' +
      '</div>' +
      '<div class="input-group"><label for="bot-activity-name">Activity text</label>' +
      '<input id="bot-activity-name" type="text" maxlength="128" placeholder="e.g. Coffee Shop"></div>' +
      '<button class="button" id="save-bot-status" type="button">Save bot status</button>' +
      '<p class="form-hint" id="bot-status-msg"></p>' +
      '</div>' +

      '<div class="card form-card wide" style="margin-top:16px">' +
      '<span class="eyebrow">INVITE</span>' +
      '<h2>Invite bot to a server</h2>' +
      '<p class="form-hint">Open Discord\'s invite page to add the bot to any server you manage.</p>' +
      '<div class="input-group"><label for="invite-perms">Permission preset</label>' +
      '<select id="invite-perms">' +
      '<option value="8">Administrator (full)</option>' +
      '<option value="268823622">Recommended (mod + messages + roles)</option>' +
      '<option value="0">No extra permissions</option>' +
      '</select></div>' +
      '<div class="input-group"><label for="invite-url">Invite link</label>' +
      '<input id="invite-url" type="text" readonly placeholder="Loading…"></div>' +
      '<button class="button" id="open-invite" type="button">Open invite</button> ' +
      '<button class="button secondary" id="copy-invite" type="button">Copy link</button>' +
      '<p class="form-hint" id="invite-status"></p>' +
      '</div>' +

      '<div class="card form-card wide" style="margin-top:16px">' +
      '<h3 class="subhead">Layout</h3>' +
      '<p class="form-hint">Use the View selector in the header for Auto / Desktop / Mobile.</p>' +
      '</div>';
  }
  function boot() {
    ensureSettingsForm();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-tab="settings"]');
    if (t) setTimeout(ensureSettingsForm, 0);
  });
})();
