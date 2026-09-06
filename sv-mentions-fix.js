/**
 * Server View mentions fix
 * formatRichText runs esc() first, so tokens in DOM innerHTML are:
 *   <@ID>  <@&ID>  <#ID>
 * This script converts those (and raw tokens) into mention chips.
 */
(function () {
  "use strict";

  // Build entity strings without writing raw HTML entities into this source
  var LT = String.fromCharCode(38, 108, 116, 59); // <
  var GT = String.fromCharCode(38, 103, 116, 59); // >
  var AMP = String.fromCharCode(38, 97, 109, 112, 59); // &

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, AMP)
      .replace(/</g, LT)
      .replace(/>/g, GT)
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
    var c = channelById(id);
    var name = c && c.name ? c.name : "channel";
    return '<span class="sv-mention sv-mention-channel">#' + esc(name) + "</span>";
  }

  function replaceTokens(html) {
    if (!html || typeof html !== "string") return html;

    // Escaped forms produced by esc() then dumped into innerHTML
    var reUserEsc = new RegExp(LT + "@!?(\\d+)" + GT, "g");
    var reRoleEscAmp = new RegExp(LT + "@" + AMP + "(\\d+)" + GT, "g");
    var reRoleEscBare = new RegExp(LT + "@&(\\d+)" + GT, "g");
    var reChanEsc = new RegExp(LT + "#(\\d+)" + GT, "g");

    // Raw forms (if any)
    var reUserRaw = /<@!?(\d+)>/g;
    var reRoleRaw = /<@&(\d+)>/g;
    var reChanRaw = /<#(\d+)>/g;

    var next = html;
    next = next.replace(reUserEsc, function (_, id) {
      return mentionHtml("user", id);
    });
    next = next.replace(reRoleEscAmp, function (_, id) {
      return mentionHtml("role", id);
    });
    next = next.replace(reRoleEscBare, function (_, id) {
      return mentionHtml("role", id);
    });
    next = next.replace(reChanEsc, function (_, id) {
      return mentionHtml("channel", id);
    });
    next = next.replace(reUserRaw, function (_, id) {
      return mentionHtml("user", id);
    });
    next = next.replace(reRoleRaw, function (_, id) {
      return mentionHtml("role", id);
    });
    next = next.replace(reChanRaw, function (_, id) {
      return mentionHtml("channel", id);
    });
    return next;
  }

  function upgradeLabels(root) {
    if (!root || !root.querySelectorAll) return;
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
    }, 50);
  }

  function bind() {
    var box = document.getElementById("sv-messages");
    if (!box) return;
    processAll(box);
    if (box.dataset.mentionObs === "2") return;
    box.dataset.mentionObs = "2";
    var obs = new MutationObserver(schedule);
    obs.observe(box, { childList: true, subtree: true, characterData: true });
  }

  function boot() {
    bind();
    ["open-server-view", "nav-server-view", "sv-refresh"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.dataset.mentionBound2) {
        el.dataset.mentionBound2 = "1";
        el.addEventListener("click", function () {
          setTimeout(bind, 100);
          setTimeout(bind, 600);
        });
      }
    });
    // Keep trying briefly after load in case messages arrive late
    setTimeout(bind, 300);
    setTimeout(bind, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
