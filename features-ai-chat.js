/**
 * Public AI Chat settings — how often the bot joins normal chat,
 * always-on-mention / reply, cooldown, limits.
 * Separate from Staff Operator (sudo).
 */
(function () {
  "use strict";
  if (window.__featuresAiChat) return;
  window.__featuresAiChat = true;

  function $(id) {
    return document.getElementById(id);
  }

  function channels() {
    try {
      if (typeof channelsCache !== "undefined" && channelsCache && channelsCache.length)
        return channelsCache;
    } catch (_) {}
    try {
      if (window.syncGlobals) window.syncGlobals();
    } catch (_) {}
    return window.channelsCache || [];
  }

  function textChannels() {
    return channels().filter(function (c) {
      return c && (
        c.type === 0 || c.type === 5 || c.type === 10 || c.type === 11 ||
        c.type === 12 || c.type === 15 || c.type === 16 || c.type == null ||
        ["GUILD_TEXT", "GUILD_NEWS", "GUILD_NEWS_THREAD", "GUILD_PUBLIC_THREAD",
          "GUILD_PRIVATE_THREAD", "GUILD_FORUM", "GUILD_MEDIA"].includes(c.type)
      );
    });
  }

  function roles() {
    try {
      if (typeof rolesCache !== "undefined" && rolesCache && rolesCache.length) return rolesCache;
    } catch (_) {}
    return window.rolesCache || [];
  }

  function fillRolePick() {
    var sel = $("aichat-highstaff-role");
    if (!sel) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">Select a role…</option>';
    roles().forEach(function (r) {
      if (!r || r.name === "@everyone") return;
      var o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.name || r.id;
      sel.appendChild(o);
    });
    if (cur) sel.value = cur;
  }

  function ensureNav() {
    var nav = document.querySelector(".navigation");
    if (!nav) return false;
    if (nav.querySelector('[data-tab="aichat"]')) return true;
    var settingsBtn = nav.querySelector('[data-tab="settings"]');
    var btn = document.createElement("button");
    btn.className = "nav-item";
    btn.type = "button";
    btn.setAttribute("data-tab", "aichat");
    btn.title = "Public AI chat";
    btn.innerHTML = "<span>☕</span><em>AI Chat</em>";
    btn.addEventListener("click", function () {
      if (typeof window.showSection === "function") window.showSection("aichat");
      else {
        document.querySelectorAll(".page-section").forEach(function (el) {
          el.classList.remove("active");
        });
        var sec = $("aichat");
        if (sec) sec.classList.add("active");
        document.querySelectorAll(".nav-item").forEach(function (b) {
          b.classList.toggle("active", b.getAttribute("data-tab") === "aichat");
        });
      }
      try {
        applyFromConfig();
      } catch (_) {}
    });
    if (settingsBtn) nav.insertBefore(btn, settingsBtn);
    else nav.appendChild(btn);
    return true;
  }

  function ensureSection() {
    var content = document.querySelector(".content");
    if (!content) return false;
    if ($("aichat")) return true;

    var html =
      '<section id="aichat" class="page-section"><div class="card form-card wide">' +
      '<span class="eyebrow">AI CHAT</span>' +
      "<h2>Public AI (laid-back)</h2>" +
      '<p class="form-hint">This is the friendly chat AI — not the Staff Operator. Anyone can @mention for help. Optionally the bot also joins normal chat at random based on reply chance.</p>' +
      '<label class="toggle"><input type="checkbox" id="aichat-enabled" checked> <span>Public AI enabled</span></label>' +
      "<h3 class=\"subhead\">How often it replies</h3>" +
      '<div class="config-grid">' +
      '<div class="input-group" style="grid-column:1/-1">' +
      '<label>Reply chance in normal chat <span id="aichat-chance-label">8%</span></label>' +
      '<input id="aichat-reply-chance" type="range" min="0" max="100" step="1" value="8" style="width:100%">' +
      '<p class="form-hint">0% = only when @mentioned or replied to. 100% = tries to join almost every message (still respects cooldown & limits).</p>' +
      "</div></div>" +
      '<label class="toggle"><input type="checkbox" id="aichat-mention-always" checked> <span>Always reply when @mentioned</span></label>' +
      '<label class="toggle"><input type="checkbox" id="aichat-reply-always" checked> <span>Always reply when someone replies to the bot</span></label>' +
      "<h3 class=\"subhead\">Limits</h3>" +
      '<div class="config-grid">' +
      '<div class="input-group"><label>Cooldown (seconds)</label><input id="aichat-cooldown" type="number" min="0" max="3600" value="12"></div>' +
      '<div class="input-group"><label>Max replies / hour</label><input id="aichat-max-hour" type="number" min="0" max="500" value="40"></div>' +
      '<div class="input-group"><label>Max replies / day</label><input id="aichat-max-day" type="number" min="0" max="5000" value="400"></div>' +
      '<div class="input-group"><label>Context messages</label><input id="aichat-context" type="number" min="0" max="25" value="12"></div>' +
      "</div>" +
      "<h3 class=\"subhead\">Channels (optional)</h3>" +
      '<p class="form-hint">Leave empty = all text channels. Add channel IDs to restrict where public AI can talk.</p>' +
      '<div class="input-group"><label>Restrict to channels</label>' +
      '<select id="aichat-channel-pick"><option value="">Select a channel…</option></select></div>' +
      '<button class="button" id="aichat-add-channel" type="button">Add channel</button>' +
      '<div id="aichat-channels-list" class="level-roles-list" style="margin-top:0.75rem"></div>' +
      "<h3 class=\"subhead\">Staff AI mode</h3>" +
      '<p class="form-hint">Member mode keeps the existing friendly chat behavior. Staff mode monitors eligible messages independently of whether CoffeeBot replies.</p>' +
      '<div class="input-group"><label>AI personality</label><select id="aichat-mode"><option value="member">Member — friendly community member</option><option value="staff">Staff — relaxed, approachable staff</option></select></div>' +
      '<label class="toggle"><input type="checkbox" id="aichat-monitoring" checked> <span>Enable background message monitoring in Staff mode</span></label>' +
      '<label class="toggle"><input type="checkbox" id="aichat-exempt-staff" checked> <span>Exempt staff from automatic moderation</span></label>' +
      '<h3 class="subhead">Monitoring exclusions</h3>' +
      '<p class="form-hint">These channels are ignored by Staff AI monitoring and Staff AI conversation. Empty = all accessible text channels, threads, and forum posts.</p>' +
      '<div class="config-grid"><div class="input-group"><label>Exclude channel</label><select id="aichat-excluded-channel-pick"><option value="">Select a channel…</option></select></div><div class="input-group"><label>&nbsp;</label><button class="button secondary" type="button" id="aichat-excluded-channel-add">Add exclusion</button></div></div>' +
      '<div id="aichat-excluded-channels-list" class="level-roles-list" style="margin-top:0.75rem"></div>' +
      '<h3 class="subhead">Automatic moderation</h3>' +
      '<label class="toggle"><input type="checkbox" id="aichat-auto-warn" checked> <span>Allow automatic warnings</span></label>' +
      '<label class="toggle"><input type="checkbox" id="aichat-auto-delete" checked> <span>Allow automatic message deletion</span></label>' +
      '<label class="toggle"><input type="checkbox" id="aichat-auto-timeout" checked> <span>Allow automatic timeouts</span></label>' +
      '<div class="input-group"><label>Default timeout duration</label><input id="aichat-timeout-duration" type="text" value="10m" placeholder="10m"></div>' +
      '<h3 class="subhead">Kick / ban approval</h3>' +
      '<p class="form-hint">Kicks and bans always require human approval. This safeguard cannot be disabled.</p>' +
      '<div class="config-grid"><div class="input-group"><label>Staff review channel</label><select id="aichat-review-channel"><option value="">Select a channel…</option></select></div>' +
      '<div class="input-group"><label>High-staff approval role</label><select id="aichat-highstaff-role"><option value="">Select a role…</option></select></div>' +
      '<div class="input-group"><label>Approval expires after (hours)</label><input id="aichat-approval-expiry" type="number" min="1" max="168" value="24"></div></div>' +
      '<button class="button" id="save-aichat" type="button" style="margin-top:1.25rem">Save AI Chat Settings</button>' +
      '<p class="form-hint" id="aichat-status"></p>' +
      "</div></section>";

    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    while (wrap.firstChild) content.appendChild(wrap.firstChild);
    return true;
  }

  var enabledChannels = [];
  var excludedChannels = [];

  function chName(id) {
    var c = channels().find(function (x) {
      return String(x.id) === String(id);
    });
    return c ? "#" + c.name : id;
  }

  function renderExcludedChannels() {
    var el = $("aichat-excluded-channels-list");
    if (!el) return;
    if (!excludedChannels.length) {
      el.innerHTML = '<p class="form-hint">No monitoring exclusions. Staff AI can monitor all accessible text channels.</p>';
      return;
    }
    el.innerHTML = excludedChannels.map(function (id) {
      return '<div class="level-role-row">' + chName(id) +
        ' <button type="button" data-excluded-rm="' + id + '">Remove</button></div>';
    }).join("");
    el.querySelectorAll("[data-excluded-rm]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-excluded-rm");
        excludedChannels = excludedChannels.filter(function (x) { return String(x) !== String(id); });
        renderExcludedChannels();
      });
    });
  }

  function renderChannels() {
    var el = $("aichat-channels-list");
    if (!el) return;
    if (!enabledChannels.length) {
      el.innerHTML = '<p class="form-hint">All channels allowed.</p>';
      return;
    }
    el.innerHTML = enabledChannels
      .map(function (id) {
        return (
          '<div class="level-role-row">' +
          chName(id) +
          ' <button type="button" data-rm="' +
          id +
          '">Remove</button></div>'
        );
      })
      .join("");
    el.querySelectorAll("[data-rm]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-rm");
        enabledChannels = enabledChannels.filter(function (x) {
          return String(x) !== String(id);
        });
        renderChannels();
      });
    });
  }

  function fillChannelPick() {
    ["aichat-channel-pick", "aichat-excluded-channel-pick", "aichat-review-channel"].forEach(function (id) {
      var sel = $(id);
      if (!sel) return;
      var cur = sel.value;
      sel.innerHTML = '<option value="">Select a channel…</option>';
      textChannels().forEach(function (c) {
        var o = document.createElement("option");
        o.value = c.id;
        o.textContent = "#" + (c.name || c.id);
        sel.appendChild(o);
      });
      if (cur) sel.value = cur;
    });
    fillRolePick();
  }

  function readAiSettings(c) {
    var ai = (c && c.ai) || {};
    // Support both flat (website) and nested settings (bot dataStore)
    var s = ai.settings && typeof ai.settings === "object" ? { ...ai, ...ai.settings } : ai;
    return s;
  }

  function applyFromConfig() {
    ensureSection();
    fillChannelPick();
    var s = readAiSettings(window.currentConfig || {});
    if ($("aichat-enabled")) $("aichat-enabled").checked = s.enabled !== false;

    var chance = Number(s.replyChance);
    if (Number.isNaN(chance)) chance = 0.08;
    if (chance > 1) chance = chance / 100;
    chance = Math.min(1, Math.max(0, chance));
    var pct = Math.round(chance * 100);
    if ($("aichat-reply-chance")) $("aichat-reply-chance").value = String(pct);
    if ($("aichat-chance-label")) $("aichat-chance-label").textContent = pct + "%";

    if ($("aichat-mention-always"))
      $("aichat-mention-always").checked = s.mentionAlwaysRespond !== false;
    if ($("aichat-reply-always"))
      $("aichat-reply-always").checked = s.replyAlwaysRespond !== false;
    if ($("aichat-cooldown"))
      $("aichat-cooldown").value = s.cooldownSeconds != null ? s.cooldownSeconds : 12;
    if ($("aichat-max-hour"))
      $("aichat-max-hour").value = s.maxResponsesPerHour != null ? s.maxResponsesPerHour : 40;
    if ($("aichat-max-day"))
      $("aichat-max-day").value = s.maxResponsesPerDay != null ? s.maxResponsesPerDay : 400;
    if ($("aichat-context"))
      $("aichat-context").value = s.contextMessages != null ? s.contextMessages : 12;

    enabledChannels = Array.isArray(s.enabledChannels)
      ? s.enabledChannels.map(String).filter(Boolean)
      : [];
    excludedChannels = Array.isArray(s.excludedChannelIds)
      ? s.excludedChannelIds.map(String).filter(Boolean)
      : [];
    if ($("aichat-mode")) $("aichat-mode").value = s.mode === "staff" ? "staff" : "member";
    if ($("aichat-monitoring")) $("aichat-monitoring").checked = s.monitoringEnabled !== false;
    if ($("aichat-exempt-staff")) $("aichat-exempt-staff").checked = s.exemptStaff !== false;
    var actions = s.autonomousActions || {};
    if ($("aichat-auto-warn")) $("aichat-auto-warn").checked = actions.warn !== false;
    if ($("aichat-auto-delete")) $("aichat-auto-delete").checked = actions.delete !== false;
    if ($("aichat-auto-timeout")) $("aichat-auto-timeout").checked = actions.timeout !== false;
    if ($("aichat-timeout-duration")) $("aichat-timeout-duration").value = s.timeoutDuration || "10m";
    if ($("aichat-review-channel")) $("aichat-review-channel").value = s.reviewChannelId || "";
    if ($("aichat-highstaff-role")) $("aichat-highstaff-role").value = s.highStaffRoleId || "";
    if ($("aichat-approval-expiry")) $("aichat-approval-expiry").value = s.approvalExpiryHours || 24;
    renderChannels();
    renderExcludedChannels();
  }

  function setStatus(t, ok) {
    var el = $("aichat-status");
    if (!el) return;
    el.textContent = t || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  async function save() {
    try {
      setStatus("Saving…", true);
      var pct = Number($("aichat-reply-chance") && $("aichat-reply-chance").value) || 0;
      var payload = {
        ai: {
          enabled: $("aichat-enabled") ? $("aichat-enabled").checked : true,
          replyChance: pct, // bot + website normalize 0–100 → 0–1
          mentionAlwaysRespond: $("aichat-mention-always")
            ? $("aichat-mention-always").checked
            : true,
          replyAlwaysRespond: $("aichat-reply-always")
            ? $("aichat-reply-always").checked
            : true,
          cooldownSeconds: Number($("aichat-cooldown") && $("aichat-cooldown").value) || 0,
          maxResponsesPerHour: Number($("aichat-max-hour") && $("aichat-max-hour").value) || 0,
          maxResponsesPerDay: Number($("aichat-max-day") && $("aichat-max-day").value) || 0,
          contextMessages: Number($("aichat-context") && $("aichat-context").value) || 12,
          enabledChannels: enabledChannels.slice(),
          mode: $("aichat-mode") ? $("aichat-mode").value : "member",
          monitoringEnabled: $("aichat-monitoring") ? $("aichat-monitoring").checked : true,
          excludedChannelIds: excludedChannels.slice(),
          exemptStaff: $("aichat-exempt-staff") ? $("aichat-exempt-staff").checked : true,
          autonomousActions: {
            warn: $("aichat-auto-warn") ? $("aichat-auto-warn").checked : true,
            delete: $("aichat-auto-delete") ? $("aichat-auto-delete").checked : true,
            timeout: $("aichat-auto-timeout") ? $("aichat-auto-timeout").checked : true
          },
          timeoutDuration: $("aichat-timeout-duration") ? $("aichat-timeout-duration").value : "10m",
          reviewChannelId: $("aichat-review-channel") && $("aichat-review-channel").value ? $("aichat-review-channel").value : null,
          highStaffRoleId: $("aichat-highstaff-role") && $("aichat-highstaff-role").value ? $("aichat-highstaff-role").value : null,
          approvalExpiryHours: Number($("aichat-approval-expiry") && $("aichat-approval-expiry").value) || 24
        },
      };
      var d = await window.saveConfig(payload);
      setStatus(
        d && d.savedToBot === false
          ? "Saved on website. Bot offline — will sync when online."
          : "✅ AI Chat settings saved.",
        true
      );
      if (window.loadGuildData) await window.loadGuildData();
      else applyFromConfig();
    return true;
    } catch (e) {
      setStatus("❌ " + (e.message || "Failed"), false);
    }
  
      return false;
    }

  window.saveAiChatDraft = save;

  function wire() {
    ensureNav();
    ensureSection();
    fillChannelPick();

    var range = $("aichat-reply-chance");
    if (range && !range.__wired) {
      range.__wired = true;
      range.addEventListener("input", function () {
        if ($("aichat-chance-label"))
          $("aichat-chance-label").textContent = range.value + "%";
      });
    }

    var excludedAddBtn = $("aichat-excluded-channel-add");
    if (excludedAddBtn && !excludedAddBtn.__wired) {
      excludedAddBtn.__wired = true;
      excludedAddBtn.addEventListener("click", function () {
        var sel = $("aichat-excluded-channel-pick");
        var id = sel && sel.value;
        if (!id) return;
        if (excludedChannels.indexOf(String(id)) === -1) excludedChannels.push(String(id));
        renderExcludedChannels();
      });
    }

    var addBtn = $("aichat-add-channel");
    if (addBtn && !addBtn.__wired) {
      addBtn.__wired = true;
      addBtn.addEventListener("click", function () {
        var sel = $("aichat-channel-pick");
        var id = sel && sel.value;
        if (!id) return;
        if (enabledChannels.indexOf(String(id)) === -1) enabledChannels.push(String(id));
        renderChannels();
      });
    }

    var saveBtn = $("save-aichat");
    if (saveBtn && !saveBtn.__wired) {
      saveBtn.__wired = true;
      saveBtn.addEventListener("click", function () {
        save();
      });
    }
  }

  var n = 0;
  function boot() {
    n++;
    wire();
    applyFromConfig();
    if (n < 60) setTimeout(boot, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  var _load = window.loadGuildData;
  if (typeof _load === "function") {
    window.loadGuildData = async function () {
      var r = await _load.apply(this, arguments);
      try {
        applyFromConfig();
      } catch (_) {}
      return r;
    };
  }

  console.log("[features-ai-chat] loaded");
})();
