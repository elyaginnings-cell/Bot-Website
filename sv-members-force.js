/**
 * Member list: online → hoisted role; offline → bottom.
 * Punish button on each member row.
 */
(function () {
  "use strict";
  if (window.__svMembersForceV3) return;
  window.__svMembersForceV3 = true;

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
    var st = m.status || m.presence || (m.user && m.user.status) || "";
    if (st && typeof st === "object") st = st.status || st.state || "";
    st = String(st || "").toLowerCase().trim();
    if (st === "invisible") return "offline";
    if (st === "do_not_disturb") return "dnd";
    if (st === "idle" || st === "online" || st === "dnd" || st === "offline") return st;
    return "";
  }

  function isOnline(m) {
    var s = statusOf(m);
    return s === "online" || s === "idle" || s === "dnd";
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

  function rowHtml(m, map, st) {
    var name = nameOf(m);
    var av = m.avatar || defaultAvatar(m.id);
    var col = colorOf(topAny(m, map));
    var off = st === "offline";
    var html = "";
    html +=
      '<div class="sv-member-row" data-member-id="' +
      esc(String(m.id)) +
      '" data-offline="' +
      (off ? "1" : "0") +
      '">';
    html +=
      '<div class="sv-member-av-wrap"><img class="sv-member-av" src="' +
      esc(av) +
      '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'"><span class="sv-status ' +
      esc(st) +
      '"></span></div>';
    html +=
      '<div class="sv-member-info"><span class="sv-member-name"' +
      (col ? ' style="color:' + col + ' !important"' : "") +
      ">" +
      esc(name) +
      "</span>";
    if (m.bot) html += '<span class="sv-bot-badge">BOT</span>';
    html += "</div>";
    if (!m.bot) {
      html +=
        '<button type="button" class="sv-member-punish" data-punish-user="' +
        esc(String(m.id)) +
        '" data-punish-name="' +
        esc(name) +
        '" title="Warn, mute, kick, or ban">Punish</button>';
    }
    html += "</div>";
    return html;
  }

  function buildHtml(members) {
    var map = roleMap();
    var hasPresence = members.some(function (m) {
      return isOnline(m) || statusOf(m) === "offline";
    });

    var roleGroups = {};
    var roleOrder = [];
    var onlineNoRole = [];
    var offline = [];

    members.forEach(function (m) {
      if (!m || !m.id) return;
      if (hasPresence && !isOnline(m)) {
        offline.push(m);
        return;
      }
      var top = topHoisted(m, map);
      if (top) {
        var key = "role:" + String(top.id);
        if (!roleGroups[key]) {
          roleGroups[key] = { role: top, members: [] };
          roleOrder.push(key);
        }
        roleGroups[key].members.push(m);
      } else {
        onlineNoRole.push(m);
      }
    });

    roleOrder.sort(function (a, b) {
      return (
        (Number(roleGroups[b].role && roleGroups[b].role.position) || 0) -
        (Number(roleGroups[a].role && roleGroups[a].role.position) || 0)
      );
    });

    function sortByName(arr) {
      arr.sort(function (a, b) {
        return nameOf(a).toLowerCase().localeCompare(nameOf(b).toLowerCase());
      });
    }
    roleOrder.forEach(function (k) {
      sortByName(roleGroups[k].members);
    });
    sortByName(onlineNoRole);
    sortByName(offline);

    var html = "";
    roleOrder.forEach(function (key) {
      var g = roleGroups[key];
      html +=
        '<div class="sv-ml-group">' +
        esc((g.role && g.role.name) || "ROLE") +
        " \u2014 " +
        g.members.length +
        "</div>";
      g.members.forEach(function (m) {
        html += rowHtml(m, map, statusOf(m) || "online");
      });
    });
    if (onlineNoRole.length) {
      html += '<div class="sv-ml-group">ONLINE \u2014 ' + onlineNoRole.length + "</div>";
      onlineNoRole.forEach(function (m) {
        html += rowHtml(m, map, statusOf(m) || "online");
      });
    }
    if (offline.length) {
      html += '<div class="sv-ml-group">OFFLINE \u2014 ' + offline.length + "</div>";
      offline.forEach(function (m) {
        html += rowHtml(m, map, "offline");
      });
    }
    if (!html) html = '<p class="sv-empty">No members to show.</p>';
    return html;
  }

  function bindPunishClicks(listEl) {
    if (listEl.dataset.punishBound) return;
    listEl.dataset.punishBound = "1";
    listEl.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".sv-member-punish") : null;
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var uid = btn.getAttribute("data-punish-user");
      var uname = btn.getAttribute("data-punish-name") || "user";
      if (typeof window.__svOpenPunish === "function") {
        window.__svOpenPunish(uid, uname, "");
      } else if (typeof window.openPunishModal === "function") {
        window.openPunishModal({ userId: uid, userName: uname, messageId: "" });
      }
    });
  }

  function forceRender() {
    var listEl = document.getElementById("sv-member-list");
    var members = window.membersCache;
    if (!listEl || !Array.isArray(members) || !members.length) return;

    var needs =
      listEl.dataset.forceV !== "3" ||
      listEl.dataset.forceCount !== String(members.length) ||
      !listEl.querySelector(".sv-member-punish");

    if (!needs) {
      bindPunishClicks(listEl);
      return;
    }

    listEl.innerHTML = buildHtml(members);
    listEl.dataset.forceV = "3";
    listEl.dataset.forceCount = String(members.length);
    listEl.dataset.punishBound = "";
    bindPunishClicks(listEl);
  }

  function boot() {
    setInterval(forceRender, 8000);
    setTimeout(forceRender, 1500);
    console.log("[sv-members-force] v3 + punish buttons");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
