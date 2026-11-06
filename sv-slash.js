/**
 * Slash command picker — loads full command list from /api/commands
 */
(function () {
  "use strict";
  if (window.__svSlashV2) return;
  window.__svSlashV2 = true;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  function commandUsage(command) {
    var names = [];
    (command.options || []).forEach(function (option) {
      if (option.type === 1) names.push(option.name);
      if (option.type === 2) (option.options || []).forEach(function (child) {
        if (child.type === 1) names.push(option.name + " " + child.name);
      });
    });
    return names.length ? "Subcommands: " + names.map(function (name) { return "/" + command.name + " " + name; }).join(" · ") : "";
  }

  function optionHint(options) {
    var required = [];
    var optional = [];
    (options || []).forEach(function (option) {
      if (option.type === 1 || option.type === 2) return;
      var token = "--" + option.name + (option.type === 5 ? "" : " value");
      (option.required ? required : optional).push(token);
    });
    var lines = [];
    if (required.length) lines.push("Required: " + required.join(" · "));
    if (optional.length) lines.push("Optional: " + optional.join(" · "));
    return lines.join(" | ");
  }

  function subcommands(command) {
    var out = [];
    (command.options || []).forEach(function (option) {
      if (option.type === 1) out.push({ name: option.name, options: option.options || [], description: option.description || "" });
      if (option.type === 2) {
        (option.options || []).forEach(function (child) {
          if (child.type === 1) out.push({ name: option.name + " " + child.name, options: child.options || [], description: child.description || "" });
        });
      }
    });
    return out;
  }

  function renderHelp(q) {
    var help = ensureHelp();
    if (!help) return;
    var list = commands.length ? commands : (window.__svSlashCommands || []);
    var raw = String(q || "");
    var trimmed = raw.trim();
    var parts = trimmed ? trimmed.split(/\s+/) : [];
    var selected = parts.length ? list.find(function (command) {
      return String(command.name).toLowerCase() === parts[0].toLowerCase();
    }) : null;
    var children = selected ? subcommands(selected) : [];
    var matches = [];

    if (selected && children.length && (parts.length > 1 || /\s$/.test(raw))) {
      var childQuery = parts.slice(1).join(" ").toLowerCase();
      var exactChild = children.find(function (child) { return child.name.toLowerCase() === childQuery; });
      if (exactChild && /\s$/.test(raw)) {
        var hint = optionHint(exactChild.options);
        help.hidden = !hint;
        help.innerHTML = hint ? '<div class="sv-slash-item sv-slash-hint"><strong>/' +
          esc(selected.name + " " + exactChild.name) + '</strong><span>' + esc(hint) + '</span></div>' : "";
        return;
      }
      matches = children.filter(function (child) {
        return !childQuery || child.name.toLowerCase().indexOf(childQuery) === 0;
      }).slice(0, 25).map(function (child) {
        var hint = optionHint(child.options);
        return '<button type="button" class="sv-slash-item" data-slash="/' +
          esc(selected.name + " " + child.name) + ' "><strong>/' +
          esc(selected.name + " " + child.name) + '</strong><span>' +
          esc(child.description) + (hint ? " · " + esc(hint) : "") + '</span></button>';
      });
    } else if (selected && /\s$/.test(raw)) {
      var topHint = optionHint(selected.options);
      help.hidden = !topHint;
      help.innerHTML = topHint ? '<div class="sv-slash-item sv-slash-hint"><strong>/' +
        esc(selected.name) + '</strong><span>' + esc(topHint) + '</span></div>' : "";
      return;
    } else {
      var needle = parts.length ? parts[0].toLowerCase() : "";
      matches = list.filter(function (command) {
        return !needle || String(command.name).toLowerCase().indexOf(needle) === 0;
      }).slice(0, 25).map(function (command) {
        var children = subcommands(command);
        var detail = command.desc || "";
        if (children.length) detail += (detail ? " · " : "") + children.map(function (child) { return "/" + command.name + " " + child.name; }).join(" · ");
        else if (optionHint(command.options)) detail += (detail ? " · " : "") + optionHint(command.options);
        return '<button type="button" class="sv-slash-item" data-slash="/' +
          esc(command.name) + ' "><strong>/' + esc(command.name) +
          '</strong><span>' + esc(detail) + '</span></button>';
      });
    }

    if (!matches.length) {
      help.hidden = true;
      help.innerHTML = "";
      return;
    }
    help.hidden = false;
    help.innerHTML = matches.join("");
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
      if (!res.ok) {
        window.__svSlashLastError = data.error || "Coffee Shop could not run that command.";
        return false;
      }
      if (res.ok && data.ok) {
        var result = data.data || {};
        if (result.ephemeral && result.response) alert(result.response);
        console.log("[sv-slash] executed via Coffee Shop bot", data.via);
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
        input.value = item.getAttribute("data-slash");
        help.hidden = true;
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    var form = document.getElementById("sv-composer");
    if (form && !form.dataset.slashSubmit) {
      form.dataset.slashSubmit = "1";
      form.addEventListener(
        "submit",
        async function (event) {
          var text = (input.value || "").trim();
          if (!text.startsWith("/")) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          var ok = await tryRunCommand(text);
          if (ok) {
            input.value = "";
            var help = document.getElementById("sv-slash-help");
            if (help) help.hidden = true;
            if (typeof window.__svForceReloadMessages === "function") window.__svForceReloadMessages();
          } else {
            alert(window.__svSlashLastError || "That Coffee Shop command could not be run here. Check its options or run it in Discord.");
          }
        },
        true
      );
    }
  }

  function boot() {
    bind();
    setInterval(bind, 2000);
    console.log("[sv-slash] v3 ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
