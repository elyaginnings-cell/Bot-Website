/**
 * Discord-like server view pack v2 — aggressive inject (does not rely only on openServerView patch)
 */
(function () {
  "use strict";
  if (window.__svDiscordPackV2) return;
  window.__svDiscordPackV2 = true;
  console.log("[sv-discord-pack] v2 booting");

  var guildRoles = [];
  var guildEmojis = [];
  var presenceMap = {};

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

  function ensureCss() {
    if (document.getElementById("sv-discord-pack-css")) return;
    var l = document.createElement("link");
    l.id = "sv-discord-pack-css";
    l.rel = "stylesheet";
    l.href = "/sv-discord-pack.css?v=2";
    document.head.appendChild(l);
  }

  /* Server menu next to #sv-server-name */
  function injectServerMenu() {
    var nameEl = document.getElementById("sv-server-name");
    if (!nameEl) return false;
    if (document.getElementById("sv-server-menu-btn")) return true;

    var wrap = document.createElement("div");
    wrap.className = "sv-server-menu-wrap";
    wrap.id = "sv-server-menu-wrap";
    var parent = nameEl.parentNode;
    if (!parent) return false;
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
      "<button type=\"button\" data-act=\"refresh\">Refresh</button>";
    wrap.appendChild(menu);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener(
      "click",
      function () {
        menu.hidden = true;
      },
      true
    );
    menu.addEventListener("click", function (e) {
      e.stopPropagation();
      var t = e.target.closest("[data-act]");
      if (!t) return;
      menu.hidden = true;
      handleMenuAct(t.getAttribute("data-act"));
    });

    // Badge so user can see pack is active inside server view
    if (!document.getElementById("sv-pack-badge")) {
      var badge = document.createElement("span");
      badge.id = "sv-pack-badge";
      badge.textContent = "PACK";
      badge.style.cssText =
        "margin-left:6px;font-size:10px;background:#5865f2;color:#fff;border-radius:4px;padding:1px 5px;vertical-align:middle";
      wrap.appendChild(badge);
    }
    return true;
  }

  async function manageChannel(body) {
    var gid = guildId();
    if (!gid) throw new Error("No server selected");
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
    if (!gid) throw new Error("No server selected");
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
        var activeBtn = document.querySelector("#sv-channel-list .sv-ch.active");
        var active = activeBtn && activeBtn.getAttribute("data-channel-id");
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
        var roles = guildRoles.filter(function (r) {
          return r.name !== "@everyone" && !r.managed;
        });
        var list = roles
          .map(function (r, i) {
            return i + 1 + ". " + r.name;
          })
          .join("\n");
        var pick = prompt("Delete which role?\n" + list);
        if (!pick) return;
        var idx = parseInt(pick, 10) - 1;
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

  function highlightMentions() {
    document.querySelectorAll("#sv-messages .sv-msg").forEach(function (art) {
      var content = art.querySelector(".sv-msg-content");
      if (!content) return;
      var isPing = !!content.querySelector(".sv-mention-user, .sv-mention-role");
      art.classList.toggle("mention-me", isPing);
    });
  }

  function enhanceMemberList() {
    var list = document.getElementById("sv-member-list");
    if (!list) return;
    var members = window.membersCache;
    if (!Array.isArray(members) || !members.length) return;

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
        '<div class="sv-ml-group">' + esc(title) + " — " + g.members.length + "</div>";
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
  }

  function memberRow(m, status, roleById) {
    var name = m.displayName || m.username || "User";
    var best = null;
    (m.roleIds || []).forEach(function (rid) {
      var r = roleById[rid];
      if (!r || !r.color) return;
      if (!best || r.position > best.position) best = r;
    });
    var hex = best ? colorToHex(best.color) : null;
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
    });
  }

  function renderEmojiBar(bar) {
    var common = ["😀", "😂", "❤️", "🔥", "☕", "👍", "✨", "🎉", "😎", "🥺", "💀", "✅"];
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
        '>"><img src="' +
        esc(e.url) +
        '" alt=""></button>';
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

  function stripOldManageBar() {
    var bar = document.getElementById("sv-manage-bar");
    if (bar) bar.remove();
  }

  function tick() {
    ensureCss();
    stripOldManageBar();
    var view = document.getElementById("server-view");
    if (view && !view.hidden) {
      injectServerMenu();
      injectEmojiBar();
      applyRoleColors();
      highlightMentions();
      enhanceMemberList();
    }
  }

  // Patch openServerView whenever it appears
  function patchOpen() {
    if (typeof window.openServerView !== "function") return;
    if (window.openServerView.__svPackWrapped) return;
    var orig = window.openServerView;
    function wrapped() {
      var r = orig.apply(this, arguments);
      setTimeout(function () {
        loadGuildMeta().then(tick);
        tick();
      }, 100);
      setTimeout(tick, 400);
      return r;
    }
    wrapped.__svPackWrapped = true;
    window.openServerView = wrapped;
  }

  // Also react to Server / Chat nav clicks
  document.addEventListener(
    "click",
    function (e) {
      var t = e.target;
      if (!t) return;
      if (
        t.id === "open-server-view" ||
        t.id === "nav-server-view" ||
        (t.closest && (t.closest("#open-server-view") || t.closest("#nav-server-view")))
      ) {
        setTimeout(function () {
          patchOpen();
          loadGuildMeta().then(tick);
          tick();
        }, 150);
      }
    },
    true
  );

  setInterval(function () {
    patchOpen();
    tick();
  }, 1500);

  ensureCss();
  patchOpen();
  tick();
  console.log("[sv-discord-pack] v2 ready");
})();
