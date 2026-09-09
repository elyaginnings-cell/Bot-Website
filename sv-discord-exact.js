/**
 * Discord-exact Server View polish
 * Replies, reactions, unread, pings, role-grouped members, component buttons, /commands helper
 */
(function () {
  "use strict";
  if (window.__svDiscordExactV1) return;
  window.__svDiscordExactV1 = true;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }
  function truncate(s, n) {
    s = String(s || "");
    return s.length <= n ? s : s.slice(0, n - 1) + "…";
  }
  function myUserId() {
    try {
      if (window.__svMe && window.__svMe.id) return String(window.__svMe.id);
      if (window.currentUser && window.currentUser.id) return String(window.currentUser.id);
      if (window.userCache && window.userCache.id) return String(window.userCache.id);
      return localStorage.getItem("svMeId") || localStorage.getItem("discordUserId") || "";
    } catch (e) { return ""; }
  }
  function messageMentionsMe(message) {
    var me = myUserId();
    if (!me || !message) return false;
    var users = (message.mentions && message.mentions.users) || {};
    if (users[me]) return true;
    var content = message.content || "";
    if (content.indexOf("<@" + me + ">") !== -1 || content.indexOf("<@!" + me + ">") !== -1) return true;
    if (content.indexOf("@everyone") !== -1 || content.indexOf("@here") !== -1) return true;
    return false;
  }

  function renderReactions(reactions) {
    if (!Array.isArray(reactions) || !reactions.length) return "";
    var html = '<div class="sv-reactions">';
    reactions.forEach(function (r) {
      if (!r) return;
      var count = r.count || 1;
      var emoji = r.emoji || {};
      var name = emoji.name || "emoji";
      var id = emoji.id;
      var me = r.me ? " me" : "";
      var inner;
      if (id) {
        var ext = emoji.animated ? "gif" : "png";
        inner = '<img src="https://cdn.discordapp.com/emojis/' + esc(id) + '.' + ext + '?size=32" alt=":' + esc(name) + ':" loading="lazy" referrerpolicy="no-referrer">';
      } else {
        inner = '<span class="sv-reaction-unicode">' + esc(name) + "</span>";
      }
      html += '<span class="sv-reaction' + me + '" title=":' + esc(name) + ':">' + inner + '<span class="sv-reaction-count">' + esc(String(count)) + "</span></span>";
    });
    return html + "</div>";
  }

  function renderReplyExact(message) {
    if (!message || !message.reference) return "";
    var reference = message.reference;
    var replyName = reference.authorName || reference.username || "message";
    var replyContent = reference.content || "";
    var msgId = reference.messageId || "";
    return '<div class="sv-reply-ref"' + (msgId ? ' data-jump-id="' + esc(msgId) + '"' : "") + '><div class="sv-reply-ref-bar"></div><div class="sv-reply-ref-body"><strong>' + esc(replyName) + "</strong>" + (replyContent ? '<span class="sv-reply-ref-text"> ' + esc(truncate(replyContent, 100)) + "</span>" : "") + "</div></div>";
  }

  function styleClass(style) {
    var s = Number(style);
    if (s === 1) return " primary";
    if (s === 3) return " success";
    if (s === 4) return " danger";
    if (s === 5) return " link";
    return " secondary";
  }
  function renderEmojiTiny(emoji) {
    if (!emoji) return "";
    if (emoji.id) {
      var ext = emoji.animated ? "gif" : "png";
      return '<img class="sv-btn-emoji" src="https://cdn.discordapp.com/emojis/' + esc(emoji.id) + '.' + ext + '?size=32" alt="" loading="lazy" referrerpolicy="no-referrer">';
    }
    if (emoji.name) return '<span class="sv-btn-emoji-u">' + esc(emoji.name) + "</span>";
    return "";
  }
  function renderComponentsExact(rows, messageId) {
    if (!Array.isArray(rows) || !rows.length) return "";
    var html = '<div class="sv-components">';
    rows.forEach(function (row) {
      var items = (row && row.components) || [];
      if (!items.length) return;
      html += '<div class="sv-component-row">';
      items.forEach(function (c) {
        if (!c) return;
        if (c.type === "button" || c.type === 2) {
          var label = c.label || (c.emoji && c.emoji.name) || "Button";
          var emojiHtml = renderEmojiTiny(c.emoji);
          var st = styleClass(c.style);
          if (c.url) {
            html += '<a class="sv-component-btn' + st + '" href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' + emojiHtml + esc(label) + "</a>";
          } else if (c.customId && !c.disabled) {
            html += '<button type="button" class="sv-component-btn' + st + '" data-component-custom-id="' + esc(c.customId) + '" data-component-message-id="' + esc(messageId || "") + '">' + emojiHtml + esc(label) + "</button>";
          } else {
            html += '<button type="button" class="sv-component-btn' + st + ' disabled" disabled title="Bot-only button">' + emojiHtml + esc(label) + "</button>";
          }
        } else if (c.type === "select" || c.type === 3 || (c.type >= 5 && c.type <= 8)) {
          html += '<div class="sv-component-select">' + esc(c.placeholder || "Select…") + "</div>";
        }
      });
      html += "</div>";
    });
    return html + "</div>";
  }

  function enhanceRenderedMessages() {
    var container = document.getElementById("sv-messages");
    if (!container) return;
    var list = window.lastMessages || [];
    container.querySelectorAll("article.sv-msg[data-message-id]").forEach(function (el) {
      var id = el.getAttribute("data-message-id");
      var msg = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && String(list[i].id) === String(id)) { msg = list[i]; break; }
      }
      if (msg && messageMentionsMe(msg)) el.classList.add("mention-me");
      if (msg && msg.reference) {
        var old = el.querySelector(".sv-reply-preview");
        var exact = renderReplyExact(msg);
        if (exact) {
          if (old) old.outerHTML = exact;
          else {
            var content = el.querySelector(".sv-msg-content");
            if (content) content.insertAdjacentHTML("beforebegin", exact);
          }
        }
      }
      if (msg && Array.isArray(msg.reactions) && msg.reactions.length && !el.querySelector(".sv-reactions")) {
        var body2 = el.querySelector(".sv-msg-body");
        if (body2) body2.insertAdjacentHTML("beforeend", renderReactions(msg.reactions));
      }
      if (msg && Array.isArray(msg.components) && msg.components.length) {
        var oldComp = el.querySelector(".sv-components");
        if (oldComp) oldComp.outerHTML = renderComponentsExact(msg.components, msg.id);
      }
    });
  }

  var unreadByChannel = {};
  function markChannelUnread(channelId) {
    if (!channelId) return;
    unreadByChannel[channelId] = true;
    paintChannelUnread();
  }
  function markChannelRead(channelId) {
    if (!channelId) return;
    delete unreadByChannel[channelId];
    paintChannelUnread();
  }
  function paintChannelUnread() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    list.querySelectorAll("[data-channel-id]").forEach(function (btn) {
      var id = btn.getAttribute("data-channel-id");
      var isUnread = !!unreadByChannel[id];
      btn.classList.toggle("unread", isUnread);
      var dot = btn.querySelector(".sv-unread-dot");
      if (isUnread && !dot) {
        var span = document.createElement("span");
        span.className = "sv-unread-dot";
        btn.appendChild(span);
      } else if (!isUnread && dot) dot.remove();
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
  function isOnlineish(status) {
    var s = statusClass(status);
    return s === "online" || s === "idle" || s === "dnd";
  }
  function topHoistRole(member, roleMap) {
    var ids = Array.isArray(member.roleIds) ? member.roleIds : [];
    var best = null;
    for (var i = 0; i < ids.length; i++) {
      var r = roleMap[String(ids[i])];
      if (!r || r.name === "@everyone") continue;
      if (!(r.hoist === true || r.hoist === 1)) continue;
      if (!best || (Number(r.position) || 0) > (Number(best.position) || 0)) best = r;
    }
    if (!best) {
      for (var j = 0; j < ids.length; j++) {
        var r2 = roleMap[String(ids[j])];
        if (!r2 || r2.name === "@everyone") continue;
        if (!best || (Number(r2.position) || 0) > (Number(best.position) || 0)) best = r2;
      }
    }
    return best;
  }
  function roleColorCss(role) {
    if (!role || role.color == null || role.color === 0 || role.color === "#000000") return "";
    if (typeof role.color === "number") return "#" + ("000000" + (role.color >>> 0).toString(16)).slice(-6);
    if (typeof role.color === "string" && role.color.charAt(0) === "#") return role.color;
    return "";
  }
  function defaultAvatar(id) {
    var n = 0;
    try { n = Number(String(id).slice(-4)) % 6; } catch (e) {}
    return "https://cdn.discordapp.com/embed/avatars/" + n + ".png";
  }
  function renderMemberRow(m, roleMap) {
    if (!m || !m.id) return "";
    var name = m.displayName || m.globalName || m.username || "User";
    var sub = m.username && m.username !== name ? "@" + m.username : "";
    var av = m.avatar || defaultAvatar(m.id);
    var st = statusClass(m.status);
    var top = topHoistRole(m, roleMap);
    var color = roleColorCss(top);
    var html = '<div class="sv-member-row" data-member-id="' + esc(m.id) + '">';
    html += '<div class="sv-member-av-wrap"><img class="sv-member-av" src="' + esc(av) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'"><span class="sv-status ' + st + '"></span></div>';
    html += '<div class="sv-member-info"><span class="sv-member-name"' + (color ? ' style="color:' + color + ' !important"' : "") + ">" + esc(name) + "</span>";
    if (m.bot) html += '<span class="sv-bot-badge">BOT</span>';
    if (sub) html += '<span class="sv-member-sub">' + esc(sub) + "</span>";
    html += "</div>";
    if (!m.bot) {
      html += '<button type="button" class="sv-member-punish sv-punish-btn" data-punish-user="' + esc(m.id) + '" data-punish-name="' + esc(name) + '" data-punish-msg="">Punish</button>';
    }
    return html + "</div>";
  }
  function renderMembersDiscordStyle(members, meta) {
    members = members || [];
    meta = meta || {};
    var listEl = document.getElementById("sv-member-list");
    if (!listEl) return;
    if (!members.length) {
      listEl.innerHTML = '<p class="sv-empty"><strong>No members returned</strong><br>Check Server Members Intent + DISCORD_BOT_TOKEN.</p>';
      return;
    }
    var roleMap = {};
    var roles = Array.isArray(window.rolesCache) ? window.rolesCache.slice() : [];
    roles.forEach(function (r) { if (r && r.id) roleMap[String(r.id)] = r; });
    var online = [];
    var offline = [];
    members.forEach(function (m) {
      if (!m) return;
      if (isOnlineish(m.status)) online.push(m);
      else offline.push(m);
    });
    var anyStatus = members.some(function (m) { return m && m.status; });
    if (!anyStatus) { online = members.slice(); offline = []; }

    function groupByRole(list) {
      var groups = {};
      var order = [];
      list.forEach(function (m) {
        var top = topHoistRole(m, roleMap);
        var key = top ? String(top.id) : "_online";
        if (!groups[key]) { groups[key] = { role: top, members: [] }; order.push(key); }
        groups[key].members.push(m);
      });
      order.forEach(function (k) {
        groups[k].members.sort(function (a, b) {
          var an = (a.displayName || a.username || "").toLowerCase();
          var bn = (b.displayName || b.username || "").toLowerCase();
          return an < bn ? -1 : an > bn ? 1 : 0;
        });
      });
      order.sort(function (a, b) {
        if (a === "_online") return 1;
        if (b === "_online") return -1;
        var ra = groups[a].role, rb = groups[b].role;
        return (Number(rb && rb.position) || 0) - (Number(ra && ra.position) || 0);
      });
      return { groups: groups, order: order };
    }

    var html = "";
    var onlineGrouped = groupByRole(online);
    onlineGrouped.order.forEach(function (key) {
      var g = onlineGrouped.groups[key];
      var title = key === "_online" ? "ONLINE — " + g.members.length : ((g.role && g.role.name) || "ROLE") + " — " + g.members.length;
      html += '<div class="sv-ml-group">' + esc(title) + "</div>";
      g.members.forEach(function (m) { html += renderMemberRow(m, roleMap); });
    });
    if (offline.length) {
      offline.sort(function (a, b) {
        var an = (a.displayName || a.username || "").toLowerCase();
        var bn = (b.displayName || b.username || "").toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
      html += '<div class="sv-ml-group">OFFLINE — ' + offline.length + "</div>";
      offline.forEach(function (m) { html += renderMemberRow(m, roleMap); });
    }
    listEl.innerHTML = html;
    listEl.style.display = "block";
    listEl.style.visibility = "visible";
  }

  function bindComponentClicks() {
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-component-custom-id]") : null;
      if (!btn) return;
      e.preventDefault();
      var customId = btn.getAttribute("data-component-custom-id");
      var messageId = btn.getAttribute("data-component-message-id");
      var guildId = (window.selectedServer && window.selectedServer.id) || window.__svGuildId || "";
      var channelId = null;
      var active = document.querySelector("#sv-channel-list .sv-ch.active");
      if (active) channelId = active.getAttribute("data-channel-id");
      btn.disabled = true;
      fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "component", guildId: guildId, channelId: channelId, messageId: messageId, customId: customId })
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.error) alert(data.error || "Button interaction failed");
        })
        .catch(function () { alert("Button interaction failed — bot needs dashboard component support"); })
        .finally(function () { btn.disabled = false; });
    });
  }

  function bindSlashHelper() {
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
        return '<button type="button" class="sv-slash-item" data-slash="/' + esc(c.name) + '"><strong>/' + esc(c.name) + "</strong><span>" + esc(c.desc || "") + "</span></button>";
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

  function injectCss() {
    if (document.getElementById("sv-discord-exact-css")) return;
    var css = document.createElement("style");
    css.id = "sv-discord-exact-css";
    css.textContent = [
      "#server-view .sv-reply-ref{display:flex;align-items:center;gap:6px;margin:0 0 2px;max-width:100%;cursor:pointer}",
      "#server-view .sv-reply-ref-bar{width:2px;align-self:stretch;min-height:16px;background:#4e5058;border-radius:1px;margin-left:18px;position:relative}",
      "#server-view .sv-reply-ref-bar::before{content:'';position:absolute;left:0;top:-6px;width:12px;height:8px;border-left:2px solid #4e5058;border-top:2px solid #4e5058;border-top-left-radius:4px}",
      "#server-view .sv-reply-ref-body{font-size:12px;color:#b5bac1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#server-view .sv-reply-ref-body strong{color:#c4c9ce;font-weight:500}",
      "#server-view .sv-reply-ref:hover .sv-reply-ref-body strong{color:#fff}",
      "#server-view .sv-msg.mention-me{background:rgba(240,178,50,.08)!important;box-shadow:inset 2px 0 0 #f0b232}",
      "#server-view .sv-reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}",
      "#server-view .sv-reaction{display:inline-flex;align-items:center;gap:4px;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;padding:2px 6px;font-size:12px;color:#dbdee1;line-height:1.2}",
      "#server-view .sv-reaction.me{background:rgba(88,101,242,.25);border-color:rgba(88,101,242,.5)}",
      "#server-view .sv-reaction img{width:16px;height:16px;vertical-align:middle}",
      "#server-view .sv-component-btn.primary{background:#5865f2;color:#fff}",
      "#server-view .sv-component-btn.success{background:#248046;color:#fff}",
      "#server-view .sv-component-btn.danger{background:#da373c;color:#fff}",
      "#server-view .sv-component-btn.secondary{background:#4e5058;color:#fff}",
      "#server-view .sv-component-btn.link{background:transparent;color:#00a8fc;text-decoration:underline}",
      "#server-view .sv-btn-emoji{width:16px;height:16px;margin-right:4px;vertical-align:-3px}",
      "#server-view .sv-ch.unread .sv-ch-label{color:#f2f3f5;font-weight:600}",
      "#server-view .sv-unread-dot{width:8px;height:8px;border-radius:50%;background:#f2f3f5;margin-left:auto;flex-shrink:0}",
      "#sv-member-list .sv-ml-group{margin:12px 8px 4px;font-size:11px;font-weight:700;letter-spacing:.02em;color:#949ba4;text-transform:uppercase}",
      "#sv-member-list .sv-status{position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;border:2px solid #2b2d31;background:#80848e}",
      "#sv-member-list .sv-status.online{background:#23a559}",
      "#sv-member-list .sv-status.idle{background:#f0b232}",
      "#sv-member-list .sv-status.dnd{background:#f23f43}",
      "#sv-member-list .sv-status.offline{background:#80848e}",
      "#sv-member-list .sv-member-av-wrap{position:relative;width:32px;height:32px;flex-shrink:0}",
      ".sv-slash-help{display:flex;flex-direction:column;gap:2px;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;padding:6px;margin-bottom:6px;max-height:180px;overflow:auto}",
      ".sv-slash-item{display:flex;gap:10px;align-items:center;border:0;background:transparent;color:#dbdee1;text-align:left;padding:6px 8px;border-radius:4px;cursor:pointer;font:inherit}",
      ".sv-slash-item:hover{background:rgba(79,84,92,.4)}",
      ".sv-slash-item strong{color:#fff;min-width:90px}",
      ".sv-slash-item span{color:#b5bac1;font-size:12px}"
    ].join("\n");
    document.head.appendChild(css);
  }

  function boot() {
    injectCss();
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("[data-channel-id]") : null;
      if (btn) markChannelRead(btn.getAttribute("data-channel-id"));
    }, true);
    bindComponentClicks();
    bindSlashHelper();
    window.__svRenderMembersDiscord = renderMembersDiscordStyle;
    window.__svMarkChannelUnread = markChannelUnread;
    window.__svMarkChannelRead = markChannelRead;
    window.__svRenderReactions = renderReactions;
    window.__svRenderReplyExact = renderReplyExact;
    setInterval(function () {
      enhanceRenderedMessages();
      var el = document.getElementById("sv-member-list");
      if (el && Array.isArray(window.membersCache) && window.membersCache.length) {
        if (el.dataset.discordGrouped !== "1") {
          el.dataset.discordGrouped = "1";
          renderMembersDiscordStyle(window.membersCache, {});
        }
      }
    }, 2000);
    document.addEventListener("click", function (e) {
      var tab = e.target && e.target.closest ? e.target.closest("[data-sv-tab]") : null;
      if (tab && tab.getAttribute("data-sv-tab") === "members") {
        setTimeout(function () {
          if (Array.isArray(window.membersCache)) {
            var el = document.getElementById("sv-member-list");
            if (el) el.dataset.discordGrouped = "";
            renderMembersDiscordStyle(window.membersCache, {});
          }
        }, 500);
      }
    }, true);
    console.log("[sv-discord-exact] v1 online");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
