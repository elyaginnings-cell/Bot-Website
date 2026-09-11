/**
 * Phase 0 finish pack — Discord fidelity leftovers:
 * - Markdown in message content
 * - Custom guild emoji in messages + picker + reactions
 * - Date separators
 * - Collapsible channel categories
 * - Avatar → mini profile popover
 * - Delete message (staff) in context menu
 */
(function () {
  "use strict";
  if (window.__svPhase0V1) return;
  window.__svPhase0V1 = true;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;");
  }

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

  function injectCss() {
    if (document.getElementById("sv-phase0-css")) return;
    var s = document.createElement("style");
    s.id = "sv-phase0-css";
    s.textContent = [
      "#server-view .sv-msg-content .sv-md-bold{font-weight:700}",
      "#server-view .sv-msg-content .sv-md-italic{font-style:italic}",
      "#server-view .sv-msg-content .sv-md-strike{text-decoration:line-through}",
      "#server-view .sv-msg-content .sv-md-underline{text-decoration:underline}",
      "#server-view .sv-msg-content .sv-md-code{font-family:Consolas,Monaco,monospace;background:#1e1f22;padding:1px 4px;border-radius:4px;font-size:.9em}",
      "#server-view .sv-msg-content .sv-md-pre{display:block;background:#1e1f22;padding:8px;border-radius:6px;overflow-x:auto;margin:6px 0;font-family:Consolas,Monaco,monospace;font-size:13px;white-space:pre-wrap}",
      "#server-view .sv-msg-content .sv-md-spoiler{background:#111214;color:transparent;border-radius:4px;cursor:pointer;padding:0 2px;transition:color .15s,background .15s}",
      "#server-view .sv-msg-content .sv-md-spoiler.revealed{background:rgba(255,255,255,.08);color:inherit}",
      "#server-view .sv-msg-content .sv-md-quote{border-left:3px solid #4e5058;padding-left:10px;margin:4px 0;color:#b5bac1}",
      "#server-view .sv-msg-content img.sv-custom-emoji{width:22px;height:22px;vertical-align:-5px;object-fit:contain}",
      "#server-view .sv-msg-content img.sv-custom-emoji.jumbo{width:48px;height:48px;vertical-align:middle}",
      "#server-view .sv-date-sep{display:flex;align-items:center;gap:10px;margin:16px 8px 8px;color:#949ba4;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.02em}",
      "#server-view .sv-date-sep::before,#server-view .sv-date-sep::after{content:'';flex:1;height:1px;background:#3f4147}",
      "#server-view .sv-cat{cursor:pointer;user-select:none;display:flex;align-items:center;gap:4px;padding:12px 8px 4px;font-size:12px;font-weight:700;color:#949ba4;text-transform:uppercase;letter-spacing:.02em}",
      "#server-view .sv-cat:hover{color:#dbdee1}",
      "#server-view .sv-cat .sv-cat-chevron{display:inline-block;width:12px;font-size:10px;transition:transform .15s}",
      "#server-view .sv-cat.collapsed .sv-cat-chevron{transform:rotate(-90deg)}",
      "#server-view .sv-ch.sv-cat-hidden{display:none!important}",
      "#sv-profile-pop{position:fixed;z-index:100080;width:min(300px,92vw);background:#111214;border:1px solid #1e1f22;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.55);overflow:hidden}",
      "#sv-profile-pop[hidden]{display:none!important}",
      "#sv-profile-pop .sv-pp-banner{height:60px;background:linear-gradient(135deg,#5865f2,#3ba55d)}",
      "#sv-profile-pop .sv-pp-body{padding:12px 14px 14px;position:relative}",
      "#sv-profile-pop .sv-pp-av{width:72px;height:72px;border-radius:50%;border:6px solid #111214;margin-top:-42px;background:#2b2d31;object-fit:cover}",
      "#sv-profile-pop .sv-pp-name{font-size:18px;font-weight:700;color:#f2f3f5;margin-top:6px}",
      "#sv-profile-pop .sv-pp-sub{font-size:13px;color:#b5bac1;margin-bottom:10px}",
      "#sv-profile-pop .sv-pp-roles{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}",
      "#sv-profile-pop .sv-pp-role{font-size:11px;padding:2px 8px;border-radius:4px;background:#2b2d31;color:#dbdee1;border-left:3px solid #5865f2}",
      "#sv-profile-pop .sv-pp-actions{display:flex;gap:8px}",
      "#sv-profile-pop .sv-pp-actions button{flex:1;border:0;border-radius:8px;padding:10px;background:#2b2d31;color:#dbdee1;cursor:pointer;font-size:13px;font-weight:600}",
      "#sv-profile-pop .sv-pp-actions button.danger{background:rgba(237,66,69,.2);color:#ed4245}",
      "#sv-emoji-panel .sv-emoji-cell img.sv-ce{width:28px;height:28px;object-fit:contain}",
      "#sv-reaction-picker button img{width:22px;height:22px;vertical-align:middle}",
    ].join("\n");
    document.head.appendChild(s);
  }

  /* ---------- custom emoji cache ---------- */
  function loadGuildEmojis(done) {
    var gid = guildId();
    if (!gid) {
      if (done) done([]);
      return;
    }
    if (Array.isArray(window.emojisCache) && window.__svEmojisGuild === gid) {
      if (done) done(window.emojisCache);
      return;
    }
    fetch("/api/guilds?resource=meta&guildId=" + encodeURIComponent(gid) + "&_=" + Date.now(), {
      credentials: "include",
      cache: "no-store",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && Array.isArray(d.roles)) window.rolesCache = d.roles;
        if (d && Array.isArray(d.emojis)) {
          window.emojisCache = d.emojis;
          window.__svEmojisGuild = gid;
        }
        if (done) done(window.emojisCache || []);
      })
      .catch(function () {
        if (done) done([]);
      });
  }

  function emojiUrl(e) {
    if (!e) return "";
    if (e.url) return e.url;
    if (e.id) {
      return (
        "https://cdn.discordapp.com/emojis/" +
        e.id +
        "." +
        (e.animated ? "gif" : "png") +
        "?size=48"
      );
    }
    return "";
  }

  function proxyMaybe(url) {
    if (!url) return url;
    if (window.__svProxyMedia) return window.__svProxyMedia(url);
    if (url.indexOf("cdn.discordapp.com") !== -1) {
      return "/api/messages?resource=media&url=" + encodeURIComponent(url);
    }
    return url;
  }

  /* ---------- markdown + custom emoji in content ---------- */
  function formatContent(raw) {
    if (raw == null) return "";
    var text = String(raw);
    // Escape HTML first
    text = esc(text);

    // Code blocks ```
    text = text.replace(/```([\s\S]*?)```/g, function (_, code) {
      return '<span class="sv-md-pre">' + code + "</span>";
    });
    // Inline code
    text = text.replace(/`([^`\n]+)`/g, '<span class="sv-md-code">$1</span>');
    // Spoilers ||text||
    text = text.replace(
      /\|\|([\s\S]+?)\|\|/g,
      '<span class="sv-md-spoiler" title="Click to reveal">$1</span>'
    );
    // Bold ** ** or __ __
    text = text.replace(/\*\*([^*]+)\*\*/g, '<span class="sv-md-bold">$1</span>');
    text = text.replace(/__([^_]+)__/g, '<span class="sv-md-underline">$1</span>');
    // Italic * * or _ _
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<span class="sv-md-italic">$2</span>');
    text = text.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<span class="sv-md-italic">$2</span>');
    // Strike ~~
    text = text.replace(/~~([^~]+)~~/g, '<span class="sv-md-strike">$1</span>');
    // Quotes at line start
    text = text.replace(/(^|\n)&gt;\s?(.+)/g, '$1<span class="sv-md-quote">$2</span>');
    // Custom emoji <:name:id> or <a:name:id>
    text = text.replace(/&lt;(a)?:([\w]+):(\d+)&gt;/g, function (_, anim, name, id) {
      var ext = anim ? "gif" : "png";
      var url = proxyMaybe(
        "https://cdn.discordapp.com/emojis/" + id + "." + ext + "?size=48"
      );
      return (
        '<img class="sv-custom-emoji" src="' +
        esc(url) +
        '" alt=":' +
        esc(name) +
        ':" title=":' +
        esc(name) +
        ':" loading="lazy">'
      );
    });
    // Mentions <@id>
    text = text.replace(
      /&lt;@!?(\d+)&gt;/g,
      '<span class="sv-mention" style="background:rgba(88,101,242,.3);color:#dee0fc;border-radius:3px;padding:0 2px">@user</span>'
    );
    // Role mentions
    text = text.replace(
      /&lt;@&amp;(\d+)&gt;/g,
      '<span class="sv-mention" style="background:rgba(88,101,242,.3);color:#dee0fc;border-radius:3px;padding:0 2px">@role</span>'
    );
    // Channels
    text = text.replace(
      /&lt;#(\d+)&gt;/g,
      '<span class="sv-mention" style="background:rgba(88,101,242,.3);color:#dee0fc;border-radius:3px;padding:0 2px">#channel</span>'
    );
    // Newlines
    text = text.replace(/\n/g, "<br>");
    return text;
  }

  function enhanceMessageContent() {
    document.querySelectorAll("#sv-messages .sv-msg-content").forEach(function (el) {
      if (el.dataset.mdDone === "1") return;
      // Prefer original text if stored; else use textContent (already may be escaped plain)
      var raw = el.getAttribute("data-raw") || el.textContent || "";
      // If content already has HTML from server (attachments handled elsewhere), only format if plain
      if (el.querySelector("img, a, button, .sv-md-code")) {
        el.dataset.mdDone = "1";
        return;
      }
      el.innerHTML = formatContent(raw);
      el.dataset.mdDone = "1";
    });
  }

  // Spoiler reveal
  document.addEventListener(
    "click",
    function (e) {
      var sp = e.target.closest ? e.target.closest(".sv-md-spoiler") : null;
      if (sp) {
        e.preventDefault();
        sp.classList.toggle("revealed");
      }
    },
    true
  );

  /* ---------- date separators ---------- */
  function dayKey(d) {
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function dayLabel(d) {
    var now = new Date();
    var today = dayKey(now);
    var yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    var k = dayKey(d);
    if (k === today) return "Today";
    if (k === dayKey(yest)) return "Yesterday";
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  function injectDateSeparators() {
    var box = document.getElementById("sv-messages");
    if (!box) return;
    // Remove old seps
    box.querySelectorAll(".sv-date-sep").forEach(function (n) {
      n.remove();
    });
    var msgs = box.querySelectorAll("article.sv-msg");
    var lastKey = "";
    msgs.forEach(function (art) {
      var t = art.querySelector("time.sv-time");
      var ts = t && (t.getAttribute("datetime") || t.textContent);
      var d = ts ? new Date(ts) : null;
      if (!d || isNaN(d.getTime())) {
        // try data attribute
        var mid = art.getAttribute("data-message-id");
        // snowflake timestamp
        if (mid && /^\d+$/.test(mid)) {
          try {
            d = new Date(Number((BigInt(mid) >> 22n) + 1420070400000n));
          } catch (e) {
            d = null;
          }
        }
      }
      if (!d || isNaN(d.getTime())) return;
      var k = dayKey(d);
      if (k !== lastKey) {
        lastKey = k;
        var sep = document.createElement("div");
        sep.className = "sv-date-sep";
        sep.textContent = dayLabel(d);
        art.parentNode.insertBefore(sep, art);
      }
    });
  }

  /* ---------- collapsible categories ---------- */
  function bindCategories() {
    var list = document.getElementById("sv-channel-list");
    if (!list || list.dataset.catBound === "1") return;
    list.dataset.catBound = "1";

    list.addEventListener("click", function (e) {
      var cat = e.target.closest ? e.target.closest(".sv-cat") : null;
      if (!cat) return;
      e.preventDefault();
      cat.classList.toggle("collapsed");
      var collapsed = cat.classList.contains("collapsed");
      var el = cat.nextElementSibling;
      while (el && !el.classList.contains("sv-cat")) {
        if (el.classList.contains("sv-ch")) {
          el.classList.toggle("sv-cat-hidden", collapsed);
        }
        el = el.nextElementSibling;
      }
    });
  }

  function decorateCategories() {
    document.querySelectorAll("#sv-channel-list .sv-cat").forEach(function (cat) {
      if (cat.querySelector(".sv-cat-chevron")) return;
      var ch = document.createElement("span");
      ch.className = "sv-cat-chevron";
      ch.textContent = "\u25BC";
      cat.insertBefore(ch, cat.firstChild);
    });
  }

  /* ---------- profile popover ---------- */
  function closeProfile() {
    var p = document.getElementById("sv-profile-pop");
    if (p) p.hidden = true;
  }

  function roleColorCss(role) {
    if (!role || role.color == null || role.color === 0) return "#5865f2";
    if (typeof role.color === "number") {
      return "#" + ("000000" + (role.color >>> 0).toString(16)).slice(-6);
    }
    if (typeof role.color === "string" && role.color.charAt(0) === "#") return role.color;
    return "#5865f2";
  }

  function openProfile(userId, x, y) {
    var members = Array.isArray(window.membersCache) ? window.membersCache : [];
    var m = null;
    for (var i = 0; i < members.length; i++) {
      if (String(members[i].id) === String(userId)) {
        m = members[i];
        break;
      }
    }
    var rolesMap = {};
    (window.rolesCache || []).forEach(function (r) {
      if (r && r.id) rolesMap[String(r.id)] = r;
    });

    var pop = document.getElementById("sv-profile-pop");
    if (!pop) {
      pop = document.createElement("div");
      pop.id = "sv-profile-pop";
      document.body.appendChild(pop);
    }

    var name = (m && (m.displayName || m.globalName || m.username)) || "User";
    var sub = m && m.username ? "@" + m.username : "ID " + userId;
    var av =
      (m && m.avatar) ||
      "https://cdn.discordapp.com/embed/avatars/" +
        (Number(String(userId).slice(-4)) % 6) +
        ".png";
    av = proxyMaybe(av);

    var roleIds = (m && (m.roleIds || m.roles)) || [];
    var roleHtml = "";
    roleIds.forEach(function (rid) {
      var id = rid && rid.id ? rid.id : rid;
      var r = rolesMap[String(id)];
      if (!r || r.name === "@everyone") return;
      roleHtml +=
        '<span class="sv-pp-role" style="border-left-color:' +
        roleColorCss(r) +
        '">' +
        esc(r.name) +
        "</span>";
    });
    if (!roleHtml) roleHtml = '<span class="sv-pp-sub">No roles loaded</span>';

    var status = (m && m.status) || "";
    var statusLine = status
      ? '<div class="sv-pp-sub">Status: ' + esc(status) + "</div>"
      : "";

    pop.innerHTML =
      '<div class="sv-pp-banner"></div><div class="sv-pp-body">' +
      '<img class="sv-pp-av" src="' +
      esc(av) +
      '" alt="">' +
      '<div class="sv-pp-name">' +
      esc(name) +
      "</div>" +
      '<div class="sv-pp-sub">' +
      esc(sub) +
      "</div>" +
      statusLine +
      '<div class="sv-pp-roles">' +
      roleHtml +
      "</div>" +
      '<div class="sv-pp-actions">' +
      '<button type="button" data-pp="mention">@ Mention</button>' +
      (m && m.bot
        ? ""
        : '<button type="button" class="danger" data-pp="punish">Punish</button>') +
      "</div></div>";

    pop.dataset.userId = String(userId);
    pop.dataset.userName = name;
    pop.hidden = false;

    var left = Math.max(8, Math.min(x || 40, window.innerWidth - 320));
    var top = Math.max(8, Math.min(y || 40, window.innerHeight - 360));
    pop.style.left = left + "px";
    pop.style.top = top + "px";

    pop.onclick = function (e) {
      var b = e.target.closest ? e.target.closest("[data-pp]") : null;
      if (!b) return;
      var act = b.getAttribute("data-pp");
      if (act === "mention") {
        var input = document.getElementById("sv-input");
        if (input) {
          input.value += (input.value && !/\s$/.test(input.value) ? " " : "") + "<@" + userId + "> ";
          input.focus();
        }
        closeProfile();
      } else if (act === "punish") {
        closeProfile();
        if (typeof window.__svOpenPunish === "function") {
          window.__svOpenPunish(userId, name, "");
        } else if (typeof window.openPunishModal === "function") {
          window.openPunishModal({ userId: userId, userName: name });
        }
      }
    };
  }

  document.addEventListener(
    "click",
    function (e) {
      var av = e.target.closest
        ? e.target.closest("#sv-messages .sv-av, #sv-messages .sv-av-wrap, #sv-member-list .sv-member-av")
        : null;
      if (av) {
        var art = av.closest("article.sv-msg, .sv-member-row");
        var uid =
          (art && (art.getAttribute("data-author-id") || art.getAttribute("data-member-id"))) || "";
        if (uid) {
          e.preventDefault();
          e.stopPropagation();
          openProfile(uid, e.clientX || 40, e.clientY || 40);
          return;
        }
      }
      var pop = document.getElementById("sv-profile-pop");
      if (pop && !pop.hidden && !pop.contains(e.target)) closeProfile();
    },
    true
  );

  /* ---------- custom emoji in picker ---------- */
  function injectCustomEmojiTab() {
    var tabs = document.querySelector("#sv-emoji-panel .sv-emoji-tabs");
    if (!tabs) return;
    if (tabs.querySelector('[data-cat="server"]')) return;
    var t = document.createElement("button");
    t.type = "button";
    t.className = "sv-emoji-tab";
    t.setAttribute("data-cat", "server");
    t.title = "Server emoji";
    t.textContent = "Server";
    // insert after favorites if present
    var fav = tabs.querySelector('[data-cat="emoji-favs"]');
    if (fav && fav.nextSibling) tabs.insertBefore(t, fav.nextSibling);
    else tabs.appendChild(t);

    tabs.addEventListener("click", function (e) {
      var hit = e.target.closest ? e.target.closest('[data-cat="server"]') : null;
      if (!hit) return;
      e.stopPropagation();
      renderServerEmojiGrid();
    });
  }

  function renderServerEmojiGrid() {
    var grid = document.getElementById("sv-emoji-grid");
    if (!grid) return;
    grid.classList.remove("gif-mode");
    grid.dataset.mode = "server";
    loadGuildEmojis(function (list) {
      var html = '<div class="sv-emoji-label">Server emoji</div>';
      if (!list.length) {
        html += '<div class="sv-emoji-hint">No custom emoji (or still loading)</div>';
      } else {
        list.forEach(function (em) {
          var url = proxyMaybe(emojiUrl(em));
          var token = em.animated
            ? "<a:" + em.name + ":" + em.id + ">"
            : "<:" + em.name + ":" + em.id + ">";
          html +=
            '<button type="button" class="sv-emoji-cell" data-emoji="' +
            esc(token) +
            '" title=":' +
            esc(em.name) +
            ':">' +
            '<img class="sv-ce" src="' +
            esc(url) +
            '" alt=":' +
            esc(em.name) +
            ':" loading="lazy">' +
            "</button>";
        });
      }
      grid.innerHTML = html;
      document.querySelectorAll("#sv-emoji-panel .sv-emoji-tab").forEach(function (t) {
        t.classList.toggle("active", t.getAttribute("data-cat") === "server");
      });
    });
  }

  // Patch reaction picker to include custom emoji
  var _openReact = window.__svOpenReactPicker;
  window.__svOpenReactPicker = function (messageId, x, y) {
    loadGuildEmojis(function (list) {
      if (typeof _openReact === "function") _openReact(messageId, x, y);
      else if (typeof window.__svAddReaction === "function") {
        /* fallback */
      }
      setTimeout(function () {
        var picker = document.getElementById("sv-reaction-picker");
        if (!picker || !list.length) return;
        list.slice(0, 24).forEach(function (em) {
          var btn = document.createElement("button");
          btn.type = "button";
          var token = em.animated
            ? "<a:" + em.name + ":" + em.id + ">"
            : "<:" + em.name + ":" + em.id + ">";
          // Discord reaction API wants name:id for custom
          btn.setAttribute("data-emoji", em.name + ":" + em.id);
          btn.title = ":" + em.name + ":";
          btn.innerHTML =
            '<img src="' + esc(proxyMaybe(emojiUrl(em))) + '" alt="">';
          picker.appendChild(btn);
        });
      }, 40);
    });
  };

  /* ---------- delete message ---------- */
  function deleteMessage(messageId) {
    var cid = channelId();
    var gid = guildId();
    if (!cid || !messageId) return;
    if (!confirm("Delete this message?")) return;
    fetch("/api/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        action: "delete",
        guildId: gid,
        channelId: cid,
        messageId: messageId,
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { ok: r.ok, d: d };
        });
      })
      .then(function (x) {
        if (!x.ok) {
          alert(x.d.error || "Delete failed — bot needs Manage Messages");
          return;
        }
        var art = document.querySelector(
          'article.sv-msg[data-message-id="' + messageId + '"]'
        );
        if (art) art.remove();
      })
      .catch(function (err) {
        alert(err.message || "Delete failed");
      });
  }

  function ensureDeleteInMenu() {
    var m = document.getElementById("sv-msg-menu");
    if (!m) return;
    if (m.querySelector('[data-act="delete"]')) return;
    var sep = document.createElement("div");
    sep.className = "sv-menu-sep";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-act", "delete");
    btn.textContent = "Delete message";
    btn.style.color = "#ed4245";
    m.appendChild(sep);
    m.appendChild(btn);
    m.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest('[data-act="delete"]') : null;
      if (!b) return;
      var mid = m.dataset.messageId || "";
      deleteMessage(mid);
    });
  }

  /* ---------- delete API note: handled client-side; server needs action=delete ---------- */

  function tick() {
    injectCss();
    enhanceMessageContent();
    injectDateSeparators();
    bindCategories();
    decorateCategories();
    injectCustomEmojiTab();
    ensureDeleteInMenu();
  }

  // Observe message list
  function observe() {
    var box = document.getElementById("sv-messages");
    if (!box || box.dataset.p0Obs) return;
    box.dataset.p0Obs = "1";
    var obs = new MutationObserver(function () {
      enhanceMessageContent();
      injectDateSeparators();
    });
    obs.observe(box, { childList: true, subtree: true });
  }

  function boot() {
    injectCss();
    loadGuildEmojis();
    tick();
    observe();
    setInterval(function () {
      var view = document.getElementById("server-view");
      if (view && !view.hidden) {
        tick();
        observe();
      }
    }, 3000);
    console.log("[sv-phase0] finish pack v1");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
