/**
 * Central logging UI — owns #logs completely.
 * v3: re-inject if anything restores the old Dashboard logs form.
 */
(function () {
  "use strict";
  if (window.__featuresLoggingV3) return;
  window.__featuresLoggingV3 = true;
  window.__featuresLoggingV2 = true;
  window.__featuresAuditLogsV3 = true;
  window.__featuresAuditLogsV4 = true;

  var CATS = [
    "moderation",
    "automod",
    "member",
    "message",
    "economy",
    "level",
    "tickets",
    "staff",
    "config",
    "bot",
    "invite",
    "qotd",
    "verification",
    "security",
    "channel",
    "role",
    "guild",
    "emoji",
    "sticker",
    "event",
    "integration",
    "voice"
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function prettyEvent(value) {
    var known = {
      "config.website_change": "Website Configuration Changed",
      "member.update": "Member Updated",
      "member.join": "Member Joined",
      "member.leave": "Member Left",
      "channel.update": "Channel Updated",
      "role.update": "Role Updated",
      "guild.update": "Server Settings Updated",
      "message.edit": "Message Edited",
      "message.delete": "Message Deleted"
    };
    if (known[value]) return known[value];
    return String(value || "Unknown event").split(".").join(" · ").replace(/[_-]/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function channels() {
    try {
      if (typeof channelsCache !== "undefined" && channelsCache && channelsCache.length)
        return channelsCache;
    } catch (_) {}
    try {
      if (window.syncGlobals) window.syncGlobals();
    } catch (_) {}
    return window.channelsCache || window.__channels || window.dashboardChannels || [];
  }

  function guildId() {
    var g =
      window.selectedGuildId ||
      window.currentGuildId ||
      window.activeGuildId ||
      (window.currentGuild && (window.currentGuild.id || window.currentGuild)) ||
      "";
    if (!g) {
      try {
        g =
          localStorage.getItem("selectedGuildId") ||
          localStorage.getItem("guildId") ||
          "";
      } catch (_) {}
    }
    return String(g || "");
  }

  function fillChannelSelect(el, selected, placeholder) {
    if (!el || el.tagName !== "SELECT") return;
    if (el === document.activeElement) return;
    var list = channels().filter(function (x) {
      if (!x) return false;
      var t = x.type;
      return (
        t === 0 ||
        t === 5 ||
        t == null ||
        t === "GUILD_TEXT" ||
        String(t) === "0" ||
        String(t) === "5"
      );
    });
    if (!list.length) list = channels();
    var cur = el.value || (selected ? String(selected) : "") || "";
    var need =
      el.options.length <= 1 ||
      (list.length > 0 && el.options.length - 1 < Math.min(list.length, 3));
    if (!need) {
      if (!el.value && cur) el.value = cur;
      return;
    }
    var html = '<option value="">' + (placeholder || "— None —") + "</option>";
    list.forEach(function (x) {
      var name = String(x.name || x.id)
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">");
      html += '<option value="' + String(x.id) + '">#' + name + "</option>";
    });
    el.innerHTML = html;
    if (cur) el.value = cur;
  }

  function getLoggingCfg() {
    var c = (window.currentConfig || {}).logging || {};
    var legacy =
      (window.currentConfig || {}).dashboardLogChannelId ||
      ((window.currentConfig || {}).auditLog || {}).defaultChannelId ||
      "";
    return {
      enabled: c.enabled !== false,
      defaultDatabase: c.defaultDatabase !== false,
      defaultDiscord: c.defaultDiscord !== false,
      defaultChannelId: c.defaultChannelId || legacy || "",
      securityChannelId: c.securityChannelId || "",
      securityAlertRoleId: c.securityAlertRoleId || "",
      messageContentRetentionDays: c.messageContentRetentionDays || 30,
      categories: c.categories || {},
      events: c.events || {},
      ignore: c.ignore || { actors: [], targets: [], roles: [], channels: [], messages: [], bots: false }
    };
  }

  function sectionHtml() {
    var catRows = CATS.map(function (cat) {
      return (
        '<div class="input-group log-category-row" style="margin-bottom:12px;padding:10px;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:10px">' +
        '<label style="display:block;margin-bottom:6px">' + cat + '</label>' +
        '<select id="log-cat-' + cat + '" data-log-cat="' + cat + '"></select>' +
        '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:7px">' +
        '<label class="toggle"><input type="checkbox" id="log-cat-db-' + cat + '" data-log-cat-db="' + cat + '"> Database</label>' +
        '<label class="toggle"><input type="checkbox" id="log-cat-discord-' + cat + '" data-log-cat-discord="' + cat + '"> Discord</label>' +
        '</div></div>'
      );
    }).join("");
    var filterOpts = CATS.map(function (c) {
      return '<option value="' + c + '">' + c + "</option>";
    }).join("");
    var eventTypes = [
      "moderation.warn","moderation.warn_removed","moderation.ban","moderation.unban","moderation.kick","moderation.timeout","moderation.timeout_remove","moderation.purge",
      "automod.message_deleted","automod.warn","automod.timeout",
      "member.join","member.leave","member.update","member.verify","member.ban","member.unban","member.voice",
      "message.delete","message.edit","message.bulk_delete","message.reaction_add","message.reaction_remove","message.reaction_clear","message.reaction_emoji_clear",
      "channel.create","channel.update","channel.delete","channel.pins_update","channel.webhook_update",
      "thread.create","thread.update","thread.delete",
      "role.create","role.update","role.delete",
      "guild.update","guild.boost_start","guild.boost_stop",
      "invite.create","invite.delete",
      "emoji.create","emoji.update","emoji.delete",
      "sticker.create","sticker.update","sticker.delete",
      "event.create","event.update","event.delete",
      "integration.create","integration.update","integration.delete",
      "voice.update","webhook.create","webhook_update",
      "economy.transaction","economy.work","economy.purchase","economy.fishing.catch","level.up",
      "tickets.open","tickets.close","tickets.escalate",
      "staff.loa_created","staff.activity_check",
      "config.website_change","config.system_toggle","config.setting_change","config.logging_updated",
      "config.automod_rule_create","config.automod_rule_update","config.automod_rule_delete",
      "bot.change","bot.command","bot.error","qotd.post","verification.complete","security.alert"
    ];
    var eventOpts = eventTypes.map(function (e) {
      return '<option value="' + e + '">' + e.split(".").join(" · ").replace(/[_-]/g, " ") + '</option>';
    }).join("");
    var eventRows = eventTypes.map(function (eventType) {
      return '<label class="toggle log-event-toggle" data-log-event-row="' + eventType + '" style="display:flex;gap:8px;align-items:center;padding:7px 9px;border-bottom:1px solid var(--border,rgba(255,255,255,.08))">' +
        '<input type="checkbox" data-log-event="' + eventType + '" checked> <span>' + escapeHtml(prettyEvent(eventType)) + '</span></label>';
    }).join("");

    return (
      '<div class="card form-card wide" id="central-logging-root" data-central-logs="1">' +
      '<span class="eyebrow">LOGS</span>' +
      "<h2>Central logging</h2>" +
      '<p class="form-hint">Postgres is the source of truth. Discord output is optional and routed below.</p>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0">' +
      '<input type="checkbox" id="log-enabled" checked> <span><strong>Enable logging</strong></span></label>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0">' +
      '<input type="checkbox" id="log-default-db" checked> <span>Save to database (default)</span></label>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0">' +
      '<input type="checkbox" id="log-default-discord" checked> <span>Post to Discord (default)</span></label>' +
      '<div class="input-group"><label for="log-default-channel">Default log channel</label>' +
      '<select id="log-default-channel"></select></div>' +
      '<div class="input-group"><label for="log-security-channel">Security / verification log channel</label>' +
      '<select id="log-security-channel"></select>' +
      '<p class="form-hint">Automod, malicious-content containment, and verification security events use this channel unless a more specific category or event channel is set.</p></div>' +
      '<div class="input-group"><label for="log-security-role">Security alert role ID</label>' +
      '<input id="log-security-role" placeholder="Paste the role ID" inputmode="numeric">' +
      '<p class="form-hint">Only genuinely security-sensitive server changes ping this role. Normal joins, role changes, messages, and routine edits do not.</p></div>' +
      '<div class="input-group"><label for="log-retention">Message content retention (days)</label>' +
      '<input type="number" id="log-retention" min="1" max="365" value="30"></div>' +
      '<h3 style="margin-top:18px">Category channels</h3>' +
      '<p class="form-hint">Optional. Blank = use default channel.</p>' +
      '<div id="log-cat-channels">' +
      catRows +
      "</div>" +
      '<h3 style="margin-top:18px">Individual event controls</h3>' +
      '<p class="form-hint">Switch off specific events without disabling the rest of their category.</p>' +
      '<input id="log-event-search" placeholder="Find an event…" aria-label="Find a log event" style="width:100%;margin-bottom:8px">' +
      '<div id="log-event-controls" style="max-height:320px;overflow:auto;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:10px">' + eventRows + '</div>' +
      '<h3 style="margin-top:18px">Ignore rules</h3>' +
      '<p class="form-hint">Keep noisy activity out of the log stream. Actors are people performing actions; targets are people affected by actions. Enter IDs separated by commas.</p>' +
      '<div class="input-group"><label for="log-ignore-actors">Ignore actors (executors)</label><input id="log-ignore-actors" placeholder="Discord user IDs, comma separated"></div>' +
      '<div class="input-group"><label for="log-ignore-targets">Ignore targets</label><input id="log-ignore-targets" placeholder="Discord user IDs, comma separated"></div>' +
      '<div class="input-group"><label for="log-ignore-roles">Ignore roles (actor or target)</label><input id="log-ignore-roles" placeholder="Discord role IDs, comma separated"></div>' +
      '<div class="input-group"><label for="log-ignore-channels">Ignore channels</label><input id="log-ignore-channels" placeholder="Discord channel IDs, comma separated"></div>' +
      '<div class="input-group"><label for="log-ignore-messages">Ignore messages</label><input id="log-ignore-messages" placeholder="Discord message IDs, comma separated"></div>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0"><input type="checkbox" id="log-ignore-bots"> <span>Ignore bot-generated activity</span></label>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' +
      '<button type="button" class="button" id="log-save-config">Save log settings</button>' +
      "</div>" +
      '<p class="form-hint" id="log-config-status"></p>' +
      "</div>" +
      '<div class="card form-card wide" style="margin-top:16px" id="central-logging-browser" data-central-logs="1">' +
      '<span class="eyebrow">BROWSER</span>' +
      "<h2>Recent events</h2>" +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">' +
      '<input id="log-search" placeholder="Search…" style="flex:1;min-width:140px">' +
      '<select id="log-filter-cat"><option value="">All categories</option>' +
      filterOpts +
      "</select>" +
      '<select id="log-filter-event"><option value="">All event types</option>' + eventOpts + '</select>' +
      '<button type="button" class="button" id="log-refresh">Refresh</button>' +
      '<button type="button" class="button secondary" id="log-export">Export CSV</button>' +
      "</div>" +
      '<div id="log-list" style="display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto"></div>' +
      '<div id="log-detail" style="margin-top:12px;display:none"></div>' +
      '<p class="form-hint" id="log-browse-status"></p>' +
      "</div>"
    );
  }

  function needsReplace(section) {
    if (!section) return false;
    if (!$("central-logging-root")) return true;
    // The index page intentionally ships a tiny boot placeholder with the
    // same root id. It is NOT the real logging UI. Replace it when the
    // actual controls have not been mounted yet.
    if (!$("log-default-channel") || !$("log-save-config") || !$("log-list")) return true;
    // Old form came back
    if ($("dashboard-log-channel") || $("save-logs") || $("audit-log-panel"))
      return true;
    var t = (section.textContent || "").toLowerCase();
    if (t.indexOf("dashboard logs") !== -1 && t.indexOf("central logging") === -1)
      return true;
    return false;
  }

  function ensurePanel() {
    var section = $("logs");
    if (!section) return false;

    ["audit-log-panel", "audit-logs"].forEach(function (id) {
      var el = $(id);
      if (el) el.remove();
    });

    if (needsReplace(section)) {
      section.innerHTML = sectionHtml();
      section.classList.add("page-section");
      // re-bind after wipe
      window.__logUiBound = false;
    }
    return !!$("central-logging-root");
  }

  function fillConfigForm() {
    if (!$("log-default-channel")) return;
    var cfg = getLoggingCfg();
    if ($("log-enabled") && document.activeElement !== $("log-enabled"))
      $("log-enabled").checked = cfg.enabled;
    if ($("log-default-db") && document.activeElement !== $("log-default-db"))
      $("log-default-db").checked = cfg.defaultDatabase;
    if (
      $("log-default-discord") &&
      document.activeElement !== $("log-default-discord")
    )
      $("log-default-discord").checked = cfg.defaultDiscord;
    if ($("log-retention") && document.activeElement !== $("log-retention"))
      $("log-retention").value = cfg.messageContentRetentionDays || 30;

    fillChannelSelect(
      $("log-default-channel"),
      cfg.defaultChannelId,
      "Select channel…"
    );
    fillChannelSelect(
      $("log-security-channel"),
      cfg.securityChannelId,
      "Select security channel…"
    );
    if ($("log-security-role") && document.activeElement !== $("log-security-role"))
      $("log-security-role").value = cfg.securityAlertRoleId || "";
    var ignore = cfg.ignore || {};
    [["actors", "log-ignore-actors"], ["targets", "log-ignore-targets"], ["roles", "log-ignore-roles"], ["channels", "log-ignore-channels"], ["messages", "log-ignore-messages"]].forEach(function (pair) {
      var el = $(pair[1]);
      if (el && document.activeElement !== el) el.value = Array.isArray(ignore[pair[0]]) ? ignore[pair[0]].join(", ") : "";
    });
    if ($("log-ignore-bots") && document.activeElement !== $("log-ignore-bots"))
      $("log-ignore-bots").checked = ignore.bots === true;
    CATS.forEach(function (cat) {
      var category = cfg.categories[cat] || {};
      fillChannelSelect(
        $("log-cat-" + cat),
        category.channelId || "",
        "— Default —"
      );
      var dbToggle = $("log-cat-db-" + cat);
      var discordToggle = $("log-cat-discord-" + cat);
      if (dbToggle && document.activeElement !== dbToggle)
        dbToggle.checked = category.database === undefined ? cfg.defaultDatabase : category.database !== false;
      if (discordToggle && document.activeElement !== discordToggle)
        discordToggle.checked = category.discord === undefined ? cfg.defaultDiscord : category.discord !== false;
    });
    var eventControls = $("log-event-controls");
    if (eventControls) {
      eventControls.querySelectorAll("[data-log-event]").forEach(function (el) {
        if (document.activeElement === el) return;
        var saved = cfg.events[el.getAttribute("data-log-event")];
        el.checked = !(saved && saved.enabled === false);
      });
    }
  }

  function parseIdList(el) {
    return String(el && el.value || "").split(",").map(function (value) {
      return value.trim();
    }).filter(Boolean);
  }

  function collectEventSettings() {
    var events = Object.assign({}, getLoggingCfg().events || {});
    var controls = $("log-event-controls");
    if (!controls) return events;
    controls.querySelectorAll("[data-log-event]").forEach(function (el) {
      var eventType = el.getAttribute("data-log-event");
      var saved = Object.assign({}, events[eventType] || {});
      if (el.checked) {
        delete saved.enabled;
        if (Object.keys(saved).length) events[eventType] = saved;
        else delete events[eventType];
      } else {
        saved.enabled = false;
        events[eventType] = saved;
      }
    });
    return events;
  }

  function collectConfig() {
    var categories = {};
    var defaultDatabase = $("log-default-db") ? $("log-default-db").checked : true;
    var defaultDiscord = $("log-default-discord") ? $("log-default-discord").checked : true;
    CATS.forEach(function (cat) {
      var el = $("log-cat-" + cat);
      var ch = el && el.value ? el.value : null;
      var dbToggle = $("log-cat-db-" + cat);
      var discordToggle = $("log-cat-discord-" + cat);
      var database = dbToggle ? dbToggle.checked : defaultDatabase;
      var discord = discordToggle ? discordToggle.checked : defaultDiscord;
      if (ch || database !== defaultDatabase || discord !== defaultDiscord) {
        categories[cat] = { channelId: ch, database: database, discord: discord };
      }
    });
    var def =
      $("log-default-channel") && $("log-default-channel").value
        ? $("log-default-channel").value
        : null;
    return {
      enabled: $("log-enabled") ? $("log-enabled").checked : true,
      defaultDatabase: defaultDatabase,
      defaultDiscord: defaultDiscord,
      defaultChannelId: def,
      securityChannelId: $("log-security-channel") && $("log-security-channel").value ? $("log-security-channel").value : null,
      securityAlertRoleId: $("log-security-role") && $("log-security-role").value ? $("log-security-role").value : null,
      messageContentRetentionDays: Math.max(
        1,
        Math.min(
          365,
          Number($("log-retention") && $("log-retention").value) || 30
        )
      ),
      categories: categories,
      events: collectEventSettings(),
      replaceEvents: true,
      ignore: {
        actors: parseIdList($("log-ignore-actors")),
        targets: parseIdList($("log-ignore-targets")),
        roles: parseIdList($("log-ignore-roles")),
        channels: parseIdList($("log-ignore-channels")),
        messages: parseIdList($("log-ignore-messages")),
        bots: !!($("log-ignore-bots") && $("log-ignore-bots").checked)
      },
      replaceCategories: true
    };
  }

  function setCfgStatus(msg, ok) {
    var el = $("log-config-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  function setBrowseStatus(msg, ok) {
    var el = $("log-browse-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  async function saveConfig() {
    if (!window.saveConfig) {
      setCfgStatus("Save not ready — refresh once.", false);
      return;
    }
    try {
      setCfgStatus("Saving…", true);
      var logging = collectConfig();
      if (!logging.defaultChannelId && logging.defaultDiscord) {
        setCfgStatus(
          "Pick a default log channel (or turn off Discord logging).",
          false
        );
        return;
      }
      var payload = {
        logging: logging,
        dashboardLogChannelId: logging.defaultChannelId || null
      };
      var result = await window.saveConfig(payload);
      if (!window.currentConfig) window.currentConfig = {};
      window.currentConfig.logging = logging;
      window.currentConfig.dashboardLogChannelId = logging.defaultChannelId;
      var warn =
        result && (result.warning || (result.data && result.data.warning));
      setCfgStatus(
        warn ? "⚠ Saved, but: " + warn : "✅ Log settings saved.",
        !warn
      );
      setTimeout(loadList, 400);
      return true;
    } catch (e) {
      setCfgStatus("❌ " + (e && e.message ? e.message : "Save failed"), false);
      return false;
    }
  }
  window.saveLoggingConfig = saveConfig;

  function timeAgo(iso) {
    try {
      var t = new Date(iso).getTime();
      var s = Math.floor((Date.now() - t) / 1000);
      if (s < 60) return s + "s ago";
      if (s < 3600) return Math.floor(s / 60) + "m ago";
      if (s < 86400) return Math.floor(s / 3600) + "h ago";
      return Math.floor(s / 86400) + "d ago";
    } catch {
      return "";
    }
  }

  async function loadList() {
    var gid = guildId();
    if (!gid) {
      setBrowseStatus("Select a server first.", false);
      return;
    }
    setBrowseStatus("Loading…", true);
    try {
      var q = $("log-search") ? $("log-search").value : "";
      var cat = $("log-filter-cat") ? $("log-filter-cat").value : "";
      var eventType = $("log-filter-event") ? $("log-filter-event").value : "";
      var url =
        "/api/logs?guildId=" +
        encodeURIComponent(gid) +
        "&view=list&limit=40" +
        (q ? "&q=" + encodeURIComponent(q) : "") +
        (cat ? "&category=" + encodeURIComponent(cat) : "") +
        (eventType ? "&eventType=" + encodeURIComponent(eventType) : "");
      var res = await fetch(url, { credentials: "include" });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
      var list = $("log-list");
      if (!list) return;
      var rows = data.rows || [];
      if (!rows.length) {
        list.innerHTML =
          '<p class="form-hint">No events yet. Save settings, then delete a message or toggle a system.</p>';
        setBrowseStatus("0 events", true);
        return;
      }
      list.innerHTML = rows
        .map(function (r) {
          var who = r.target_name || r.actor_name || "Unknown actor";
          var ch = r.channel_name ? "#" + r.channel_name : "";
          var meta = r.metadata && typeof r.metadata === "object" ? r.metadata : {};
          var changes = Array.isArray(meta.changes) ? meta.changes : [];
          var preview = changes.slice(0, 2).map(function (c) {
            return String(c.path || "Setting").replace(/[._]/g, " ") + ": " + String(c.before || "—") + " → " + String(c.after || "—");
          }).join(" · ");
          return (
            '<button type="button" class="button secondary log-event-row" data-log-id="' +
            escapeHtml(r.id) +
            '" style="text-align:left;width:100%;justify-content:flex-start;display:block;padding:12px">' +
            '<strong>' + escapeHtml(prettyEvent(r.event_type)) + '</strong>' +
            '<span style="display:block;opacity:.8;margin-top:4px">' + escapeHtml(who) +
            (ch ? " · " + escapeHtml(ch) : "") + " · " + escapeHtml(timeAgo(r.created_at)) + '</span>' +
            (preview ? '<span style="display:block;opacity:.72;font-size:.9em;margin-top:5px">' + escapeHtml(preview) + '</span>' : '') +
            "</button>"
          );
        })
        .join("");
      setBrowseStatus((data.total || rows.length) + " total", true);
    } catch (e) {
      setBrowseStatus(
        "❌ " + (e && e.message ? e.message : "Load failed"),
        false
      );
    }
  }

  async function showDetail(id) {
    var gid = guildId();
    if (!gid || !id) return;
    try {
      var res = await fetch(
        "/api/logs?guildId=" +
          encodeURIComponent(gid) +
          "&view=detail&id=" +
          encodeURIComponent(id),
        { credentials: "include" }
      );
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
      var log = data.log || {};
      var box = $("log-detail");
      if (!box) return;
      box.style.display = "block";
      var contentHtml = "";
      var meta = log.metadata && typeof log.metadata === "object" ? log.metadata : {};
      if (Array.isArray(meta.changes) && meta.changes.length) {
        contentHtml += '<h4>Configuration changes (' + meta.changes.length + ')</h4><div class="log-change-list">';
        contentHtml += meta.changes.map(function (change) {
          return '<div style="padding:8px 10px;margin:6px 0;border-left:3px solid var(--accent,#8b5cf6);background:rgba(127,127,127,.08)">' +
            '<strong>' + escapeHtml(String(change.path || "Setting").replace(/[._]/g, " ")) + '</strong>' +
            '<div style="margin-top:4px"><span style="opacity:.75">' + escapeHtml(change.before || "—") + '</span> <span aria-hidden="true">→</span> <strong>' + escapeHtml(change.after || "—") + '</strong></div></div>';
        }).join("");
        contentHtml += '</div>';
      }
      if (Array.isArray(meta.securityReasons) && meta.securityReasons.length) {
        contentHtml += '<h4>Security notes</h4><ul>' + meta.securityReasons.map(function (x) { return '<li>' + escapeHtml(x) + '</li>'; }).join("") + '</ul>';
      }
      if (meta.before !== undefined || meta.after !== undefined) {
        contentHtml += '<h4>Change snapshots</h4><div class="log-snapshot-grid">';
        if (meta.before !== undefined) {
          contentHtml += '<section><strong>Before</strong><pre>' + escapeHtml(JSON.stringify(meta.before, null, 2).slice(0, 12000)) + '</pre></section>';
        }
        if (meta.after !== undefined) {
          contentHtml += '<section><strong>After</strong><pre>' + escapeHtml(JSON.stringify(meta.after, null, 2).slice(0, 12000)) + '</pre></section>';
        }
        contentHtml += '</div>';
      }
      var attachments = Array.isArray(log.attachments) ? log.attachments : [];
      if (attachments.length) {
        contentHtml += '<h4>Attachments (' + attachments.length + ')</h4><ul class="log-attachment-list">';
        contentHtml += attachments.map(function (attachment) {
          var name = escapeHtml(attachment.name || attachment.filename || "Attachment");
          var url = String(attachment.url || "");
          var safeUrl = /^https:\/\//i.test(url) ? url : "";
          var size = Number(attachment.size) > 0 ? " · " + Math.max(1, Math.round(Number(attachment.size) / 1024)) + " KB" : "";
          return '<li>' + (safeUrl ? '<a href="' + escapeHtml(safeUrl) + '" target="_blank" rel="noopener noreferrer">' + name + '</a>' : name) + escapeHtml(size) + '</li>';
        }).join("");
        contentHtml += '</ul>';
      }
      var embeds = Array.isArray(log.embeds_snapshot) ? log.embeds_snapshot : [];
      if (embeds.length) {
        contentHtml += '<h4>Embeds (' + embeds.length + ')</h4>';
        contentHtml += embeds.map(function (embed) {
          var title = embed.title ? '<strong>' + escapeHtml(embed.title) + '</strong>' : '<strong>Embed</strong>';
          var description = embed.description ? '<p>' + escapeHtml(embed.description) + '</p>' : '';
          var link = /^https:\/\//i.test(String(embed.url || "")) ? '<p><a href="' + escapeHtml(embed.url) + '" target="_blank" rel="noopener noreferrer">Open embed link</a></p>' : '';
          var fields = Array.isArray(embed.fields) ? embed.fields.slice(0, 10).map(function (field) {
            return '<p><strong>' + escapeHtml(field.name || "Field") + ':</strong> ' + escapeHtml(field.value || "") + '</p>';
          }).join("") : '';
          return '<div class="log-embed-snapshot">' + title + description + fields + link + '</div>';
        }).join("");
      }
      if (data.contentAvailable) {
        if (log.before_content != null || log.after_content != null) {
          contentHtml +=
            "<p><strong>Before</strong></p><pre style=\"white-space:pre-wrap\">" +
            escapeHtml(log.before_content || "") +
            "</pre><p><strong>After</strong></p><pre style=\"white-space:pre-wrap\">" +
            escapeHtml(log.after_content || "") +
            "</pre>";
        } else if (log.content != null) {
          contentHtml +=
            "<p><strong>Content</strong></p><pre style=\"white-space:pre-wrap\">" +
            escapeHtml(log.content) +
            "</pre>";
        }
      } else if (log.message_id) {
        contentHtml +=
          '<p class="form-hint">Message content expired or was not stored.</p>';
      }
      box.innerHTML =
        "<h3>" + escapeHtml(prettyEvent(log.event_type)) + "</h3>" +
        '<p><strong>Category:</strong> ' + escapeHtml(log.category || "—") + '</p>' +
        "<p><strong>Log ID:</strong> <code>" + escapeHtml(log.id || "") + "</code></p>" +
        "<p><strong>Actor:</strong> " + escapeHtml(log.actor_name || log.actor_id || "—") + "</p>" +
        "<p><strong>Target:</strong> " + escapeHtml(log.target_name || log.target_id || "—") + "</p>" +
        "<p><strong>Channel:</strong> " + escapeHtml(log.channel_name || log.channel_id || "—") + "</p>" +
        "<p><strong>Reason:</strong> " + escapeHtml(log.reason || "—") + "</p>" +
        "<p><strong>Time:</strong> " + escapeHtml(log.created_at ? new Date(log.created_at).toLocaleString() : "—") + "</p>" +
        contentHtml;
    } catch (e) {
      setBrowseStatus("❌ " + (e.message || "Detail failed"), false);
    }
  }

  function bind() {
    if (window.__logUiBound && $("log-save-config") && $("log-save-config").__bound)
      return;
    window.__logUiBound = true;

    var save = $("log-save-config");
    if (save) {
      save.__bound = true;
      save.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        saveConfig();
      };
    }
    var ref = $("log-refresh");
    if (ref) {
      ref.__bound = true;
      ref.onclick = function (e) {
        e.preventDefault();
        loadList();
      };
    }
    var exportButton = $("log-export");
    if (exportButton && !exportButton.__bound) {
      exportButton.__bound = true;
      exportButton.onclick = async function (e) {
        e.preventDefault();
        var gid = guildId();
        if (!gid) return setBrowseStatus("Select a server first.", false);
        try {
          setBrowseStatus("Preparing CSV export…", true);
          var params = new URLSearchParams({
            guildId: gid,
            view: "export",
            q: $("log-search") ? $("log-search").value : "",
            category: $("log-filter-cat") ? $("log-filter-cat").value : "",
            eventType: $("log-filter-event") ? $("log-filter-event").value : ""
          });
          var response = await fetch("/api/logs?" + params.toString(), { credentials: "include" });
          if (!response.ok) {
            var errorData = await response.json().catch(function () { return {}; });
            throw new Error(errorData.error || "Export failed (HTTP " + response.status + ")");
          }
          var blob = await response.blob();
          var url = URL.createObjectURL(blob);
          var link = document.createElement("a");
          link.href = url;
          link.download = "coffee-shop-logs.csv";
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          setBrowseStatus("CSV export ready.", true);
        } catch (error) {
          setBrowseStatus("❌ " + (error.message || "Export failed"), false);
        }
      };
    }
    var list = $("log-list");
    if (list && !list.__bound) {
      list.__bound = true;
      list.addEventListener("click", function (e) {
        var btn =
          e.target && e.target.closest && e.target.closest("[data-log-id]");
        if (btn) showDetail(btn.getAttribute("data-log-id"));
      });
    }
    var search = $("log-search");
    if (search && !search.__bound) {
      search.__bound = true;
      var t;
      search.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(loadList, 350);
      });
    }
    var fc = $("log-filter-cat");
    if (fc && !fc.__bound) {
      fc.__bound = true;
      fc.addEventListener("change", loadList);
    }
    var fe = $("log-filter-event");
    if (fe && !fe.__bound) {
      fe.__bound = true;
      fe.addEventListener("change", loadList);
    }
    var eventSearch = $("log-event-search");
    if (eventSearch && !eventSearch.__bound) {
      eventSearch.__bound = true;
      eventSearch.addEventListener("input", function () {
        var query = String(eventSearch.value || "").toLowerCase();
        var controls = $("log-event-controls");
        if (!controls) return;
        controls.querySelectorAll("[data-log-event-row]").forEach(function (row) {
          row.style.display = row.textContent.toLowerCase().indexOf(query) >= 0 ? "flex" : "none";
        });
      });
    }
  }

  function mount() {
    if (!$("logs")) return false;
    var ok = ensurePanel();
    if (!ok) return false;
    fillConfigForm();
    bind();
    return true;
  }

  function onLogsOpen() {
    mount();
    setTimeout(function () {
      mount();
      fillConfigForm();
      loadList();
    }, 150);
    setTimeout(mount, 500);
  }

  // Any nav click that mentions logs
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest && e.target.closest("a, button, [data-tab], [data-section-link], .nav-item, .drawer-link");
      if (!t) return;
      var tab =
        t.getAttribute("data-tab") ||
        t.getAttribute("data-section-link") ||
        t.getAttribute("href") ||
        t.textContent ||
        "";
      if (/logs/i.test(String(tab))) {
        setTimeout(onLogsOpen, 30);
        setTimeout(onLogsOpen, 250);
        setTimeout(onLogsOpen, 800);
      }
    },
    true
  );

  function wrapShowSection() {
    if (typeof window.showSection !== "function") return;
    if (window.showSection.__loggingV3) return;
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      if (String(tab).toLowerCase() === "logs") onLogsOpen();
      return r;
    };
    window.showSection.__loggingV3 = true;
  }

  // If old form is restored, put ours back
  var obsTimer = null;
  function watch() {
    var section = $("logs");
    if (!section || section.__logObs) return;
    section.__logObs = true;
    var mo = new MutationObserver(function () {
      if (obsTimer) return;
      obsTimer = setTimeout(function () {
        obsTimer = null;
        if (needsReplace($("logs"))) mount();
      }, 80);
    });
    mo.observe(section, { childList: true, subtree: true });
  }

  var lastCh = 0;
  setInterval(function () {
    wrapShowSection();
    watch();
    if (needsReplace($("logs"))) mount();
    var n = channels().length;
    if (n && n !== lastCh) {
      lastCh = n;
      fillConfigForm();
    }
  }, 1500);

  [0, 300, 800, 1500, 3000, 6000, 10000].forEach(function (ms) {
    setTimeout(function () {
      wrapShowSection();
      watch();
      mount();
    }, ms);
  });

  console.log("[features-logging] v3 — forced Logs tab");
})();
