/**
 * Discord-like server view enhancements:
 * settings menu, role-colored names, member groups, mentions, replies polish, unread, emoji bar
 */
(function () {
  "use strict";
  if (window.__svDiscordPackV1) return;
  window.__svDiscordPackV1 = true;

  var guildRoles = [];
  var guildEmojis = [];
  var lastSeenByChannel = {};
  var unreadChannels = {};
  var presenceMap = {}; // id -> online|idle|dnd|offline

  try {
    lastSeenByChannel = JSON.parse(localStorage.getItem("svLastSeen") || "{}") || {};
  } catch (_) {
    lastSeenByChannel = {};
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function guildId() {
    if (window.selectedServer && window.selectedServer.id) return String(window.selectedServer.id);
    if (window.__svGuildId) return String(window.__svGuildId);
    return "";
  }

  function colorToHex(color) {
    if (!color) return null;
    if (typeof color === "string" && color.charAt(0) === "#") return color;
    var n = Number(color);
    if (!n) return null;
    return "#" + ("000000" + (n >>> 0).toString(16)).slice(-6);
  }

  async function loadGuildMeta() {
    var gid = guildId();
    if (!gid) return;
    try {
      var res = await fetch("/api/guild-meta?guildId=" + encodeURIComponent(gid) + "&_=" + Date.now(), {
        credentials: "include",
        cache: "no-store",
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) return;
      guildRoles = Array.isArray(data.roles) ? data.roles : [];
      guildEmojis = Array.isArray(data.emojis) ? data.emojis : [];
      window.rolesCache = guildRoles;
      window.__svGuildEmojis = guildEmojis;
    } catch (e) {
      console.warn("[sv-pack] meta", e);
    }
  }

  /* ——— Server settings dropdown (next to server name) ——— */
  function injectServerMenu() {
    var nameEl = document.getElementById("sv-server-name");
    if (!nameEl || document.getElementById("sv-server-menu-btn")) return;

    var wrap = document.createElement("div");
    wrap.className = "sv-server-menu-wrap";
    var parent = nameEl.parentNode;
    parent.insertBefore(wrap, nameEl);
    wrap.appendChild(nameEl);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "sv-server-menu-btn";
    btn.className = "sv-server-menu-btn";
    btn.title = "Server settings";
    btn.textContent = "▾";
    wrap.appendChild(btn);

    var menu = document.createElement("div");
    menu.id = "sv-server-menu";
    menu.className = "sv-server-menu";
    menu.hidden = true;
    menu.innerHTML =
      "<button type=\"button\" data-act=\"create-channel\">Create channel</button>" +
      "<button type=\"button\" data-act=\"create-category\">Create category</button>" +
      "<button type=\"button\" data-act=\"delete-channel\">Delete current channel</button>" +
      "<hr>" +
      "<button type=\"button\" data-act=\"create-role\">Create role</button>" +
      "<button type=\"button\" data-act=\"delete-role\">Delete role…</button>" +
      "<hr>" +
      "<button type=\"button\" data-act=\"refresh\">Refresh channels</button>";
    wrap.appendChild(menu);

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener("click", function () {
      menu.hidden = true;
    });
    menu.addEventListener("click", function (e) {
      e.stopPropagation();
      var t = e.target.closest("[data-act]");
      if (!t) return;
      menu.hidden = true;
      handleMenuAct(t.getAttribute("data-act"));
    });
  }

  async function manageChannel(body) {
    var gid = guildId();
    var res = await fetch("/api/channel-manage?guildId=" + encodeURIComponent(gid), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ guildId: gid }, body)),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) throw new Error(data.error || "Failed");
    return data;
  }

  async function manageRole(body) {
    var gid = guildId();
    var res = await fetch("/api/role-manage?guildId=" + encodeURIComponent(gid), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ guildId: gid }, body)),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) throw new Error(data.error || "Failed");
    return data;
  }

  async function handleMenuAct(act) {
    try {
      if (act === "create-channel") {
        var n = prompt("New text channel name:");
        if (!n) return;
        await manageChannel({ action: "create", kind: "text", name: n });
        alert("Channel created");
        if (window.openServerView) window.openServerView();
      } else if (act === "create-category") {
        var cn = prompt("New category name:");
        if (!cn) return;
        await manageChannel({ action: "create", kind: "category", name: cn });
        alert("Category created");
        if (window.openServerView) window.openServerView();
      } else if (act === "delete-channel") {
        var active = window.__svActiveChannelId;
        // try from highlighted button
        var activeBtn = document.querySelector("#sv-channel-list .sv-ch.active");
        if (activeBtn) active = activeBtn.getAttribute("data-channel-id");
        if (!active) {
          alert("Select a channel first");
          return;
        }
        if (!confirm("Delete this channel?")) return;
        await manageChannel({ action: "delete", channelId: active });
        alert("Deleted");
        if (window.openServerView) window.openServerView();
      } else if (act === "create-role") {
        var rn = prompt("New role name:");
        if (!rn) return;
        await manageRole({ action: "create", name: rn });
        await loadGuildMeta();
        alert("Role created");
      } else if (act === "delete-role") {
        if (!guildRoles.length) await loadGuildMeta();
        var list = guildRoles
          .filter(function (r) {
            return r.name !== "@everyone" && !r.managed;
          })
          .map(function (r, i) {
            return i + 1 + ". " + r.name;
          })
          .join("\n");
        var pick = prompt("Delete which role?\n" + list);
        if (!pick) return;
        var idx = parseInt(pick, 10) - 1;
        var roles = guildRoles.filter(function (r) {
          return r.name !== "@everyone" && !r.managed;
        });
        if (!roles[idx]) return alert("Invalid");
        if (!confirm("Delete role " + roles[idx].name + "?")) return;
        await manageRole({ action: "delete", roleId: roles[idx].id });
        await loadGuildMeta();
        alert("Role deleted");
      } else if (act === "refresh") {
        if (window.openServerView) window.openServerView();
      }
    } catch (e) {
      alert(e.message || "Action failed");
    }
  }

  /* ——— Role colors on message authors ——— */
  function applyRoleColors() {
    var members = window.membersCache || [];
    var byId = {};
    members.forEach(function (m) {
      if (m && m.id) byId[m.id] = m;
    });

    document.querySelectorAll("#sv-messages .sv-msg").forEach(function (art) {
      var authorId = art.getAttribute("data-author-id");
      if (!authorId) return;
      var mem = byId[authorId];
      if (!mem || !mem.roleIds || !mem.roleIds.length) return;
      var best = null;
      mem.roleIds.forEach(function (rid) {
        var role = guildRoles.find(function (r) {
          return String(r.id) === String(rid);
        });
        if (!role || !role.color) return;
        if (!best || role.position > best.position) best = role;
      });
      if (!best) return;
      var hex = colorToHex(best.color);
      if (!hex || hex === "#000000") return;
      var nameEl = art.querySelector(".sv-author");
      if (nameEl) {
        nameEl.style.color = hex;
        nameEl.classList.add("has-role-color");
      }
    });
  }

  /* ——— Highlight messages that mention the bot / @everyone-style ——— */
  function highlightMentions() {
    var me = window.currentUser && window.currentUser.id;
    document.querySelectorAll("#sv-messages .sv-msg").forEach(function (art) {
      var content = art.querySelector(".sv-msg-content");
      if (!content) return;
      var html = content.innerHTML || "";
      var isPing = false;
      if (me && html.indexOf(String(me)) >= 0) isPing = true;
      if (content.querySelector(".sv-mention-user, .sv-mention-role")) isPing = true;
      art.classList.toggle("mention-me", isPing);
    });
  }

  /* ——— Reactions under messages ——— */
  function paintReactions() {
    document.querySelectorAll("#sv-messages .sv-msg").forEach(function (art) {
      if (art.querySelector(".sv-reactions")) return;
      var raw = art.getAttribute("data-reactions");
      if (!raw) return;
      try {
        var reactions = JSON.parse(raw);
        if (!Array.isArray(reactions) || !reactions.length) return;
        var div = document.createElement("div");
        div.className = "sv-reactions";
        reactions.forEach(function (r) {
          var span = document.createElement("span");
          span.className = "sv-reaction";
          if (r.emoji && r.emoji.id) {
            span.innerHTML =
              '<img src="https://cdn.discordapp.com/emojis/' +
              esc(r.emoji.id) +
              '.' +
              (r.emoji.animated ? "gif" : "png") +
              '?size=16" alt="">' +
              " " +
              esc(String(r.count || 1));
          } else {
            span.textContent = (r.emoji && r.emoji.name ? r.emoji.name : "?") + " " + (r.count || 1);
          }
          div.appendChild(span);
        });
        var body = art.querySelector(".sv-msg-body");
        if (body) body.appendChild(div);
      } catch (_) {}
    });
  }

  /* ——— Unread channel dots ——— */
  function markChannelRead(channelId) {
    if (!channelId) return;
    lastSeenByChannel[channelId] = Date.now();
    delete unreadChannels[channelId];
    try {
      localStorage.setItem("svLastSeen", JSON.stringify(lastSeenByChannel));
    } catch (_) {}
    updateUnreadUi();
  }

  function updateUnreadUi() {
    document.querySelectorAll("#sv-channel-list [data-channel-id]").forEach(function (btn) {
      var id = btn.getAttribute("data-channel-id");
      var on = !!unreadChannels[id];
      btn.classList.toggle("unread", on);
      var dot = btn.querySelector(".sv-unread-dot");
      if (on && !dot) {
        dot = document.createElement("span");
        dot.className = "sv-unread-dot";
        btn.appendChild(dot);
      } else if (!on && dot) dot.remove();
    });
  }

  function watchMessagesForUnread() {
    // When polling loads messages for a non-active channel is hard;
    // mark unread when message list gains new ids while channel not focused — simplified:
    // on each successful load for active channel, mark read.
    var activeBtn = document.querySelector("#sv-channel-list .sv-ch.active");
    if (activeBtn) markChannelRead(activeBtn.getAttribute("data-channel-id"));
  }

  /* ——— Member list: group by hoist role + online/offline ——— */
  function enhanceMemberList() {
    var list = document.getElementById("sv-member-list");
    if (!list) return;
    var members = window.membersCache;
    if (!Array.isArray(members) || !members.length) return;
    if (list.dataset.svPackRendered === String(members.length) + ":" + guildRoles.length) return;

    // Build role map
    var roleById = {};
    guildRoles.forEach(function (r) {
      roleById[r.id] = r;
    });

    function topHoistRole(m) {
      var best = null;
      (m.roleIds || []).forEach(function (rid) {
        var r = roleById[rid];
        if (!r || !r.hoist) return;
        if (!best || r.position > best.position) best = r;
      });
      return best;
    }

    function statusOf(m) {
      return presenceMap[m.id] || m.status || (m.bot ? "online" : "offline");
    }

    var online = [];
    var offline = [];
    members.forEach(function (m) {
      var st = statusOf(m);
      if (st && st !== "offline" && st !== "invisible") online.push(m);
      else offline.push(m);
    });

    function sortMem(a, b) {
      return String(a.displayName || "").localeCompare(String(b.displayName || ""), undefined, {
        sensitivity: "base",
      });
    }
    online.sort(sortMem);
    offline.sort(sortMem);

    // Group online by hoist role
    var groups = {};
    var groupOrder = [];
    online.forEach(function (m) {
      var hr = topHoistRole(m);
      var key = hr ? hr.id : "_online";
      if (!groups[key]) {
        groups[key] = { role: hr, members: [] };
        groupOrder.push(key);
      }
      groups[key].members.push(m);
    });
    groupOrder.sort(function (a, b) {
      if (a === "_online") return 1;
      if (b === "_online") return -1;
      return (groups[b].role.position || 0) - (groups[a].role.position || 0);
    });

    var html = "";
    groupOrder.forEach(function (key) {
      var g = groups[key];
      var title = g.role ? g.role.name : "Online";
      html +=
        '<div class="sv-ml-group">' +
        esc(title) +
        " — " +
        g.members.length +
        "</div>";
      g.members.forEach(function (m) {
        html += memberRow(m, statusOf(m), roleById);
      });
    });

    if (offline.length) {
      html += '<div class="sv-ml-group">Offline — ' + offline.length + "</div>";
      offline.forEach(function (m) {
        html += memberRow(m, "offline", roleById);
      });
    }

    list.innerHTML = html;
    list.dataset.svPackRendered = String(members.length) + ":" + guildRoles.length;
  }

  function memberRow(m, status, roleById) {
    var name = m.displayName || m.username || "User";
    var hex = null;
    (m.roleIds || []).forEach(function (rid) {
      var r = roleById[rid];
      if (!r || !r.color) return;
      var h = colorToHex(r.color);
      if (!h || h === "#000000") return;
      if (!hex) hex = h;
      // prefer highest position color
      if (r.position && roleById) {
        /* already unsorted; ok */
      }
    });
    // highest position color
    var best = null;
    (m.roleIds || []).forEach(function (rid) {
      var r = roleById[rid];
      if (!r || !r.color) return;
      if (!best || r.position > best.position) best = r;
    });
    if (best) hex = colorToHex(best.color);

    var av = m.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";
    var st = status || "offline";
    return (
      '<div class="sv-member-row' +
      (st === "offline" ? " offline" : "") +
      '" data-member-id="' +
      esc(m.id) +
      '">' +
      '<div class="sv-member-av-wrap">' +
      '<img class="sv-member-av" src="' +
      esc(av) +
      '" alt="" loading="lazy" referrerpolicy="no-referrer">' +
      '<span class="sv-status ' +
      esc(st) +
      '"></span></div>' +
      '<div class="sv-member-info"><span class="sv-member-name"' +
      (hex && hex !== "#000000" ? ' style="color:' + esc(hex) + '"' : "") +
      ">" +
      esc(name) +
      (m.bot ? ' <span class="sv-bot-badge">BOT</span>' : "") +
      "</span></div></div>"
    );
  }

  /* ——— Autocomplete: members, roles, bots ——— */
  var acBox = null;
  function ensureAc() {
    if (acBox) return acBox;
    acBox = document.createElement("div");
    acBox.id = "sv-mention-box";
    acBox.className = "sv-mention-box";
    acBox.hidden = true;
    document.body.appendChild(acBox);
    return acBox;
  }

  function hideAc() {
    var b = ensureAc();
    b.hidden = true;
    b.innerHTML = "";
  }

  function onComposerInput(e) {
    var input = e.target;
    if (!input || input.id !== "sv-input") return;
    var val = input.value || "";
    var pos = input.selectionStart != null ? input.selectionStart : val.length;
    var before = val.slice(0, pos);

    // slash commands hint
    var slash = before.match(/(?:^|\s)\/([a-z0-9\-_]*)$/i);
    if (slash) {
      showSlashHints(input, slash[1] || "");
      return;
    }

    var m = before.match(/@([A-Za-z0-9_.]*)$/);
    if (!m) {
      hideAc();
      return;
    }
    showMentionAc(input, m[1] || "");
  }

  function showMentionAc(input, q) {
    var box = ensureAc();
    q = String(q).toLowerCase();
    var items = [];

    (window.membersCache || []).forEach(function (mem) {
      if (!mem || !mem.id) return;
      var name = mem.displayName || mem.username || "";
      if (q && name.toLowerCase().indexOf(q) < 0 && String(mem.username || "").toLowerCase().indexOf(q) < 0)
        return;
      items.push({
        kind: "user",
        id: mem.id,
        label: name + (mem.bot ? " (bot)" : ""),
        insert: "<@" + mem.id + "> ",
      });
    });

    guildRoles.forEach(function (r) {
      if (!r.mentionable && r.name !== "@everyone") return;
      if (q && String(r.name).toLowerCase().indexOf(q) < 0) return;
      items.push({
        kind: "role",
        id: r.id,
        label: "@" + r.name,
        insert: "<@&" + r.id + "> ",
      });
    });

    items = items.slice(0, 12);
    if (!items.length) {
      hideAc();
      return;
    }

    box.innerHTML = items
      .map(function (it) {
        return (
          '<button type="button" class="sv-mention-item" data-insert="' +
          esc(it.insert) +
          '">' +
          esc(it.label) +
          "</button>"
        );
      })
      .join("");

    placeBox(box, input);
    box.querySelectorAll("[data-insert]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        insertToken(input, btn.getAttribute("data-insert"), /@([A-Za-z0-9_.]*)$/);
        hideAc();
      });
    });
  }

  function showSlashHints(input, q) {
    var box = ensureAc();
    var cmds = [
      "/ai status",
      "/ai test",
      "/ai enable",
      "/daily",
      "/balance",
      "/rank",
      "/warn",
      "/help",
    ];
    q = String(q).toLowerCase();
    var items = cmds.filter(function (c) {
      return !q || c.indexOf("/" + q) === 0 || c.indexOf(q) >= 0;
    });
    if (!items.length) {
      hideAc();
      return;
    }
    box.innerHTML = items
      .map(function (c) {
        return (
          '<button type="button" class="sv-mention-item" data-insert="' +
          esc(c) +
          ' ">' +
          esc(c) +
          "</button>"
        );
      })
      .join("");
    placeBox(box, input);
    box.querySelectorAll("[data-insert]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        // replace current /partial
        var val = input.value || "";
        var pos = input.selectionStart != null ? input.selectionStart : val.length;
        var before = val.slice(0, pos);
        var after = val.slice(pos);
        var m = before.match(/(?:^|\s)\/([a-z0-9\-_]*)$/i);
        if (!m) return;
        var start = before.lastIndexOf("/");
        input.value = before.slice(0, start) + btn.getAttribute("data-insert") + after;
        input.focus();
        hideAc();
      });
    });
  }

  function placeBox(box, input) {
    var rect = input.getBoundingClientRect();
    box.style.left = Math.max(8, rect.left) + "px";
    box.style.bottom = window.innerHeight - rect.top + 6 + "px";
    box.style.width = Math.min(340, Math.max(240, rect.width)) + "px";
    box.hidden = false;
  }

  function insertToken(input, token, re) {
    var val = input.value || "";
    var pos = input.selectionStart != null ? input.selectionStart : val.length;
    var before = val.slice(0, pos);
    var after = val.slice(pos);
    var m = before.match(re);
    if (!m) return;
    var at = before.lastIndexOf(m[0].charAt(0) === " " ? m[0].trim().charAt(0) : m[0].charAt(0));
    // safer: find @
    at = before.lastIndexOf("@");
    if (at < 0) return;
    input.value = before.slice(0, at) + token + after;
    input.focus();
  }

  /* ——— Emoji bar ——— */
  function injectEmojiBar() {
    if (document.getElementById("sv-emoji-bar")) return;
    var composer = document.getElementById("sv-composer");
    if (!composer) return;

    var tools = document.createElement("div");
    tools.className = "sv-composer-tools";
    tools.innerHTML =
      '<button type="button" id="sv-toggle-emoji" title="Emoji">😀</button>' +
      '<button type="button" id="sv-toggle-slash" title="Commands">/</button>';
    composer.insertBefore(tools, composer.firstChild);

    var bar = document.createElement("div");
    bar.id = "sv-emoji-bar";
    bar.className = "sv-emoji-bar";
    bar.hidden = true;
    composer.insertBefore(bar, tools.nextSibling);

    document.getElementById("sv-toggle-emoji").addEventListener("click", function () {
      bar.hidden = !bar.hidden;
      if (!bar.hidden) renderEmojiBar(bar);
    });
    document.getElementById("sv-toggle-slash").addEventListener("click", function () {
      var input = document.getElementById("sv-input");
      if (!input) return;
      input.value = (input.value || "") + "/";
      input.focus();
      showSlashHints(input, "");
    });
  }

  function renderEmojiBar(bar) {
    var common = ["😀","😂","❤️","🔥","☕","👍","✨","🎉","😎","🥺","💀","✅","❌","👀"];
    var html = common
      .map(function (e) {
        return '<button type="button" data-emoji="' + e + '">' + e + "</button>";
      })
      .join("");
    guildEmojis.slice(0, 40).forEach(function (e) {
      html +=
        '<button type="button" data-emoji="<' +
        (e.animated ? "a" : "") +
        ":" +
        esc(e.name) +
        ":" +
        esc(e.id) +
        '>" title=":' +
        esc(e.name) +
        ':">' +
        '<img src="' +
        esc(e.url) +
        '" alt="">' +
        "</button>";
    });
    bar.innerHTML = html;
    bar.querySelectorAll("[data-emoji]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById("sv-input");
        if (!input) return;
        input.value = (input.value || "") + btn.getAttribute("data-emoji");
        input.focus();
      });
    });
  }

  /* ——— Tighten embed buttons: allow URL buttons, label custom ones ——— */
  function enhanceEmbedButtons() {
    document.querySelectorAll("#sv-messages .sv-component-btn.disabled").forEach(function (btn) {
      btn.title = "Interactive bot buttons require Discord client";
    });
  }

  /* ——— Pipeline after messages render ——— */
  function afterMessagesPaint() {
    applyRoleColors();
    highlightMentions();
    paintReactions();
    enhanceEmbedButtons();
    watchMessagesForUnread();
  }

  // Observe message container mutations
  function observeMessages() {
    var box = document.getElementById("sv-messages");
    if (!box || box.__svPackObs) return;
    box.__svPackObs = 1;
    var obs = new MutationObserver(function () {
      afterMessagesPaint();
    });
    obs.observe(box, { childList: true, subtree: true });
  }

  function observeMembers() {
    var list = document.getElementById("sv-member-list");
    if (!list || list.__svPackObs) return;
    list.__svPackObs = 1;
    var obs = new MutationObserver(function () {
      // Re-enhance shortly after native paint
      setTimeout(enhanceMemberList, 50);
    });
    obs.observe(list, { childList: true });
  }

  function patchOpen() {
    if (typeof window.openServerView !== "function" || window.__svPackOpen) return;
    window.__svPackOpen = 1;
    var orig = window.openServerView;
    window.openServerView = function () {
      orig.apply(this, arguments);
      setTimeout(function () {
        injectServerMenu();
        injectEmojiBar();
        loadGuildMeta().then(function () {
          enhanceMemberList();
        });
        observeMessages();
        observeMembers();
        afterMessagesPaint();
      }, 200);
    };
  }

  // Remove old manage bar from channel list if present
  function stripOldManageBar() {
    var bar = document.getElementById("sv-manage-bar");
    if (bar) bar.remove();
    document.querySelectorAll(".sv-ch-action").forEach(function (el) {
      el.remove();
    });
  }

  function boot() {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/sv-discord-pack.css?v=1";
    document.head.appendChild(link);

    patchOpen();
    document.addEventListener("keyup", onComposerInput, true);
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#sv-mention-box") && !e.target.closest("#sv-input")) hideAc();
    });

    setInterval(function () {
      patchOpen();
      injectServerMenu();
      injectEmojiBar();
      stripOldManageBar();
      enhanceMemberList();
      updateUnreadUi();
    }, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[sv-discord-pack] loaded");
})();
