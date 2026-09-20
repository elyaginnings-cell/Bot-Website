/**
 * Central logging — config + browse inside existing #logs section
 */
(function () {
  "use strict";
  if (window.__featuresLoggingV1) return;
  window.__featuresLoggingV1 = true;

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
    return window.channelsCache || window.__channels || [];
  }

  function fillChannelSelect(el, selected, placeholder) {
    if (!el) return;
    if (el === document.activeElement) return;
    var list = channels().filter(function (x) {
      if (!x) return false;
      var t = x.type;
      return t === 0 || t === 5 || t == null || String(t) === "0" || String(t) === "5";
    });
    if (!list.length) list = channels();
    var cur = el.value || selected || "";
    if (el.options.length > 1 && list.length && el.options.length - 1 >= Math.min(list.length, 3)) {
      if (!el.value && selected) el.value = String(selected);
      return;
    }
    var html = '<option value="">' + (placeholder || "— None —") + "</option>";
    list.forEach(function (x) {
      html +=
        '<option value="' +
        String(x.id) +
        '">#' +
        String(x.name || x.id).replace(/</g, "<") +
        "</option>";
    });
    el.innerHTML = html;
    if (cur) el.value = String(cur);
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

  function ensurePanel() {
    var section = $("logs");
    if (!section) return null;
    var host = $("central-logging-panel");
    if (host) return host;

    host = document.createElement("div");
    host.id = "central-logging-panel";
    host.innerHTML =
      '<div class="card form-card wide" style="margin-top:12px">' +
      '<span class="eyebrow">CENTRAL LOGGING</span>' +
      "<h2>Log settings</h2>" +
      '<p class="form-hint">Postgres is the source of truth. Discord is optional output. Unknown events inherit defaults.</p>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0">' +
      '<input type="checkbox" id="log-enabled" checked> <span><strong>Enable logging</strong></span></label>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0">' +
      '<input type="checkbox" id="log-default-db" checked> <span>Database logging (default)</span></label>' +
      '<label class="toggle" style="display:flex;gap:8px;align-items:center;margin:8px 0">' +
      '<input type="checkbox" id="log-default-discord" checked> <span>Discord logging (default)</span></label>' +
      '<div class="input-group"><label>Default log channel</label>' +
      '<select id="log-default-channel"></select></div>' +
      '<div class="input-group"><label>Message content retention (days)</label>' +
      '<input type="number" id="log-retention" min="1" max="365" value="30"></div>' +
      "<h3 style=\"margin-top:18px\">Category channels (optional)</h3>" +
      '<p class="form-hint">Override Discord destination by category. Leave blank to use default.</p>' +
      '<div id="log-cat-channels"></div>' +
      '<button type="button" class="button" id="log-save-config" style="margin-top:12px">Save log settings</button>' +
      '<p class="form-hint" id="log-config-status"></p>' +
      "</div>" +
      '<div class="card form-card wide" style="margin-top:16px">' +
      '<span class="eyebrow">LOG BROWSER</span>' +
      "<h2>Recent logs</h2>" +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">' +
      '<input id="log-search" placeholder="Search…" style="flex:1;min-width:140px">' +
      '<select id="log-filter-cat"><option value="">All categories</option></select>' +
      '<button type="button" class="button" id="log-refresh">Refresh</button>' +
      "</div>" +
      '<div id="log-list" style="display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto"></div>' +
      '<div id="log-detail" style="margin-top:12px;display:none"></div>' +
      '<p class="form-hint" id="log-browse-status"></p>' +
      "</div>";

    var card = section.querySelector(".card") || section;
    // Hide old single-channel form noise under new panel
    card.appendChild(host);
    return host;
  }

  function renderCatChannels() {
    var box = $("log-cat-channels");
    if (!box) return;
    var cfg = getLoggingCfg();
    if (box.dataset.built === "1") {
      CATS.forEach(function (cat) {
        fillChannelSelect(
          $("log-cat-" + cat),
          (cfg.categories[cat] && cfg.categories[cat].channelId) || "",
          "— Default —"
        );
      });
      return;
    }
    box.innerHTML = CATS.map(function (cat) {
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
    box.dataset.built = "1";
    CATS.forEach(function (cat) {
      fillChannelSelect(
        $("log-cat-" + cat),
        (cfg.categories[cat] && cfg.categories[cat].channelId) || "",
        "— Default —"
      );
    });
  }

  function fillConfigForm() {
    var cfg = getLoggingCfg();
    if ($("log-enabled")) $("log-enabled").checked = cfg.enabled;
    if ($("log-default-db")) $("log-default-db").checked = cfg.defaultDatabase;
    if ($("log-default-discord"))
      $("log-default-discord").checked = cfg.defaultDiscord;
    if ($("log-retention"))
      $("log-retention").value = cfg.messageContentRetentionDays || 30;
    fillChannelSelect($("log-default-channel"), cfg.defaultChannelId, "Select channel…");
    // also fill legacy select if present
    fillChannelSelect($("dashboard-log-channel"), cfg.defaultChannelId, "Select a channel…");
    renderCatChannels();

    var fc = $("log-filter-cat");
    if (fc && fc.options.length <= 1) {
      CATS.forEach(function (c) {
        var o = document.createElement("option");
        o.value = c;
        o.textContent = c;
        fc.appendChild(o);
      });
    }
  }

  function collectConfig() {
    var categories = {};
    CATS.forEach(function (cat) {
      var el = $("log-cat-" + cat);
      var ch = el && el.value ? el.value : null;
      if (ch) categories[cat] = { channelId: ch, database: true, discord: true };
    });
    var def =
      ($("log-default-channel") && $("log-default-channel").value) ||
      ($("dashboard-log-channel") && $("dashboard-log-channel").value) ||
      null;
    return {
      enabled: $("log-enabled") ? $("log-enabled").checked : true,
      defaultDatabase: $("log-default-db") ? $("log-default-db").checked : true,
      defaultDiscord: $("log-default-discord")
        ? $("log-default-discord").checked
        : true,
      defaultChannelId: def,
      messageContentRetentionDays: Math.max(
        1,
        Math.min(365, Number($("log-retention") && $("log-retention").value) || 30)
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

  function guildId() {
    return (
      window.selectedGuildId ||
      window.currentGuildId ||
      (window.currentConfig && window.currentConfig.guildId) ||
      localStorage.getItem("selectedGuildId") ||
      ""
    );
  }

  async function saveConfig() {
    if (!window.saveConfig) {
      setCfgStatus("Save not ready — refresh.", false);
      return;
    }
    try {
      setCfgStatus("Saving…", true);
      var logging = collectConfig();
      var payload = { logging: logging };
      if (logging.defaultChannelId) {
        payload.dashboardLogChannelId = logging.defaultChannelId;
      }
      await window.saveConfig(payload);
      if (!window.currentConfig) window.currentConfig = {};
      window.currentConfig.logging = logging;
      setCfgStatus("✅ Log settings saved (bot will apply on push).", true);
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
          '<p class="form-hint">No logs yet. Save settings, then trigger an action (delete a message, toggle a system, etc.).</p>';
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
      setBrowseStatus(data.total + " total", true);
    } catch (e) {
      setBrowseStatus("❌ " + (e && e.message ? e.message : "Load failed"), false);
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
        String(log.event_type) +
        "</h3>" +
        "<p>Log ID: <code>" +
        log.id +
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
        log.created_at +
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
        saveConfig();
      });
    }
    var oldSave = $("save-logs");
    if (oldSave && !oldSave.__centralBound) {
      oldSave.__centralBound = true;
      oldSave.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          saveConfig();
        },
        true
      );
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
        var btn = e.target && e.target.closest && e.target.closest("[data-log-id]");
        if (btn) showDetail(btn.getAttribute("data-log-id"));
      });
    }
  }

  function mount() {
    if (!$("logs")) return;
    ensurePanel();
    fillConfigForm();
    bind();
  }

  document.addEventListener(
    "click",
    function (e) {
      var t =
        e.target &&
        e.target.closest &&
        e.target.closest('[data-tab="logs"], [data-section-link="logs"]');
      if (t) {
        setTimeout(mount, 50);
        setTimeout(function () {
          mount();
          loadList();
        }, 400);
      }
    },
    true
  );

  if (typeof window.showSection === "function" && !window.showSection.__loggingV1) {
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      if (String(tab) === "logs") {
        setTimeout(mount, 40);
        setTimeout(loadList, 200);
      }
      return r;
    };
    window.showSection.__loggingV1 = true;
  }

  setInterval(function () {
    if (channels().length && $("log-default-channel")) fillConfigForm();
  }, 2500);

  [0, 600, 2000, 5000].forEach(function (ms) {
    setTimeout(mount, ms);
  });

  console.log("[features-logging] v1 central logger UI");
})();
