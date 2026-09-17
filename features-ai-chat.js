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
      return c && (c.type === 0 || c.type === 5 || c.type == null || c.type === "GUILD_TEXT");
    });
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
      '<button class="button" id="save-aichat" type="button" style="margin-top:1.25rem">Save AI Chat Settings</button>' +
      '<p class="form-hint" id="aichat-status"></p>' +
      "</div></section>";

    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    while (wrap.firstChild) content.appendChild(wrap.firstChild);
    return true;
  }

  var enabledChannels = [];

  function chName(id) {
    var c = channels().find(function (x) {
      return String(x.id) === String(id);
    });
    return c ? "#" + c.name : id;
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
    var sel = $("aichat-channel-pick");
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
    renderChannels();
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
    } catch (e) {
      setStatus("❌ " + (e.message || "Failed"), false);
    }
  }

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
