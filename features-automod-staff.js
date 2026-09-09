/**
 * Injects Automod + AI Staff control panels into the features dashboard.
 * Main dashboard chrome is left alone — only features area is extended.
 */
(function () {
  "use strict";
  if (window.__featuresAutomodStaffV1) return;
  window.__featuresAutomodStaffV1 = true;

  function $(id) {
    return document.getElementById(id);
  }

  function panelHtml() {
    return [
      '<section class="feature-card" id="panel-automod" style="margin-top:1rem">',
      "  <h2>🛡️ Automod</h2>",
      '  <p class="form-hint">Uses the real <code>/warn</code> system (same log embeds & thresholds). Staff with Manage Messages are ignored by default.</p>',
      '  <label class="check-row"><input type="checkbox" id="automod-enabled"> Enable automod</label>',
      '  <label class="check-row"><input type="checkbox" id="automod-ignore-staff" checked> Ignore staff (Manage Messages+)</label>',
      "  <label>Log channel ID</label>",
      '  <input id="automod-log" type="text" placeholder="Channel snowflake for automod logs">',
      "  <label>Ignored role IDs (comma)</label>",
      '  <input id="automod-ignore-roles" type="text" placeholder="roleId, roleId">',
      "  <label>Ignored channel IDs (comma)</label>",
      '  <input id="automod-ignore-channels" type="text" placeholder="channelId, channelId">',
      "  <h3 style=\"margin-top:0.75rem\">Filters</h3>",
      '  <label class="check-row"><input type="checkbox" id="am-invites" checked> Block Discord invites → warn + delete</label>',
      '  <label class="check-row"><input type="checkbox" id="am-mentions" checked> Mass mentions (≥5) → warn + delete</label>',
      '  <label class="check-row"><input type="checkbox" id="am-spam" checked> Spam (5 msgs / 8s) → warn + delete</label>',
      '  <label class="check-row"><input type="checkbox" id="am-links"> Block all links → delete</label>',
      '  <label class="check-row"><input type="checkbox" id="am-caps"> Excess CAPS → delete</label>',
      "  <label>Bad words (comma, optional)</label>",
      '  <input id="am-badwords" type="text" placeholder="word1, word2">',
      '  <button type="button" id="automod-save" class="primary-btn" style="margin-top:0.5rem">Save Automod</button>',
      '  <p id="automod-status" class="form-hint"></p>',
      "</section>",
      '<section class="feature-card" id="panel-ai-staff" style="margin-top:1rem">',
      "  <h2>🤖 AI Staff (elevated actions)</h2>",
      '  <p class="form-hint">Let selected roles/users tell CoffeeBot to do staff-level tasks (announce, channels, roles…). Everyone else is refused.</p>',
      '  <label class="check-row"><input type="checkbox" id="aistaff-enabled"> Enable AI Staff mode</label>',
      "  <label>Allowed role IDs (comma)</label>",
      '  <input id="aistaff-roles" type="text" placeholder="roleId, roleId">',
      "  <label>Allowed user IDs (comma)</label>",
      '  <input id="aistaff-users" type="text" placeholder="userId, userId">',
      "  <label>Default announce channel ID</label>",
      '  <input id="aistaff-announce" type="text" placeholder="channel snowflake">',
      "  <label>Staff action log channel ID</label>",
      '  <input id="aistaff-log" type="text" placeholder="channel snowflake">',
      "  <h3 style=\"margin-top:0.75rem\">Allowed actions</h3>",
      '  <label class="check-row"><input type="checkbox" id="as-announce" checked> Announce</label>',
      '  <label class="check-row"><input type="checkbox" id="as-send" checked> Send message to #channel</label>',
      '  <label class="check-row"><input type="checkbox" id="as-create-ch" checked> Create channel</label>',
      '  <label class="check-row"><input type="checkbox" id="as-rename" checked> Rename channel</label>',
      '  <label class="check-row"><input type="checkbox" id="as-create-role" checked> Create role</label>',
      '  <label class="check-row"><input type="checkbox" id="as-assign" checked> Assign role</label>',
      '  <label class="check-row"><input type="checkbox" id="as-remove"> Remove role</label>',
      '  <label class="check-row"><input type="checkbox" id="as-pin" checked> Pin message</label>',
      '  <button type="button" id="aistaff-save" class="primary-btn" style="margin-top:0.5rem">Save AI Staff</button>',
      '  <p id="aistaff-status" class="form-hint"></p>',
      '  <p class="form-hint">Example phrases: <code>announce: server online</code> · <code>create channel events</code> · <code>give @User @Role</code></p>',
      "</section>",
    ].join("\n");
  }

  function findMount() {
    return (
      document.getElementById("panel-ai") ||
      document.getElementById("ai-panel") ||
      document.querySelector("[data-feature=ai]") ||
      document.getElementById("features-root") ||
      document.querySelector(".features-grid") ||
      document.querySelector("main") ||
      document.body
    );
  }

  function ensurePanels() {
    if ($("panel-automod")) return;
    var mount = findMount();
    if (!mount) return;
    var wrap = document.createElement("div");
    wrap.id = "automod-staff-wrap";
    wrap.innerHTML = panelHtml();
    mount.appendChild(wrap);
    wire();
    apply();
  }

  function csv(id) {
    var el = $(id);
    if (!el) return [];
    return String(el.value || "")
      .split(/[,\s]+/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  function setCsv(id, arr) {
    var el = $(id);
    if (!el) return;
    el.value = Array.isArray(arr) ? arr.join(", ") : "";
  }

  function setStatus(id, t, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = t || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  function apply() {
    var c = window.currentConfig || {};
    var am = c.automod || {};
    var f = am.filters || {};
    if ($("automod-enabled")) $("automod-enabled").checked = !!am.enabled;
    if ($("automod-ignore-staff")) $("automod-ignore-staff").checked = am.ignoreStaff !== false;
    if ($("automod-log")) $("automod-log").value = am.logChannelId || "";
    setCsv("automod-ignore-roles", am.ignoredRoleIds || []);
    setCsv("automod-ignore-channels", am.ignoredChannelIds || []);
    if ($("am-invites")) $("am-invites").checked = f.invites ? f.invites.enabled !== false : true;
    if ($("am-mentions")) $("am-mentions").checked = f.massMentions ? f.massMentions.enabled !== false : true;
    if ($("am-spam")) $("am-spam").checked = f.spam ? f.spam.enabled !== false : true;
    if ($("am-links")) $("am-links").checked = !!(f.links && f.links.enabled);
    if ($("am-caps")) $("am-caps").checked = !!(f.caps && f.caps.enabled);
    if ($("am-badwords"))
      $("am-badwords").value = (f.badWords && Array.isArray(f.badWords.words) ? f.badWords.words : []).join(", ");

    var ai = c.ai || {};
    var st = ai.staff || {};
    var acts = st.allowedActions || {};
    if ($("aistaff-enabled")) $("aistaff-enabled").checked = !!st.enabled;
    setCsv("aistaff-roles", st.allowedRoleIds || []);
    setCsv("aistaff-users", st.allowedUserIds || []);
    if ($("aistaff-announce")) $("aistaff-announce").value = st.announceChannelId || "";
    if ($("aistaff-log")) $("aistaff-log").value = st.logChannelId || "";
    if ($("as-announce")) $("as-announce").checked = acts.announce !== false;
    if ($("as-send")) $("as-send").checked = acts.sendMessage !== false;
    if ($("as-create-ch")) $("as-create-ch").checked = acts.createChannel !== false;
    if ($("as-rename")) $("as-rename").checked = acts.renameChannel !== false;
    if ($("as-create-role")) $("as-create-role").checked = acts.createRole !== false;
    if ($("as-assign")) $("as-assign").checked = acts.assignRole !== false;
    if ($("as-remove")) $("as-remove").checked = !!acts.removeRole;
    if ($("as-pin")) $("as-pin").checked = acts.pinMessage !== false;
  }

  async function saveAutomod() {
    try {
      setStatus("automod-status", "Saving…", true);
      var bad = csv("am-badwords");
      var d = await window.saveConfig({
        automod: {
          enabled: $("automod-enabled") ? $("automod-enabled").checked : false,
          ignoreStaff: $("automod-ignore-staff") ? $("automod-ignore-staff").checked : true,
          logChannelId: ($("automod-log") && $("automod-log").value.trim()) || null,
          ignoredRoleIds: csv("automod-ignore-roles"),
          ignoredChannelIds: csv("automod-ignore-channels"),
          filters: {
            invites: { enabled: $("am-invites") ? $("am-invites").checked : true, action: "warn", deleteMessage: true },
            massMentions: {
              enabled: $("am-mentions") ? $("am-mentions").checked : true,
              threshold: 5,
              action: "warn",
              deleteMessage: true,
            },
            spam: {
              enabled: $("am-spam") ? $("am-spam").checked : true,
              threshold: 5,
              windowMs: 8000,
              action: "warn",
              deleteMessage: true,
            },
            links: { enabled: $("am-links") ? $("am-links").checked : false, action: "delete", deleteMessage: true },
            caps: {
              enabled: $("am-caps") ? $("am-caps").checked : false,
              percent: 75,
              minLength: 12,
              action: "delete",
              deleteMessage: true,
            },
            badWords: {
              enabled: bad.length > 0,
              words: bad,
              action: "warn",
              deleteMessage: true,
            },
          },
        },
      });
      setStatus(
        "automod-status",
        d && d.savedToBot === false ? "Saved on website. Bot offline — redeploy Railway." : "✅ Automod saved.",
        true
      );
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
    } catch (e) {
      setStatus("automod-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  async function saveAiStaff() {
    try {
      setStatus("aistaff-status", "Saving…", true);
      var d = await window.saveConfig({
        ai: {
          staff: {
            enabled: $("aistaff-enabled") ? $("aistaff-enabled").checked : false,
            allowedRoleIds: csv("aistaff-roles"),
            allowedUserIds: csv("aistaff-users"),
            announceChannelId: ($("aistaff-announce") && $("aistaff-announce").value.trim()) || null,
            logChannelId: ($("aistaff-log") && $("aistaff-log").value.trim()) || null,
            allowedActions: {
              announce: $("as-announce") ? $("as-announce").checked : true,
              sendMessage: $("as-send") ? $("as-send").checked : true,
              createChannel: $("as-create-ch") ? $("as-create-ch").checked : true,
              renameChannel: $("as-rename") ? $("as-rename").checked : true,
              createRole: $("as-create-role") ? $("as-create-role").checked : true,
              assignRole: $("as-assign") ? $("as-assign").checked : true,
              removeRole: $("as-remove") ? $("as-remove").checked : false,
              pinMessage: $("as-pin") ? $("as-pin").checked : true,
            },
          },
        },
      });
      setStatus(
        "aistaff-status",
        d && d.savedToBot === false ? "Saved on website. Bot offline — redeploy Railway." : "✅ AI Staff saved.",
        true
      );
      if (window.loadGuildData) await window.loadGuildData();
      else apply();
    } catch (e) {
      setStatus("aistaff-status", "❌ " + (e.message || "Failed"), false);
    }
  }

  function wire() {
    var a = $("automod-save");
    if (a && !a.__bound) {
      a.__bound = 1;
      a.addEventListener("click", saveAutomod);
    }
    var b = $("aistaff-save");
    if (b && !b.__bound) {
      b.__bound = 1;
      b.addEventListener("click", saveAiStaff);
    }
  }

  function boot() {
    ensurePanels();
    setInterval(ensurePanels, 2000);
    // re-apply when config reloads
    var prev = window.loadGuildData;
    if (typeof prev === "function" && !window.__amStaffLoadWrap) {
      window.__amStaffLoadWrap = true;
      window.loadGuildData = async function () {
        var r = await prev.apply(this, arguments);
        try {
          apply();
        } catch (_) {}
        return r;
      };
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
