/**
 * Slash command picker — loads full command list from /api/commands
 */
(function () {
  "use strict";
  if (window.__svSlashV2) return;
  window.__svSlashV2 = true;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  var commands = [];
  var loaded = false;

  function guildId() {
    if (window.selectedServer && window.selectedServer.id) return String(window.selectedServer.id);
    if (window.__svGuildId) return String(window.__svGuildId);
    return "";
  }

  function channelId() {
    var active = document.querySelector("#sv-channel-list .sv-ch.active");
    if (active) return active.getAttribute("data-channel-id") || "";
    return window.__svActiveChannelId || "";
  }

  async function loadCommands() {
    var gid = guildId();
    if (!gid) return;
    try {
      var res = await fetch("/api/commands?guildId=" + encodeURIComponent(gid) + "&_=" + Date.now(), {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      var data = await res.json().catch(function () { return {}; });
      var list = Array.isArray(data.commands) ? data.commands : [];
      if (list.length) {
        commands = list;
        window.__svSlashCommands = list;
        loaded = true;
        console.log("[sv-slash] loaded", list.length, "commands");
      }
    } catch (e) {
      console.warn("[sv-slash] load failed", e);
    }
  }

  function ensureHelp() {
    var input = document.getElementById("sv-input");
    if (!input) return null;
    var help = document.getElementById("sv-slash-help");
    if (!help) {
      help = document.createElement("div");
      help.id = "sv-slash-help";
      help.className = "sv-slash-help";
      help.hidden = true;
      var composer = document.getElementById("sv-composer") || input.parentElement;
      if (composer) composer.insertBefore(help, input);
    }
    return help;
  }

  function injectCss() {
    if (document.getElementById("sv-slash-css")) return;
    var s = document.createElement("style");
    s.id = "sv-slash-css";
    s.textContent = [
      "#server-view .sv-slash-help{display:flex;flex-direction:column;gap:2px;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;padding:6px;margin-bottom:6px;max-height:220px;overflow:auto;z-index:5}",
      "#server-view .sv-slash-item{display:flex;flex-direction:column;gap:2px;border:0;background:transparent;color:#dbdee1;text-align:left;padding:8px 10px;border-radius:4px;cursor:pointer;font:inherit}",
      "#server-view .sv-slash-item:hover,#server-view .sv-slash-item.active{background:rgba(79,84,92,.4)}",
      "#server-view .sv-slash-item strong{color:#fff;font-weight:600}",
      "#server-view .sv-slash-item span{color:#b5bac1;font-size:12px}",
      "#server-view .sv-status{position:absolute;right:0;bottom:0;width:10px;height:10px;border-radius:50%;border:2px solid #2b2d31;box-sizing:border-box}",
      "#server-view .sv-member-av-wrap{position:relative}",
      "#server-view .sv-status.online{background:#23a559}",
      "#server-view .sv-status.idle{background:#f0b232}",
      "#server-view .sv-status.dnd{background:#f23f43}",
      "#server-view .sv-status.offline{background:#80848e}",
      "#server-view #sv-member-list .sv-member-row[data-offline=\"1\"]{opacity:.55}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function renderHelp(q) {
    var help = ensureHelp();
    if (!help) return;
    var needle = (q || "").toLowerCase();
    var list = commands.length ? commands : (window.__svSlashCommands || []);
    var matches = list.filter(function (c) {
      return !needle || String(c.name).toLowerCase().indexOf(needle) === 0;
    }).slice(0, 25);
    if (!matches.length) {
      help.hidden = true;
      help.innerHTML = "";
      return;
    }
    help.hidden = false;
    help.innerHTML = matches
      .map(function (c) {
        return (
          '<button type="button" class="sv-slash-item" data-slash="/' +
          esc(c.name) +
          '"><strong>/' +
          esc(c.name) +
          "</strong><span>" +
          esc(c.desc || "") +
          "</span></button>"
        );
      })
      .join("");
  }

  async function tryRunCommand(text) {
    var t = (text || "").trim();
    if (!t.startsWith("/")) return false;
    var parts = t.slice(1).split(/\s+/);
    var name = parts[0];
    if (!name) return false;
    try {
      var res = await fetch("/api/commands", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          guildId: guildId(),
          channelId: channelId(),
          command: name,
          content: t,
        }),
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok && data.ok) {
        console.log("[sv-slash] executed via bot", data.via);
        return true;
      }
    } catch (e) {
      console.warn("[sv-slash] run failed", e);
    }
    return false;
  }

  function bind() {
    injectCss();
    var input = document.getElementById("sv-input");
    if (!input || input.dataset.slashV2) return;
    input.dataset.slashV2 = "1";

    loadCommands();
    setInterval(function () {
      if (document.getElementById("server-view") && !document.getElementById("server-view").hidden) {
        if (!loaded || !commands.length) loadCommands();
      }
    }, 15000);

    input.addEventListener("focus", function () {
      if (!loaded) loadCommands();
    });

    input.addEventListener("input", function () {
      var v = input.value || "";
      if (v.charAt(0) !== "/") {
        var help = document.getElementById("sv-slash-help");
        if (help) {
          help.hidden = true;
          help.innerHTML = "";
        }
        return;
      }
      if (!commands.length) loadCommands().then(function () {
        renderHelp(v.slice(1));
      });
      else renderHelp(v.slice(1));
    });

    var help = ensureHelp();
    if (help && !help.dataset.bound) {
      help.dataset.bound = "1";
      help.addEventListener("click", function (e) {
        var item = e.target.closest ? e.target.closest("[data-slash]") : null;
        if (!item) return;
        input.value = item.getAttribute("data-slash") + " ";
        help.hidden = true;
        input.focus();
      });
    }

    var form = document.getElementById("sv-composer");
    if (form && !form.dataset.slashSubmit) {
      form.dataset.slashSubmit = "1";
      form.addEventListener(
        "submit",
        function () {
          var text = (input.value || "").trim();
          if (text.startsWith("/")) tryRunCommand(text);
        },
        true
      );
    }
  }

  function boot() {
    bind();
    setInterval(bind, 2000);
    console.log("[sv-slash] v2 ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
