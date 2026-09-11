/**
 * Force Discord member-list order: ONLINE groups first, OFFLINE last.
 * Runs after other member renderers so the order always wins.
 */
(function () {
  "use strict";
  if (window.__svMembersForceV1) return;
  window.__svMembersForceV1 = true;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function nameOf(m) {
    return m.displayName || m.globalName || m.username || "User";
  }

  function statusOf(m) {
    var st = m.status || m.presence || "";
    if (st && typeof st === "object") st = st.status || st.state || "";
    st = String(st || "").toLowerCase();
    if (st === "invisible") return "offline";
    if (st === "do_not_disturb") return "dnd";
    if (["online", "idle", "dnd", "offline"].indexOf(st) !== -1) return st;
    return "";
  }

  function isOffline(m) {
    var s = statusOf(m);
    return s === "offline" || s === "";
  }

  function isHoisted(r) {
    if (!r || r.name === "@everyone") return false;
    return r.hoist === true || r.hoist === 1 || r.hoisted === true || r.hoisted === 1;
  }

  function roleMap() {
    var map = {};
    (window.rolesCache || []).forEach(function (r) {
      if (r && r.id) map[String(r.id)] = r;
    });
    return map;
  }

  function topHoisted(m, map) {
    var ids = m.roleIds || m.roles || [];
    var best = null;
    for (var i = 0; i < ids.length; i++) {
      var rid = ids[i];
      if (rid && typeof rid === "object") rid = rid.id;
      var r = map[String(rid)];
      if (!isHoisted(r)) continue;
      if (!best || (Number(r.position) || 0) > (Number(best.position) || 0)) best = r;
    }
    return best;
  }

  function topAny(m, map) {
    var ids = m.roleIds || m.roles || [];
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

  function colorOf(r) {
    if (!r || r.color == null || r.color === 0) return "";
    if (typeof r.color === "number")
      return "#" + ("000000" + (r.color >>> 0).toString(16)).slice(-6);
    if (typeof r.color === "string" && r.color.charAt(0) === "#") return r.color;
    return "";
  }

  function defaultAvatar(id) {
    var n = 0;
    try {
      n = Number(String(id).slice(-4)) % 6;
    } catch (e) {}
    return "https://cdn.discordapp.com/embed/avatars/" + n + ".png";
  }

  function forceRender() {
    var listEl = document.getElementById("sv-member-list");
    var members = window.membersCache;
    if (!listEl || !Array.isArray(members) || !members.length) return;
    if (listEl.dataset.forceOrder === "online-first" && listEl.dataset.forceCount === String(members.length))
      return;

    var map = roleMap();
    var anyLive = members.some(function (m) {
      var s = statusOf(m);
      return s === "online" || s === "idle" || s === "dnd";
    });

    // If presence data exists, blank status → offline
    if (anyLive) {
      members.forEach(function (m) {
        if (m && !statusOf(m)) m.status = "offline";
      });
    }

    var groups = {};
    var order = [];

    members.forEach(function (m) {
      if (!m || !m.id) return;
      // Without any presence at all, treat everyone as online (avoid empty ONLINE)
      var offline = anyLive ? isOffline(m) : false;
      if (offline) {
        if (!groups._offline) {
          groups._offline = { role: null, members: [] };
          order.push("_offline");
        }
        groups._offline.members.push(m);
        return;
      }
      var top = topHoisted(m, map);
      var key = top ? "role:" + String(top.id) : "_online";
      if (!groups[key]) {
        groups[key] = { role: top, members: [] };
        order.push(key);
      }
      groups[key].members.push(m);
    });

    // ONLINE first, OFFLINE last
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
    // Debug strip so you can SEE the change
    var onlineN = members.filter(function (m) {
      return !isOffline(m) || !anyLive;
    }).length;
    var offlineN = members.length - onlineN;
    if (anyLive) {
      offlineN = (groups._offline && groups._offline.members.length) || 0;
      onlineN = members.length - offlineN;
    }
    html +=
      '<div class="sv-ml-group" style="opacity:.7">MEMBERS \u2014 ' +
      members.length +
      " (online " +
      onlineN +
      (anyLive ? ", offline " + offlineN : ", presence n/a") +
      ")</div>";

    order.forEach(function (key) {
      var g = groups[key];
      var title =
        key === "_offline"
          ? "OFFLINE \u2014 " + g.members.length
          : key === "_online"
            ? "ONLINE \u2014 " + g.members.length
            : ((g.role && g.role.name) || "ROLE") + " \u2014 " + g.members.length;
      html += '<div class="sv-ml-group">' + esc(title) + "</div>";
      g.members.sort(function (a, b) {
        return nameOf(a).toLowerCase().localeCompare(nameOf(b).toLowerCase());
      });
      g.members.forEach(function (m) {
        var name = nameOf(m);
        var av = m.avatar || defaultAvatar(m.id);
        var col = colorOf(topAny(m, map));
        var st = statusOf(m) || (anyLive ? "offline" : "online");
        html +=
          '<div class="sv-member-row" data-member-id="' +
          esc(String(m.id)) +
          '" data-offline="' +
          (st === "offline" ? "1" : "0") +
          '">';
        html +=
          '<div class="sv-member-av-wrap"><img class="sv-member-av" src="' +
          esc(av) +
          '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'"><span class="sv-status ' +
          st +
          '"></span></div>';
        html +=
          '<div class="sv-member-info"><span class="sv-member-name"' +
          (col ? ' style="color:' + col + ' !important"' : "") +
          ">" +
          esc(name) +
          "</span>";
        if (m.bot) html += '<span class="sv-bot-badge">BOT</span>';
        html += "</div></div>";
      });
    });

    listEl.innerHTML = html;
    listEl.dataset.forceOrder = "online-first";
    listEl.dataset.forceCount = String(members.length);
    listEl.dataset.discordGrouped = "1";
  }

  function boot() {
    setInterval(forceRender, 2000);
    console.log("[sv-members-force] online-first enforcer ready");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
