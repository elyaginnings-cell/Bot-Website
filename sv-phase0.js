/**
 * Phase 0 finish pack v2
 * - No MutationObserver infinite loop (was freezing mobile + blocking messages)
 * - Scrollable profile popover
 * - Safer click handling (no capture steal)
 */
(function () {
  "use strict";
  if (window.__svPhase0V2) return;
  window.__svPhase0V2 = true;

  var busy = false;
  var lastMsgFingerprint = "";

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
    var old = document.getElementById("sv-phase0-css");
    if (old) old.remove();
    var s = document.createElement("style");
    s.id = "sv-phase0-css";
    s.textContent = [
      "#server-view .sv-msg-content .sv-md-bold{font-weight:700}",
      "#server-view .sv-msg-content .sv-md-italic{font-style:italic}",
      "#server-view .sv-msg-content .sv-md-strike{text-decoration:line-through}",
      "#server-view .sv-msg-content .sv-md-underline{text-decoration:underline}",
      "#server-view .sv-msg-content .sv-md-code{font-family:Consolas,Monaco,monospace;background:#1e1f22;padding:1px 4px;border-radius:4px;font-size:.9em}",
      "#server-view .sv-msg-content .sv-md-pre{display:block;background:#1e1f22;padding:8px;border-radius:6px;overflow-x:auto;margin:6px 0;font-family:Consolas,Monaco,monospace;font-size:13px;white-space:pre-wrap}",
      "#server-view .sv-msg-content .sv-md-spoiler{background:#111214;color:transparent;border-radius:4px;cursor:pointer;padding:0 2px}",
      "#server-view .sv-msg-content .sv-md-spoiler.revealed{background:rgba(255,255,255,.08);color:inherit}",
      "#server-view .sv-msg-content .sv-md-quote{border-left:3px solid #4e5058;padding-left:10px;margin:4px 0;color:#b5bac1}",
      "#server-view .sv-msg-content img.sv-custom-emoji{width:22px;height:22px;vertical-align:-5px;object-fit:contain}",
      "#server-view .sv-date-sep{display:flex;align-items:center;gap:10px;margin:16px 8px 8px;color:#949ba4;font-size:12px;font-weight:600;text-transform:uppercase}",
      "#server-view .sv-date-sep::before,#server-view .sv-date-sep::after{content:'';flex:1;height:1px;background:#3f4147}",
      "#server-view .sv-cat{cursor:pointer;user-select:none;display:flex;align-items:center;gap:4px;padding:12px 8px 4px;font-size:12px;font-weight:700;color:#949ba4;text-transform:uppercase;-webkit-tap-highlight-color:transparent}",
      "#server-view .sv-cat .sv-cat-chevron{display:inline-block;width:12px;font-size:10px}",
      "#server-view .sv-cat.collapsed .sv-cat-chevron{transform:rotate(-90deg)}",
      "#server-view .sv-ch.sv-cat-hidden{display:none!important}",
      "#server-view img.sv-av,#server-view .sv-member-av{cursor:pointer}",
      /* Profile — scrollable, never off-screen */
      "#sv-profile-pop{position:fixed;z-index:100080;width:min(300px,92vw);max-height:min(80vh,520px);background:#111214;border:1px solid #1e1f22;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.55);overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch}",
      "#sv-profile-pop[hidden]{display:none!important}",
      "#sv-profile-pop .sv-pp-banner{height:60px;background:linear-gradient(135deg,#5865f2,#3ba55d);flex-shrink:0}",
      "#sv-profile-pop .sv-pp-body{padding:12px 14px 14px}",
      "#sv-profile-pop .sv-pp-av{width:72px;height:72px;border-radius:50%;border:6px solid #111214;margin-top:-42px;background:#2b2d31;object-fit:cover}",
      "#sv-profile-pop .sv-pp-name{font-size:18px;font-weight:700;color:#f2f3f5;margin-top:6px}",
      "#sv-profile-pop .sv-pp-sub{font-size:13px;color:#b5bac1;margin-bottom:10px}",
      "#sv-profile-pop .sv-pp-roles{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}",
      "#sv-profile-pop .sv-pp-role{font-size:11px;padding:2px 8px;border-radius:4px;background:#2b2d31;color:#dbdee1;border-left:3px solid #5865f2}",
      "#sv-profile-pop .sv-pp-actions{display:flex;gap:8px;position:sticky;bottom:0;background:#111214;padding-top:8px}",
      "#sv-profile-pop .sv-pp-actions button{flex:1;border:0;border-radius:8px;padding:12px;background:#2b2d31;color:#dbdee1;cursor:pointer;font-size:13px;font-weight:600;min-height:44px;touch-action:manipulation}",
      "#sv-profile-pop .sv-pp-actions button.danger{background:rgba(237,66,69,.2);color:#ed4245}",
      "#sv-emoji-panel .sv-emoji-cell img.sv-ce{width:28px;height:28px;object-fit:contain}",
      "#sv-reaction-picker button img{width:22px;height:22px;vertical-align:middle}",
      "@media (max-width:768px){",
      "  #sv-profile-pop{left:50%!important;transform:translateX(-50%);width:min(320px,94vw);max-height:min(75vh,520px);top:auto!important;bottom:max(12px,env(safe-area-inset-bottom))}",
      "}",
    ].join("\n");
    document.head.appendChild(s);
  }

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
    if (e.id)
      return (
        "https://cdn.discordapp.com/emojis/" +
        e.id +
        "." +
        (e.animated ? "gif" : "png") +
        "?size=48"
      );
    return "";
  }

  function proxyMaybe(url) {
    if (!url) return url;
    if (window.__svProxyMedia) return window.__svProxyMedia(url);
    if (url.indexOf("cdn.discordapp.com") !== -1)
      return "/api/messages?resource=media&url=" + encodeURIComponent(url);
    return url;
  }

  function formatContent(raw) {
    if (raw == null) return "";
    var text = esc(String(raw));
    text = text.replace(/```([\s\S]*?)```/g, function (_, code) {
      return '<span class="sv-md-pre">' + code + "</span>";
    });
    text = text.replace(/`([^`\n]+)`/g, '<span class="sv-md-code">$1</span>');
    text = text.replace(
      /\|\|([\s\S]+?)\|\|/g,
      '<span class="sv-md-spoiler" title="Click to reveal">$1</span>'
    );
    text = text.replace(/\*\*([^*]+)\*\*/g, '<span class="sv-md-bold">$1</span>');
    text = text.replace(/__([^_]+)__/g, '<span class="sv-md-underline">$1</span>');
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<span class="sv-md-italic">$2</span>');
    text = text.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<span class="sv-md-italic">$2</span>');
    text = text.replace(/~~([^~]+)~~/g, '<span class="sv-md-strike">$1</span>');
    text = text.replace(/(^|\n)>\s?(.+)/g, '$1<span class="sv-md-quote">$2</span>');
    text = text.replace(/<(a)?:([\w]+):(\d+)>/g, function (_, anim, name, id) {
      var url = proxyMaybe(
        "https://cdn.discordapp.com/emojis/" + id + "." + (anim ? "gif" : "png") + "?size=48"
      );
      return (
        '<img class="sv-custom-emoji" src="' +
        esc(url) +
        '" alt=":' +
        esc(name) +
        ':" title=":' +
        esc(name) +
        ':">' +
        ""
      );
    });
    text = text.replace(
      /<@!?(\d+)>/g,
      '<span class="sv-mention" style="background:rgba(88,101,242,.3);color:#dee0fc;border-radius:3px;padding:0 2px">@user</span>'
    );
    text = text.replace(
      /<@&(\d+)>/g,
      '<span class="sv-mention" style="background:rgba(88,101,242,.3);color:#dee0fc;border-radius:3px;padding:0 2px">@role</span>'
    );
    text = text.replace(
      /<#(\d+)>/g,
      '<span class="sv-mention" style="background:rgba(88,101,242,.3);color:#dee0fc;border-radius:3px;padding:0 2px">#channel</span>'
    );
    text = text.replace(/\n/g, "<br>");
    return text;
  }

  function enhanceMessageContent() {
    document.querySelectorAll("#sv-messages .sv-msg-content").forEach(function (el) {
      if (el.dataset.mdDone === "1") return;
      if (el.querySelector("img, a, button, .sv-md-code, .sv-md-pre")) {
        el.dataset.mdDone = "1";
        return;
      }
      var raw = el.getAttribute("data-raw") || el.textContent || "";
      try {
        el.innerHTML = formatContent(raw);
      } catch (err) {
        /* leave plain */
      }
      el.dataset.mdDone = "1";
    });
  }

  document.addEventListener("click", function (e) {
    var sp = e.target.closest ? e.target.closest(".sv-md-spoiler") : null;
    if (sp) {
      e.preventDefault();
      sp.classList.toggle("revealed");
    }
  });

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

  function snowflakeMs(id) {
    try {
      if (typeof BigInt === "function") {
        return Number(BigInt(id) / BigInt(4194304) + BigInt(1420070400000));
      }
    } catch (e) {}
    return null;
  }

  function msgFingerprint(box) {
    var ids = [];
    box.querySelectorAll("article.sv-msg[data-message-id]").forEach(function (a) {
      ids.push(a.getAttribute("data-message-id"));
    });
    return ids.join(",");
  }

  function injectDateSeparators() {
    var box = document.getElementById("sv-messages");
    if (!box) return;
    var fp = msgFingerprint(box);
    if (fp && fp === lastMsgFingerprint && box.querySelector(".sv-date-sep")) return;
    lastMsgFingerprint = fp;

    box.querySelectorAll(".sv-date-sep").forEach(function (n) {
      n.remove();
    });
    var msgs = box.querySelectorAll("article.sv-msg");
    var lastKey = "";
    msgs.forEach(function (art) {
      var d = null;
      var t = art.querySelector("time.sv-time");
      if (t) {
        var ts = t.getAttribute("datetime") || t.dateTime || t.textContent;
        d = new Date(ts);
        if (isNaN(d.getTime())) d = null;
      }
      if (!d) {
        var mid = art.getAttribute("data-message-id");
        if (mid && /^\d+$/.test(mid)) {
          var ms = snowflakeMs(mid);
          if (ms) d = new Date(ms);
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

  function bindCategories() {
    var list = document.getElementById("sv-channel-list");
    if (!list || list.dataset.catBound === "1") return;
    list.dataset.catBound = "1";
    list.addEventListener("click", function (e) {
      var cat = e.target.closest ? e.target.closest(".sv-cat") : null;
      if (!cat) return;
      // don't block channel buttons
      if (e.target.closest && e.target.closest(".sv-ch")) return;
      cat.classList.toggle("collapsed");
      var collapsed = cat.classList.contains("collapsed");
      var el = cat.nextElementSibling;
      while (el && !el.classList.contains("sv-cat")) {
        if (el.classList.contains("sv-ch")) el.classList.toggle("sv-cat-hidden", collapsed);
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

  function closeProfile() {
    var p = document.getElementById("sv-profile-pop");
    if (p) p.hidden = true;
  }

  function roleColorCss(role) {
    if (!role || role.color == null || role.color === 0) return "#5865f2";
    if (typeof role.color === "number")
      return "#" + ("000000" + (role.color >>> 0).toString(16)).slice(-6);
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

    var roleHtml = "";
    var roleIds = (m && (m.roleIds || m.roles)) || [];
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
    pop.hidden = false;

    var mobile = window.innerWidth < 768;
    if (mobile) {
      pop.style.left = "50%";
      pop.style.right = "auto";
      pop.style.top = "auto";
      pop.style.bottom = "max(12px, env(safe-area-inset-bottom))";
      pop.style.transform = "translateX(-50%)";
    } else {
      pop.style.transform = "";
      pop.style.bottom = "auto";
      var maxH = Math.min(window.innerHeight * 0.8, 520);
      var left = Math.max(8, Math.min(x || 40, window.innerWidth - 312));
      var top = Math.max(8, Math.min(y || 40, window.innerHeight - maxH - 8));
      pop.style.left = left + "px";
      pop.style.top = top + "px";
    }

    // scroll to top when opened
    pop.scrollTop = 0;

    pop.onclick = function (e) {
      var b = e.target.closest ? e.target.closest("[data-pp]") : null;
      if (!b) return;
      e.stopPropagation();
      var act = b.getAttribute("data-pp");
      if (act === "mention") {
        var input = document.getElementById("sv-input");
        if (input) {
          input.value +=
            (input.value && !/\s$/.test(input.value) ? " " : "") + "<@" + userId + "> ";
          input.focus();
        }
        closeProfile();
      } else if (act === "punish") {
        closeProfile();
        if (typeof window.__svOpenPunish === "function") window.__svOpenPunish(userId, name, "");
        else if (typeof window.openPunishModal === "function")
          window.openPunishModal({ userId: userId, userName: name });
      }
    };
  }

  // Bubble phase only — do not steal channel/nav clicks
  document.addEventListener("click", function (e) {
    // Profile open: only the actual avatar image
    var avImg = e.target.closest
      ? e.target.closest("#sv-messages img.sv-av, #sv-member-list img.sv-member-av")
      : null;
    if (avImg) {
      var art = avImg.closest("article.sv-msg, .sv-member-row");
      var uid =
        (art && (art.getAttribute("data-author-id") || art.getAttribute("data-member-id"))) ||
        "";
      if (uid) {
        e.preventDefault();
        e.stopPropagation();
        openProfile(uid, e.clientX || 40, e.clientY || 40);
        return;
      }
    }
    var pop = document.getElementById("sv-profile-pop");
    if (pop && !pop.hidden && !pop.contains(e.target)) closeProfile();
  });

  function injectCustomEmojiTab() {
    var tabs = document.querySelector("#sv-emoji-panel .sv-emoji-tabs");
    if (!tabs || tabs.querySelector('[data-cat="server"]')) return;
    var t = document.createElement("button");
    t.type = "button";
    t.className = "sv-emoji-tab";
    t.setAttribute("data-cat", "server");
    t.title = "Server emoji";
    t.textContent = "Server";
    var fav = tabs.querySelector('[data-cat="emoji-favs"]');
    if (fav && fav.nextSibling) tabs.insertBefore(t, fav.nextSibling);
    else tabs.appendChild(t);
    tabs.addEventListener("click", function (e) {
      var hit = e.target.closest ? e.target.closest('[data-cat="server"]') : null;
      if (!hit) return;
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
            '" alt="">' +
            "</button>";
        });
      }
      grid.innerHTML = html;
      document.querySelectorAll("#sv-emoji-panel .sv-emoji-tab").forEach(function (tab) {
        tab.classList.toggle("active", tab.getAttribute("data-cat") === "server");
      });
    });
  }

  var _openReact = window.__svOpenReactPicker;
  window.__svOpenReactPicker = function (messageId, x, y) {
    if (typeof _openReact === "function") _openReact(messageId, x, y);
    loadGuildEmojis(function (list) {
      setTimeout(function () {
        var picker = document.getElementById("sv-reaction-picker");
        if (!picker || !list.length) return;
        list.slice(0, 24).forEach(function (em) {
          if (picker.querySelector('[data-emoji="' + em.name + ":" + em.id + '"]')) return;
          var btn = document.createElement("button");
          btn.type = "button";
          btn.setAttribute("data-emoji", em.name + ":" + em.id);
          btn.title = ":" + em.name + ":";
          btn.innerHTML = '<img src="' + esc(proxyMaybe(emojiUrl(em))) + '" alt="">';
          picker.appendChild(btn);
        });
      }, 40);
    });
  };

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
    if (!m || m.querySelector('[data-act="delete"]')) return;
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
      deleteMessage(m.dataset.messageId || "");
    });
  }

  function runEnhancements() {
    if (busy) return;
    busy = true;
    try {
      injectCss();
      enhanceMessageContent();
      injectDateSeparators();
      bindCategories();
      decorateCategories();
      injectCustomEmojiTab();
      ensureDeleteInMenu();
    } catch (err) {
      console.warn("[sv-phase0]", err);
    }
    busy = false;
  }

  function observe() {
    var box = document.getElementById("sv-messages");
    if (!box || box.dataset.p0Obs2) return;
    box.dataset.p0Obs2 = "1";
    var t = null;
    var obs = new MutationObserver(function () {
      if (busy) return;
      clearTimeout(t);
      t = setTimeout(runEnhancements, 80);
    });
    obs.observe(box, { childList: true, subtree: false });
  }

  function boot() {
    injectCss();
    loadGuildEmojis();
    runEnhancements();
    observe();
    setInterval(function () {
      var view = document.getElementById("server-view");
      if (view && !view.hidden) {
        runEnhancements();
        observe();
      }
    }, 5000);
    console.log("[sv-phase0] v2 stable");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
