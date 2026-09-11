/**
 * Members tab — Discord order: hoisted roles → ONLINE → OFFLINE last
 * Polls every 15s while the Members tab is open so presence updates show up.
 */
(function () {
  "use strict";
  if (window.__svMembersLoadV2) return;
  window.__svMembersLoadV2 = true;

  var loading = false;
  var hardTimer = null;
  var pollTimer = null;
  var lastQuery = "";

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;")
      .replace(/'/g, "\u0026#39;");
  }

  function listEl() {
    return document.getElementById("sv-member-list");
  }

  function membersTabOpen() {
    var mp = document.getElementById("sv-member-panel");
    if (!mp) return false;
    if (mp.hidden) return false;
    var view = document.getElementById("server-view");
    if (view && view.hidden) return false;
    return true;
  }

  function paint(html) {
    var el = listEl();
    if (!el) return;
    el.innerHTML = html;
    el.style.display = "block";
    el.style.visibility = "visible";
    el.style.minHeight = "180px";
    el.style.color = "#dbdee1";
  }

  function guildId() {
    if (window.selectedServer && window.selectedServer.id) return String(window.selectedServer.id);
    if (window.__svGuildId) return String(window.__svGuildId);
    return "";
  }

  function openDrawer() {
    var v = document.getElementById("server-view");
    if (v) v.classList.add("drawer-open");
  }

  function startPresencePoll() {
    stopPresencePoll();
    pollTimer = setInterval(function () {
      if (!membersTabOpen()) return;
      if (document.hidden) return;
      if (loading) return;
      loadMembers(lastQuery, true);
    }, 15000);
  }

  function stopPresencePoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function setTab(tab) {
    var active = tab === "members" ? "members" : "channels";
    openDrawer();
    document.querySelectorAll("[data-sv-tab]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-sv-tab") === active);
    });
    var ch = document.getElementById("sv-channel-list");
    var mp = document.getElementById("sv-member-panel");
    if (ch) {
      ch.hidden = active !== "channels";
      ch.style.display = active === "channels" ? "" : "none";
    }
    if (mp) {
      mp.hidden = active !== "members";
      mp.style.display = active === "members" ? "flex" : "none";
    }
    if (active === "members") {
      loading = false;
      loadMembers("");
      startPresencePoll();
    } else {
      stopPresencePoll();
    }
    return false;
  }

  window.svSwitchTab = setTab;
  window.__svSetSidebarTab = setTab;

  function defaultAvatar(id) {
    var n = 0;
    try {
      n = Number(String(id).slice(-4)) % 6;
    } catch (e) {}
    return "https://cdn.discordapp.com/embed/avatars/" + n + ".png";
  }

  function roleMap() {
    var map = {};
    var list = Array.isArray(window.rolesCache) ? window.rolesCache : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id) map[String(list[i].id)] = list[i];
    }
    return map;
  }

  function isHoistedRole(r) {
    if (!r) return false;
    if (r.name === "@everyone") return false;
    return r.hoist === true || r.hoist === 1 || r.hoisted === true || r.hoisted === 1;
  }

  function ensureRolesThen(cb) {
    var gid = guildId();
    if (!gid) {
      cb();
      return;
    }
    fetch("/api/guilds?resource=meta&guildId=" + encodeURIComponent(gid) + "&_=" + Date.now(), {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && Array.isArray(d.roles) && d.roles.length) {
          window.rolesCache = d.roles;
        }
      })
      .catch(function () {})
      .finally(function () {
        cb();
      });
  }

  function topHoistedRole(member, map) {
    var ids = Array.isArray(member.roleIds)
      ? member.roleIds
      : Array.isArray(member.roles)
        ? member.roles
        : [];
    var best = null;
    for (var i = 0; i < ids.length; i++) {
      var rid = ids[i];
      if (rid && typeof rid === "object") rid = rid.id;
      var r = map[String(rid)];
      if (!isHoistedRole(r)) continue;
      if (!best || (Number(r.position) || 0) > (Number(best.position) || 0)) best = r;
    }
    return best;
  }

  function topAnyRole(member, map) {
    var ids = Array.isArray(member.roleIds)
      ? member.roleIds
      : Array.isArray(member.roles)
        ? member.roles
        : [];
    var best = null;
    for (var i = 0; i < ids.length; i++) {
      var rid = ids[i];
      if (rid && typeof rid === "object") rid = rid.id;
      var r = map[String(rid)];
      if (!r || r.name === "@everyone") continue;
      if (!best || (Number(r.position) || 0) > (Number(best.position) || 0)) best = r;
    }
    return best;
  }

  function roleColor(role) {
    if (!role || role.color == null || role.color === 0 || role.color === "#000000") return "";
    if (typeof role.color === "number")
      return "#" + ("000000" + (role.color >>> 0).toString(16)).slice(-6);
    if (typeof role.color === "string" && role.color.charAt(0) === "#") return role.color;
    return "";
  }

  function nameOf(m) {
    return m.displayName || m.globalName || m.username || "User";
  }

  function statusOf(mem) {
    var st = String(mem.status || mem.presence || "").toLowerCase();
    if (st === "invisible") return "offline";
    if (["online", "idle", "dnd", "offline"].indexOf(st) !== -1) return st;
    return "";
  }

  function isOffline(mem) {
    return statusOf(mem) === "offline";
  }

  function isOnlineish(mem) {
    var st = statusOf(mem);
    return st === "online" || st === "idle" || st === "dnd";
  }

  function renderMemberRow(m, map) {
    var name = nameOf(m);
    var sub = m.username && m.username !== name ? "@" + m.username : "";
    var av = m.avatar || defaultAvatar(m.id);
    var color = roleColor(topAnyRole(m, map));
    var st = statusOf(m) || "offline";
    var off = st === "offline";
    var html = "";
    html +=
      '<div class="sv-member-row" data-member-id="' +
      esc(m.id) +
      '" data-offline="' +
      (off ? "1" : "0") +
      '">';
    html +=
      '<div class="sv-member-av-wrap"><img class="sv-member-av" src="' +
      esc(av) +
      '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'"><span class="sv-status ' +
      st +
      '" title="' +
      st +
      '"></span></div>';
    html +=
      '<div class="sv-member-info"><span class="sv-member-name"' +
      (color ? ' style="color:' + color + ' !important"' : "") +
      ">" +
      esc(name) +
      "</span>";
    if (m.bot) html += '<span class="sv-bot-badge">BOT</span>';
    if (sub) html += '<span class="sv-member-sub">' + esc(sub) + "</span>";
    html += "</div>";
    if (!m.bot) {
      html +=
        '<button type="button" class="sv-member-punish sv-punish-btn" data-punish-user="' +
        esc(m.id) +
        '" data-punish-name="' +
        esc(name) +
        '" data-punish-msg="">Punish</button>';
    }
    html += "</div>";
    return html;
  }

  function render(members, meta) {
    members = members || [];
    meta = meta || {};
    if (!members.length) {
      paint(
        '<p class="sv-empty"><strong>No members returned</strong><br>' +
          (meta.error ? esc(meta.error) + "<br>" : "") +
          "Check Server Members Intent + DISCORD_BOT_TOKEN.</p>"
      );
      return;
    }

    var map = roleMap();
    var groups = {};
    var order = [];
    var hasPresence = members.some(function (m) {
      return isOnlineish(m) || statusOf(m) === "offline";
    });

    for (var mi = 0; mi < members.length; mi++) {
      var mem = members[mi];
      if (!mem || !mem.id) continue;

      // Only park in OFFLINE when we actually know status
      if (hasPresence && isOffline(mem)) {
        if (!groups._offline) {
          groups._offline = { role: null, members: [] };
          order.push("_offline");
        }
        groups._offline.members.push(mem);
        continue;
      }

      var top = topHoistedRole(mem, map);
      var key = top ? "role:" + String(top.id) : "_online";
      if (!groups[key]) {
        groups[key] = { role: top, members: [] };
        order.push(key);
      }
      groups[key].members.push(mem);
    }

    order.sort(function (a, b) {
      if (a === "_offline") return 1;
      if (b === "_offline") return -1;
      if (a === "_online") return 1;
      if (b === "_online") return -1;
      return (
        (Number(groups[b].role && groups[b].role.position) || 0) -
        (Number(groups[a].role && groups[a].role.position) || 0)
      );
    });

    var html = "";
    var hits = meta.presenceHits || 0;
    if (!hits && !hasPresence) {
      html +=
        '<p class="sv-empty" style="padding:6px 10px;font-size:11px;opacity:.85">Presence not live yet. Enable <strong>Presence Intent</strong> on the bot in Discord Developer Portal, redeploy the bot, then leave this tab open — it refreshes every 15s.</p>';
    } else if (hits) {
      html +=
        '<p class="sv-empty" style="padding:4px 10px;font-size:10px;opacity:.55">Presence live · ' +
        hits +
        " online signals · auto-refresh 15s</p>";
    }

    for (var oi = 0; oi < order.length; oi++) {
      var g = groups[order[oi]];
      var title =
        order[oi] === "_offline"
          ? "OFFLINE \u2014 " + g.members.length
          : order[oi] === "_online"
            ? "ONLINE \u2014 " + g.members.length
            : ((g.role && g.role.name) || "ROLE") + " \u2014 " + g.members.length;
      html += '<div class="sv-ml-group">' + esc(title) + "</div>";
      g.members.sort(function (a, b) {
        var an = nameOf(a).toLowerCase();
        var bn = nameOf(b).toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      });
      for (var gi = 0; gi < g.members.length; gi++) {
        html += renderMemberRow(g.members[gi], map);
      }
    }
    paint(html);
  }

  function loadMembers(query, quiet) {
    var gid = guildId();
    if (!gid) {
      if (!quiet) paint('<p class="sv-empty">No server selected.</p>');
      return;
    }
    if (loading) return;
    loading = true;
    lastQuery = query || "";
    if (hardTimer) clearTimeout(hardTimer);
    if (!quiet) paint('<p class="sv-empty">Loading members\u2026</p>');
    hardTimer = setTimeout(function () {
      loading = false;
      if (!quiet) paint('<p class="sv-empty sv-error"><strong>Timed out</strong></p>');
    }, 15000);

    var url =
      "/api/members?guildId=" +
      encodeURIComponent(gid) +
      "&limit=200&_=" +
      Date.now();
    if (query) url += "&q=" + encodeURIComponent(query);

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 14000;
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = function () {
      clearTimeout(hardTimer);
      loading = false;
      var data = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch (e) {
        if (!quiet) paint('<p class="sv-empty sv-error">Bad JSON from /api/members</p>');
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        if (!quiet)
          paint(
            '<p class="sv-empty sv-error"><strong>HTTP ' +
              xhr.status +
              "</strong><br>" +
              esc(data.error || xhr.statusText || "Failed") +
              "</p>"
          );
        return;
      }
      var list = Array.isArray(data.members)
        ? data.members
        : Array.isArray(data)
          ? data
          : [];
      window.membersCache = list;
      console.log(
        "[sv-members] loaded",
        list.length,
        "presenceHits",
        data.presenceHits,
        "source",
        data.source
      );
      ensureRolesThen(function () {
        render(list, data);
      });
    };
    xhr.ontimeout = function () {
      clearTimeout(hardTimer);
      loading = false;
      if (!quiet) paint('<p class="sv-empty sv-error">Request timed out</p>');
    };
    xhr.onerror = function () {
      clearTimeout(hardTimer);
      loading = false;
      if (!quiet) paint('<p class="sv-empty sv-error">Network error</p>');
    };
    try {
      xhr.send();
    } catch (e) {
      clearTimeout(hardTimer);
      loading = false;
      if (!quiet) paint('<p class="sv-empty sv-error">' + esc(e.message || e) + "</p>");
    }
  }

  window.__svLoadMembers = loadMembers;

  function onSearch(e) {
    var q = (e.target && e.target.value) || "";
    loading = false;
    loadMembers(String(q).trim());
  }

  function bind() {
    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t) return;
        if (t.id === "sv-members-btn" || (t.closest && t.closest("#sv-members-btn"))) {
          e.preventDefault();
          setTab("members");
          return;
        }
        var tab = t.closest ? t.closest("[data-sv-tab]") : null;
        if (tab) {
          e.preventDefault();
          setTab(tab.getAttribute("data-sv-tab"));
        }
      },
      true
    );
    var search = document.getElementById("sv-member-search");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "1";
      search.addEventListener("input", function (e) {
        clearTimeout(search._t);
        search._t = setTimeout(function () {
          onSearch(e);
        }, 300);
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
