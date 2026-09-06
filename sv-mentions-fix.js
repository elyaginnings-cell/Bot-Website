/**
 * Server View mentions fix
 * Resolves <@id>, <@&id>, <#id> using rolesCache / channelsCache / message mentions.
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

  function roleMap() {
    var map = {};
    var list = window.rolesCache;
    if (Array.isArray(list)) {
      list.forEach(function (r) {
        if (r && r.id) map[String(r.id)] = r;
      });
    }
    return map;
  }

  function channelMap() {
    var map = {};
    var list = window.channelsCache;
    if (Array.isArray(list)) {
      list.forEach(function (c) {
        if (c && c.id) map[String(c.id)] = c;
      });
    }
    return map;
  }

  function colorCss(role) {
    if (!role) return "";
    var c = role.color;
    if (c == null || c === 0 || c === "#000000" || c === "#000") return "";
    if (typeof c === "number") {
      var hex = ("000000" + (c >>> 0).toString(16)).slice(-6);
      return "color:#" + hex;
    }
    if (typeof c === "string" && c.charAt(0) === "#") return "color:" + c;
    return "";
  }

  function enhanceMentionsIn(root) {
    if (!root) return;
    var roles = roleMap();
    var channels = channelMap();

    // Text nodes that still contain raw Discord mention markup (escaped)
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (textNode) {
      var text = textNode.nodeValue;
      if (!text || text.indexOf("<") === -1 && text.indexOf("<") === -1) {
        // also handle already-escaped content in HTML text: look for patterns after parent innerHTML path below
      }
      if (!text) return;
      if (text.indexOf("@") === -1 && text.indexOf("#") === -1 && text.indexOf("<") === -1) return;

      // Only process if it looks like raw mention tokens
      if (!/<@!?\d+>|<@&\d+>|<#\d+>|<@!?\d+>|<@&\d+>|<#\d+>/.test(text)) return;

      var html = esc(text)
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

      // If double-escaped somehow, normalize once
      html = text
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">");

      html = html.replace(/<@!?(\d+)>/g, function (_, id) {
        return '<span class="sv-mention sv-mention-user">@user</span>';
      });
      html = html.replace(/<@&(\d+)>/g, function (_, id) {
        var r = roles[id];
        var label = r && r.name ? r.name : "role";
        var style = colorCss(r);
        return (
          '<span class="sv-mention sv-mention-role"' +
          (style ? ' style="' + style + '"' : "") +
          ">@" +
          esc(label) +
          "</span>"
        );
      });
      // Also match <@&123> when & not entity-encoded as &
      html = html.replace(/<@&(\d+)>/g, function (_, id) {
        var r = roles[id];
        var label = r && r.name ? r.name : "role";
        var style = colorCss(r);
        return (
          '<span class="sv-mention sv-mention-role"' +
          (style ? ' style="' + style + '"' : "") +
          ">@" +
          esc(label) +
          "</span>"
        );
      });
      html = html.replace(/<#(\d+)>/g, function (_, id) {
        var c = channels[id];
        var label = c && c.name ? c.name : "channel";
        return '<span class="sv-mention sv-mention-channel">#' + esc(label) + "</span>";
      });

      if (html === text.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">")) return;

      var wrap = document.createElement("span");
      wrap.innerHTML = html;
      var parent = textNode.parentNode;
      if (!parent) return;
      while (wrap.firstChild) parent.insertBefore(wrap.firstChild, textNode);
      parent.removeChild(textNode);
    });

    // Upgrade already-rendered mention spans that only show numeric ids
    root.querySelectorAll(".sv-mention-user").forEach(function (el) {
      var t = (el.textContent || "").trim();
      if (/^@\d{17,20}$/.test(t)) {
        el.textContent = "@user";
      }
    });
    root.querySelectorAll(".sv-mention-role").forEach(function (el) {
      var t = (el.textContent || "").trim();
      var m = t.match(/^@(\d{17,20})$/);
      if (m && roles[m[1]] && roles[m[1]].name) {
        el.textContent = "@" + roles[m[1]].name;
        var style = colorCss(roles[m[1]]);
        if (style) el.setAttribute("style", style);
      } else if (t === "@role" || t === "@unknown") {
        /* keep */
      }
    });
    root.querySelectorAll(".sv-mention-channel").forEach(function (el) {
      var t = (el.textContent || "").trim();
      var m = t.match(/^#(\d{17,20})$/);
      if (m && channels[m[1]] && channels[m[1]].name) {
        el.textContent = "#" + channels[m[1]].name;
      }
    });
  }

  function patchFormatRichText() {
    // Observe message container for new content
    var box = document.getElementById("sv-messages");
    if (!box) return;
    enhanceMentionsIn(box);
    if (box.dataset.mentionObs) return;
    box.dataset.mentionObs = "1";
    var obs = new MutationObserver(function () {
      enhanceMentionsIn(box);
    });
    obs.observe(box, { childList: true, subtree: true });
  }

  function boot() {
    patchFormatRichText();
    // Re-run when server view opens
    ["open-server-view", "nav-server-view"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.dataset.mentionBound) {
        el.dataset.mentionBound = "1";
        el.addEventListener("click", function () {
          setTimeout(patchFormatRichText, 100);
          setTimeout(patchFormatRichText, 500);
        });
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
