/**
 * Server View mentions — convert <@id> <@&id> <#id> in content + embeds.
 * formatRichText escapes HTML before matching, so tokens appear as <@...>.
 */
(function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function roleById(id) {
    id = String(id);
    var list = window.rolesCache;
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === id) return list[i];
    }
    return null;
  }

  function channelById(id) {
    id = String(id);
    var list = window.channelsCache;
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === id) return list[i];
    }
    return null;
  }

  function roleColor(role) {
    if (!role || role.color == null || role.color === 0 || role.color === "#000000") return "";
    if (typeof role.color === "number") {
      return "color:#" + ("000000" + (role.color >>> 0).toString(16)).slice(-6);
    }
    if (typeof role.color === "string" && role.color.charAt(0) === "#") return "color:" + role.color;
    return "";
  }

  function mentionHtml(kind, id) {
    id = String(id);
    if (kind === "user") {
      return '<span class="sv-mention sv-mention-user">@user</span>';
    }
    if (kind === "role") {
      var r = roleById(id);
      var label = r && r.name ? r.name : "role";
      var style = roleColor(r);
      return (
        '<span class="sv-mention sv-mention-role"' +
        (style ? ' style="' + style + '"' : "") +
        ">@" +
        esc(label) +
        "</span>"
      );
    }
    // channel
    var c = channelById(id);
    var name = c && c.name ? c.name : "channel";
    return '<span class="sv-mention sv-mention-channel">#' + esc(name) + "</span>";
  }

  function replaceTokens(html) {
    if (!html) return html;
    var next = html
      .replace(/<@!?(\d+)>/g, function (_, id) {
        return mentionHtml("user", id);
      })
      .replace(/<@&(\d+)>/g, function (_, id) {
        return mentionHtml("role", id);
      })
      .replace(/<@&(\d+)>/g, function (_, id) {
        return mentionHtml("role", id);
      })
      .replace(/<#(\d+)>/g, function (_, id) {
        return mentionHtml("channel", id);
      })
      .replace(/<@!?(\d+)>/g, function (_, id) {
        return mentionHtml("user", id);
      })
      .replace(/<@&(\d+)>/g, function (_, id) {
        return mentionHtml("role", id);
      })
      .replace(/<#(\d+)>/g, function (_, id) {
        return mentionHtml("channel", id);
      });
    return next;
  }

  function upgradeLabels(root) {
    root.querySelectorAll(".sv-mention-role").forEach(function (el) {
      var t = (el.textContent || "").trim();
      var m = t.match(/^@(\d{5,})$/);
      if (m) {
        var r = roleById(m[1]);
        if (r && r.name) {
          el.textContent = "@" + r.name;
          var st = roleColor(r);
          if (st) el.setAttribute("style", st);
        }
      }
    });
    root.querySelectorAll(".sv-mention-channel").forEach(function (el) {
      var t = (el.textContent || "").trim();
      var m = t.match(/^#(\d{5,})$/);
      if (m) {
        var c = channelById(m[1]);
        if (c && c.name) el.textContent = "#" + c.name;
      }
    });
  }

  function processAll(root) {
    root = root || document.getElementById("sv-messages");
    if (!root) return;
    var selectors =
      ".sv-msg-content, .sv-embed-desc, .sv-embed-field-name, .sv-embed-field-value, .sv-embed-title, .sv-reply-text";
    root.querySelectorAll(selectors).forEach(function (el) {
      var before = el.innerHTML;
      if (!before) return;
      var after = replaceTokens(before);
      if (after !== before) el.innerHTML = after;
      upgradeLabels(el);
    });
    upgradeLabels(root);
  }

  var timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      processAll();
    }, 40);
  }

  function bind() {
    var box = document.getElementById("sv-messages");
    if (!box) return;
    processAll(box);
    if (box.dataset.mentionObs) return;
    box.dataset.mentionObs = "1";
    var obs = new MutationObserver(schedule);
    obs.observe(box, { childList: true, subtree: true });
  }

  function boot() {
    bind();
    ["open-server-view", "nav-server-view", "sv-refresh"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.dataset.mentionBound) {
        el.dataset.mentionBound = "1";
        el.addEventListener("click", function () {
          setTimeout(bind, 100);
          setTimeout(bind, 500);
        });
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
