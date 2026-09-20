/**
 * Central logging UI — owns the entire #logs section.
 * Replaces old dashboard-log / audit-log panels.
 */
(function () {
  "use strict";
  if (window.__featuresLoggingV2) return;
  window.__featuresLoggingV2 = true;
  // Stop older audit-log panel from fighting this tab
  window.__featuresAuditLogsV3 = true;
  window.__featuresAuditLogsV1 = true;

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
    "verification"
  ];

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
        g = localStorage.getItem("selectedGuildId") || localStorage.getItem("guildId") || "";
      } catch (_) {}
    }
    if (!g && window.location && window.location.search) {
      try {
        g = new URLSearchParams(window.location.search).get("guildId") || "";
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
        t === "GUILD_ANNOUNCEMENT" ||
        String(t) === "0" ||
        String(t) === "5"
      );
    });
    if (!list.length) list = channels();
    var cur = el.value || (selected ? String(selected) : "") || "";
    // Rebuild when empty or channel list grew a lot
    var need =
      el.options.length <= 1 ||
      (list.length > 0 && el.options.length - 1 < Math.min(list.length, 3));
    if (!need) {
      if (!el.value && cur) el.value = cur;
      return;
    }
    var html =
      '<option value="">' + (placeholder || "— None —") + "</option>";
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
      messageContentRetentionDays: c.messageContentRetentionDays || 30,
      categories: c.categories || {},
      events: c.events || {}
    };
  }

  function sectionHtml() {
    var catRows = CATS.map(function (cat) {
      return (
        '<div class="input-group" style="margin-bottom:8px">' +
        "<label>" +
        cat +
        "</label>" +
        '<select id="log-cat-' +
        cat +
        '" data-log-cat="' +
        cat +
        '"></select></div>'
      );
    }).join("");

    var filterOpts = CATS.map(function (c) {
      return '<option value="' + c + '">' + c + "</option>";
    }).join("");

    return (
      '<div class="card form-card wide" id="central-logging-root">' +
      '<span class="eyebrow">LOGS</span>' +
      "<h2>Central logging</h2>" +
      '<p class="form-hint">Postgres stores every event. Discord posts are optional and routed by category or the default channel below.</p>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0">' +
      '<input type="checkbox" id="log-enabled" checked> <span><strong>Enable logging</strong></span></label>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0">' +
      '<input type="checkbox" id="log-default-db" checked> <span>Save to database (default)</span></label>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0">' +
      '<input type="checkbox" id="log-default-discord" checked> <span>Post to Discord (default)</span></label>' +
      '<div class="input-group"><label for="log-default-channel">Default log channel</label>' +
      '<select id="log-default-channel"></select></div>' +
      '<div class="input-group"><label for="log-retention">Message content retention (days)</label>' +
      '<input type="number" id="log-retention" min="1" max="365" value="30"></div>' +
      '<h3 style="margin-top:18px">Category channels</h3>' +
      '<p class="form-hint">Optional. Blank = use default channel.</p>' +
      '<div id="log-cat-channels">' +
      catRows +
      "</div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' +
      '<button type="button" class="button" id="log-save-config">Save log settings</button>' +
      "</div>" +
      '<p class="form-hint" id="log-config-status"></p>' +
      "</div>" +
      '<div class="card form-card wide" style="margin-top:16px" id="central-logging-browser">' +
      '<span class="eyebrow">BROWSER</span>' +
      "<h2>Recent events</h2>" +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">' +
      '<input id="log-search" placeholder="Search…" style="flex:1;min-width:140px">' +
      '<select id="log-filter-cat"><option value="">All categories</option>' +
      filterOpts +
      "</select>" +
      '<button type="button" class="button" id="log-refresh">Refresh</button>' +
      "</div>" +
      '<div id="log-list" style="display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto"></div>' +
      '<div id="log-detail" style="margin-top:12px;display:none"></div>' +
      '<p class="form-hint" id="log-browse-status"></p>' +
      "</div>"
    );
  }

  function ensurePanel() {
    var section = $("logs");
    if (!section) return false;

    // Remove competing panels
    ["audit-log-panel", "audit-logs"].forEach(function (id) {
      var el = $(id);
      if (el) el.remove();
    });

    if ($("central-logging-root")) return true;

    // Replace entire section content so old single-channel form is gone
    section.innerHTML = sectionHtml();
    section.classList.add("page-section");
    return true;
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
    CATS.forEach(function (cat) {
      fillChannelSelect(
        $("log-cat-" + cat),
        (cfg.categories[cat] && cfg.categories[cat].channelId) || "",
        "— Default —"
      );
    });
  }

  function collectConfig() {
    var categories = {};
    CATS.forEach(function (cat) {
      var el = $("log-cat-" + cat);
      var ch = el && el.value ? el.value : null;
      if (ch) categories[cat] = { channelId: ch, database: true, discord: true };
    });
    var def = $("log-default-channel") && $("log-default-channel").value
      ? $("log-default-channel").value
      : null;
    return {
      enabled: $("log-enabled") ? $("log-enabled").checked : true,
      defaultDatabase: $("log-default-db") ? $("log-default-db").checked : true,
      defaultDiscord: $("log-default-discord")
        ? $("log-default-discord").checked
        : true,
      defaultChannelId: def,
      messageContentRetentionDays: Math.max(
        1,
        Math.min(
          365,
          Number($("log-retention") && $("log-retention").value) || 30
        )
      ),
      categories: categories,
      events: (getLoggingCfg().events) || {},
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
      setCfgStatus("Save not ready — refresh the page once.", false);
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
      if (warn) {
        setCfgStatus("⚠ Saved, but: " + warn, false);
      } else {
        setCfgStatus("✅ Log settings saved.", true);
      }
      setTimeout(loadList, 500);
    } catch (e) {
      setCfgStatus("❌ " + (e && e.message ? e.message : "Save failed"), false);
    }
  }

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
      var url =
        "/api/logs?guildId=" +
        encodeURIComponent(gid) +
        "&view=list&limit=40" +
        (q ? "&q=" + encodeURIComponent(q) : "") +
        (cat ? "&category=" + encodeURIComponent(cat) : "");
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
          var who = r.target_name || r.actor_name || "—";
          var ch = r.channel_name ? "#" + r.channel_name : "";
          return (
            '<button type="button" class="button secondary" data-log-id="' +
            r.id +
            '" style="text-align:left;width:100%;justify-content:flex-start">' +
            "<strong>" +
            String(r.event_type) +
            "</strong> · " +
            who +
            (ch ? " → " + ch : "") +
            " · " +
            timeAgo(r.created_at) +
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
      if (data.contentAvailable) {
        if (log.before_content != null || log.after_content != null) {
          contentHtml =
            "<p><strong>Before</strong></p><pre style=\"white-space:pre-wrap\">" +
            String(log.before_content || "") +
            "</pre><p><strong>After</strong></p><pre style=\"white-space:pre-wrap\">" +
            String(log.after_content || "") +
            "</pre>";
        } else if (log.content != null) {
          contentHtml =
            "<p><strong>Content</strong></p><pre style=\"white-space:pre-wrap\">" +
            String(log.content) +
            "</pre>";
        }
      } else if (log.message_id) {
        contentHtml =
          '<p class="form-hint">Message content expired or was not stored (retention policy).</p>';
      }
      box.innerHTML =
        "<h3>" +
        String(log.event_type || "") +
        "</h3>" +
        "<p>Log ID: <code>" +
        (log.id || "") +
        "</code></p>" +
        "<p>Actor: " +
        (log.actor_name || log.actor_id || "—") +
        "</p>" +
        "<p>Target: " +
        (log.target_name || log.target_id || "—") +
        "</p>" +
        "<p>Channel: " +
        (log.channel_name || log.channel_id || "—") +
        "</p>" +
        "<p>Reason: " +
        (log.reason || "—") +
        "</p>" +
        "<p>Time: " +
        (log.created_at || "") +
        "</p>" +
        contentHtml;
    } catch (e) {
      setBrowseStatus("❌ " + (e.message || "Detail failed"), false);
    }
  }

  function bind() {
    var save = $("log-save-config");
    if (save && !save.__bound) {
      save.__bound = true;
      save.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        saveConfig();
      });
    }
    var ref = $("log-refresh");
    if (ref && !ref.__bound) {
      ref.__bound = true;
      ref.addEventListener("click", function (e) {
        e.preventDefault();
        loadList();
      });
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
  }

  function mount() {
    if (!$("logs")) return;
    ensurePanel();
    fillConfigForm();
    bind();
  }

  function onLogsOpen() {
    mount();
    setTimeout(fillConfigForm, 200);
    setTimeout(loadList, 300);
  }

  document.addEventListener(
    "click",
    function (e) {
      var t =
        e.target &&
        e.target.closest &&
        e.target.closest('[data-tab="logs"], [data-section-link="logs"]');
      if (t) {
        setTimeout(onLogsOpen, 40);
        setTimeout(onLogsOpen, 400);
      }
    },
    true
  );

  function wrapShowSection() {
    if (typeof window.showSection !== "function") return;
    if (window.showSection.__loggingV2) return;
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      if (String(tab) === "logs") onLogsOpen();
      return r;
    };
    window.showSection.__loggingV2 = true;
  }

  var lastCh = 0;
  setInterval(function () {
    var n = channels().length;
    if (n && n !== lastCh) {
      lastCh = n;
      if ($("log-default-channel")) fillConfigForm();
    }
  }, 2000);

  [0, 400, 1200, 3000, 6000].forEach(function (ms) {
    setTimeout(function () {
      wrapShowSection();
      mount();
    }, ms);
  });

  console.log("[features-logging] v2 — full Logs tab");
})();
