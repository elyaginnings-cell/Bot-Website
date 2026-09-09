/**
 * Discord-exact Server View polish (v2 fixed)
 * Server View ONLY. Main dashboard UI untouched.
 */
(function () {
  "use strict";
  if (window.__svDiscordExactV2) return;
  window.__svDiscordExactV2 = true;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/\u0026/g, "\u0026amp;")
      .replace(/\u003c/g, "\u0026lt;")
      .replace(/\u003e/g, "\u0026gt;")
      .replace(/\u0022/g, "\u0026quot;");
  }

  function getMessages() {
    if (Array.isArray(window.lastMessages)) return window.lastMessages;
    if (Array.isArray(window.__svLastMessages)) return window.__svLastMessages;
    return [];
  }

  function messageMentionsMe(message) {
    var me = "";
    try {
      if (window.__svMe && window.__svMe.id) me = String(window.__svMe.id);
      else if (window.currentUser && window.currentUser.id) me = String(window.currentUser.id);
      else if (window.userCache && window.userCache.id) me = String(window.userCache.id);
    } catch (e) {}
    if (!message) return false;
    var content = message.content || "";
    if (content.indexOf("@everyone") !== -1 || content.indexOf("@here") !== -1) return true;
    if (!me) return false;
    var users = (message.mentions && message.mentions.users) || {};
    if (users[me]) return true;
    return content.indexOf("<@" + me + ">") !== -1 || content.indexOf("<@!" + me + ">") !== -1;
  }

  function enhance() {
    var container = document.getElementById("sv-messages");
    if (!container) return;
    var list = getMessages();
    container.querySelectorAll("article.sv-msg[data-message-id]").forEach(function (el) {
      var id = el.getAttribute("data-message-id");
      var msg = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && String(list[i].id) === String(id)) { msg = list[i]; break; }
      }
      if (!msg) return;
      if (messageMentionsMe(msg)) el.classList.add("mention-me");
      if (Array.isArray(msg.reactions) && msg.reactions.length && !el.querySelector(".sv-reactions")) {
        var html = '<div class="sv-reactions">';
        msg.reactions.forEach(function (r) {
          if (!r) return;
          var emoji = r.emoji || {};
          var name = emoji.name || "emoji";
          var inner;
          if (emoji.id) {
            var ext = emoji.animated ? "gif" : "png";
            inner = '<img src="https://cdn.discordapp.com/emojis/' + esc(String(emoji.id)) + '.' + ext + '?size=32" alt="" loading="lazy" referrerpolicy="no-referrer">';
          } else {
            inner = '<span>' + esc(name) + '</span>';
          }
          html += '<span class="sv-reaction' + (r.me ? ' me' : '') + '">' + inner + '<span class="sv-reaction-count">' + esc(String(r.count || 1)) + '</span></span>';
        });
        html += '</div>';
        var body = el.querySelector(".sv-msg-body");
        if (body) body.insertAdjacentHTML("beforeend", html);
      }
    });
  }

  function statusClass(status) {
    if (!status) return "offline";
    status = String(status).toLowerCase();
    if (status === "online") return "online";
    if (status === "idle") return "idle";
    if (status === "dnd" || status === "do_not_disturb") return "dnd";
    return "offline";
  }

  function renderMembersDiscordStyle(members) {
    members = members || [];
    var listEl = document.getElementById("sv-member-list");
    if (!listEl || !members.length) return;
    var roleMap = {};
    (window.rolesCache || []).forEach(function (r) { if (r && r.id) roleMap[String(r.id)] = r; });
    function topRole(m) {
      var ids = m.roleIds || [];
      var best = null;
      for (var i = 0; i < ids.length; i++) {
        var r = roleMap[String(ids[i])];
        if (!r || r.name === "@everyone") continue;
        if (!best || (Number(r.position)||0) > (Number(best.position)||0)) best = r;
      }
      return best;
    }
    function colorOf(r) {
      if (!r || r.color == null || r.color === 0) return "";
      if (typeof r.color === "number") return "#" + ("000000" + (r.color >>> 0).toString(16)).slice(-6);
      if (typeof r.color === "string" && r.color.charAt(0) === "#") return r.color;
      return "";
    }
    var groups = {};
    var order = [];
    members.forEach(function (m) {
      if (!m || !m.id) return;
      var top = topRole(m);
      var key = top ? String(top.id) : "_online";
      if (!groups[key]) { groups[key] = { role: top, members: [] }; order.push(key); }
      groups[key].members.push(m);
    });
    order.sort(function (a, b) {
      if (a === "_online") return 1;
      if (b === "_online") return -1;
      return (Number(groups[b].role && groups[b].role.position)||0) - (Number(groups[a].role && groups[a].role.position)||0);
    });
    var html = "";
    order.forEach(function (key) {
      var g = groups[key];
      var title = key === "_online" ? "ONLINE \u2014 " + g.members.length : ((g.role && g.role.name) || "ROLE") + " \u2014 " + g.members.length;
      html += '<div class="sv-ml-group">' + esc(title) + '</div>';
      g.members.sort(function (a,b) {
        var an = (a.displayName || a.username || "").toLowerCase();
        var bn = (b.displayName || b.username || "").toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
      g.members.forEach(function (m) {
        var name = m.displayName || m.globalName || m.username || "User";
        var av = m.avatar || ("https://cdn.discordapp.com/embed/avatars/" + (Number(String(m.id).slice(-4)) % 6) + ".png");
        var col = colorOf(topRole(m));
        var st = statusClass(m.status);
        html += '<div class="sv-member-row" data-member-id="' + esc(String(m.id)) + '">';
        html += '<div class="sv-member-av-wrap"><img class="sv-member-av" src="' + esc(av) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'"><span class="sv-status ' + st + '"></span></div>';
        html += '<div class="sv-member-info"><span class="sv-member-name"' + (col ? ' style="color:' + col + ' !important"' : '') + '>' + esc(name) + '</span>';
        if (m.bot) html += '<span class="sv-bot-badge">BOT</span>';
        html += '</div>';
        if (!m.bot) html += '<button type="button" class="sv-member-punish sv-punish-btn" data-punish-user="' + esc(String(m.id)) + '" data-punish-name="' + esc(name) + '" data-punish-msg="">Punish</button>';
        html += '</div>';
      });
    });
    listEl.innerHTML = html;
    listEl.dataset.discordGrouped = "1";
  }

  function injectCss() {
    if (document.getElementById("sv-discord-exact-css")) return;
    var css = document.createElement("style");
    css.id = "sv-discord-exact-css";
    css.textContent = [
      "#server-view .sv-reply-ref{display:flex;align-items:center;gap:6px;margin:0 0 2px;max-width:100%}",
      "#server-view .sv-reply-ref-bar{width:2px;align-self:stretch;min-height:16px;background:#4e5058;border-radius:1px;margin-left:18px;position:relative}",
      "#server-view .sv-reply-ref-bar::before{content:'';position:absolute;left:0;top:-6px;width:12px;height:8px;border-left:2px solid #4e5058;border-top:2px solid #4e5058;border-top-left-radius:4px}",
      "#server-view .sv-reply-ref-body{font-size:12px;color:#b5bac1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#server-view .sv-reply-ref-body strong{color:#c4c9ce;font-weight:500}",
      "#server-view .sv-msg.mention-me{background:rgba(240,178,50,.08)!important;box-shadow:inset 2px 0 0 #f0b232}",
      "#server-view .sv-reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}",
      "#server-view .sv-reaction{display:inline-flex;align-items:center;gap:4px;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;padding:2px 6px;font-size:12px;color:#dbdee1}",
      "#server-view .sv-reaction.me{background:rgba(88,101,242,.25);border-color:rgba(88,101,242,.5)}",
      "#server-view .sv-reaction img{width:16px;height:16px}",
      "#server-view .sv-ch.unread .sv-ch-label{color:#f2f3f5;font-weight:600}",
      "#server-view .sv-unread-dot{width:8px;height:8px;border-radius:50%;background:#f2f3f5;margin-left:auto;flex-shrink:0}",
      "#server-view #sv-member-list .sv-ml-group{margin:12px 8px 4px;font-size:11px;font-weight:700;letter-spacing:.02em;color:#949ba4;text-transform:uppercase}",
      "#server-view #sv-member-list .sv-member-av-wrap{position:relative;width:32px;height:32px;flex-shrink:0}",
      "#server-view #sv-member-list .sv-status{position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;border:2px solid #2b2d31;background:#80848e}",
      "#server-view #sv-member-list .sv-status.online{background:#23a559}",
      "#server-view #sv-member-list .sv-status.idle{background:#f0b232}",
      "#server-view #sv-member-list .sv-status.dnd{background:#f23f43}",
      "#server-view #sv-member-list .sv-status.offline{background:#80848e}",
      "#server-view .sv-slash-help{display:flex;flex-direction:column;gap:2px;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;padding:6px;margin-bottom:6px;max-height:180px;overflow:auto}",
      "#server-view .sv-slash-item{display:flex;gap:10px;border:0;background:transparent;color:#dbdee1;text-align:left;padding:6px 8px;border-radius:4px;cursor:pointer;font:inherit}",
      "#server-view .sv-slash-item:hover{background:rgba(79,84,92,.4)}",
      "@media (max-width:768px){",
      "#server-view .sv-channels{width:min(320px,86vw)!important;max-width:86vw}",
      "#server-view .sv-msg{padding:8px 10px!important}",
      "#server-view .sv-msg-content{font-size:15px;line-height:1.375;word-break:break-word}",
      "#server-view #sv-input{font-size:16px!important;min-height:44px}",
      "#server-view .sv-composer{padding:8px!important}",
      "#server-view .sv-component-btn{min-height:36px;padding:8px 12px}",
      "#server-view #sv-member-list .sv-member-row{padding:8px;min-height:44px}",
      "#server-view .sv-member-punish{opacity:1}",
      "#server-view .sv-attachment-image,#server-view .sv-attachment-image-btn img{max-width:100%!important;height:auto}",
      "}"
    ].join("\n");
    document.head.appendChild(css);
  }

  function bindSlash() {
    var input = document.getElementById("sv-input");
    if (!input || input.dataset.slashBound) return;
    input.dataset.slashBound = "1";
    var help = document.getElementById("sv-slash-help");
    if (!help) {
      help = document.createElement("div");
      help.id = "sv-slash-help";
      help.className = "sv-slash-help";
      help.hidden = true;
      var composer = document.getElementById("sv-composer") || input.parentElement;
      if (composer) composer.insertBefore(help, input);
    }
    var known = window.__svSlashCommands || [
      { name: "help", desc: "Show bot help" },
      { name: "profile", desc: "View profile" },
      { name: "balance", desc: "Currency balance" },
      { name: "daily", desc: "Claim daily" },
      { name: "rank", desc: "Level rank" },
      { name: "leaderboard", desc: "Top ranks" }
    ];
    input.addEventListener("input", function () {
      var v = input.value || "";
      if (v.charAt(0) !== "/") { help.hidden = true; help.innerHTML = ""; return; }
      var q = v.slice(1).toLowerCase();
      var matches = known.filter(function (c) { return !q || c.name.indexOf(q) === 0; }).slice(0, 8);
      if (!matches.length) { help.hidden = true; return; }
      help.hidden = false;
      help.innerHTML = matches.map(function (c) {
        return '<button type="button" class="sv-slash-item" data-slash="/' + esc(c.name) + '"><strong>/' + esc(c.name) + '</strong><span>' + esc(c.desc || "") + '</span></button>';
      }).join("");
    });
    help.addEventListener("click", function (e) {
      var item = e.target.closest ? e.target.closest("[data-slash]") : null;
      if (!item) return;
      input.value = item.getAttribute("data-slash") + " ";
      help.hidden = true;
      input.focus();
    });
  }

  function boot() {
    (function hookFetch() {
      if (window.__svFetchHooked) return;
      window.__svFetchHooked = true;
      var orig = window.fetch;
      if (typeof orig !== "function") return;
      window.fetch = function (input, init) {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        var method = (init && init.method) || "GET";
        return orig.apply(this, arguments).then(function (res) {
          try {
            if (method.toUpperCase() === "GET" && String(url).indexOf("/api/messages") !== -1) {
              res.clone().json().then(function (data) {
                var messages = Array.isArray(data) ? data : (data && data.messages) || [];
                if (Array.isArray(messages)) {
                  window.lastMessages = messages;
                  window.__svLastMessages = messages;
                }
              }).catch(function () {});
            }
          } catch (e) {}
          return res;
        });
      };
    })();

    injectCss();
    bindSlash();
    window.__svRenderMembersDiscord = renderMembersDiscordStyle;
    window.__svEnhanceMessages = enhance;
    setInterval(function () {
      enhance();
      var el = document.getElementById("sv-member-list");
      if (el && Array.isArray(window.membersCache) && window.membersCache.length && el.dataset.discordGrouped !== "1") {
        renderMembersDiscordStyle(window.membersCache);
      }
    }, 1500);
    document.addEventListener("click", function (e) {
      var tab = e.target && e.target.closest ? e.target.closest("[data-sv-tab]") : null;
      if (tab && tab.getAttribute("data-sv-tab") === "members") {
        setTimeout(function () {
          if (Array.isArray(window.membersCache)) {
            var el = document.getElementById("sv-member-list");
            if (el) el.dataset.discordGrouped = "";
            renderMembersDiscordStyle(window.membersCache);
          }
        }, 400);
      }
    }, true);
    console.log("[sv-discord-exact] v2 online");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
