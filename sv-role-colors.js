/**
 * Role colors on names — preload data + beat CSS !important.
 */
(function () {
  "use strict";
  if (window.__svRoleColorsV3) return;
  window.__svRoleColorsV3 = true;

  function guildId() {
    if (window.selectedServer && window.selectedServer.id) return String(window.selectedServer.id);
    if (window.__svGuildId) return String(window.__svGuildId);
    return "";
  }

  function roleMap() {
    var map = {};
    var list = Array.isArray(window.rolesCache) ? window.rolesCache : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id) map[String(list[i].id)] = list[i];
    }
    return map;
  }

  /** Highest role that actually has a color (not just highest role overall). */
  function colorForMember(member, map) {
    if (!member) return "";
    var ids = Array.isArray(member.roleIds) ? member.roleIds : [];
    var best = null;
    for (var i = 0; i < ids.length; i++) {
      var r = map[String(ids[i])];
      if (!r || r.name === "@everyone") continue;
      var col = r.color;
      var hasColor =
        col != null &&
        col !== 0 &&
        col !== "0" &&
        col !== "#000000" &&
        col !== "#000";
      if (!hasColor) continue;
      if (!best || (Number(r.position) || 0) > (Number(best.position) || 0)) best = r;
    }
    if (!best) return "";
    if (typeof best.color === "number") {
      return "#" + ("000000" + (best.color >>> 0).toString(16)).slice(-6);
    }
    if (typeof best.color === "string") {
      if (best.color.charAt(0) === "#") return best.color;
      var n = parseInt(best.color, 10);
      if (Number.isFinite(n) && n > 0) {
        return "#" + ("000000" + (n >>> 0).toString(16)).slice(-6);
      }
    }
    return "";
  }

  function applyMemberColors() {
    var map = roleMap();
    var members = Array.isArray(window.membersCache) ? window.membersCache : [];
    var byId = {};
    for (var i = 0; i < members.length; i++) {
      if (members[i] && members[i].id) byId[String(members[i].id)] = members[i];
    }
    document.querySelectorAll(".sv-member-row[data-member-id] .sv-member-name").forEach(function (el) {
      var row = el.closest(".sv-member-row");
      var id = row && row.getAttribute("data-member-id");
      if (!id) return;
      var c = colorForMember(byId[id], map);
      if (c) el.style.setProperty("color", c, "important");
    });
  }

  function applyAuthorColors() {
    var map = roleMap();
    var members = Array.isArray(window.membersCache) ? window.membersCache : [];
    var byId = {};
    for (var i = 0; i < members.length; i++) {
      if (members[i] && members[i].id) byId[String(members[i].id)] = members[i];
    }
    document.querySelectorAll(".sv-msg[data-author-id] .sv-author").forEach(function (el) {
      var art = el.closest(".sv-msg");
      var id = art && art.getAttribute("data-author-id");
      if (!id) return;
      var c = colorForMember(byId[id], map);
      if (c) el.style.setProperty("color", c, "important");
    });
  }

  function applyAll() {
    applyAuthorColors();
    applyMemberColors();
  }

  var loadingRoles = false;
  var loadingMembers = false;
  var lastGuild = "";

  function preloadRoles(gid, done) {
    if (!gid) {
      if (done) done();
      return;
    }
    if (Array.isArray(window.rolesCache) && window.rolesCache.length && lastGuild === gid) {
      if (done) done();
      return;
    }
    if (loadingRoles) {
      if (done) setTimeout(function () { preloadRoles(gid, done); }, 300);
      return;
    }
    loadingRoles = true;
    fetch("/api/guilds?resource=meta&guildId=" + encodeURIComponent(gid) + "&_=" + Date.now(), {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && Array.isArray(d.roles)) {
          window.rolesCache = d.roles;
          lastGuild = gid;
        }
        if (d && Array.isArray(d.emojis)) window.emojisCache = d.emojis;
      })
      .catch(function () {})
      .finally(function () {
        loadingRoles = false;
        if (done) done();
        applyAll();
      });
  }

  function preloadMembers(gid, done) {
    if (!gid) {
      if (done) done();
      return;
    }
    if (Array.isArray(window.membersCache) && window.membersCache.length && window.__svMembersGuildId === gid) {
      if (done) done();
      return;
    }
    if (loadingMembers) {
      if (done) setTimeout(function () { preloadMembers(gid, done); }, 300);
      return;
    }
    loadingMembers = true;
    fetch(
      "/api/members?guildId=" +
        encodeURIComponent(gid) +
        "&limit=200&_=" +
        Date.now(),
      {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      }
    )
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (!x.ok) return;
        var members = Array.isArray(x.d.members)
          ? x.d.members
          : Array.isArray(x.d)
            ? x.d
            : [];
        if (members.length) {
          window.membersCache = members;
          window.__svMembersGuildId = gid;
        }
      })
      .catch(function () {})
      .finally(function () {
        loadingMembers = false;
        if (done) done();
        applyAll();
      });
  }

  function ensureData() {
    var gid = guildId();
    if (!gid) return;
    if (window.__svMembersGuildId && window.__svMembersGuildId !== gid) {
      window.membersCache = [];
      window.rolesCache = [];
      window.__svMembersGuildId = "";
      lastGuild = "";
    }
    preloadRoles(gid, function () {
      preloadMembers(gid, function () {
        applyAll();
      });
    });
  }

  window.__svEnsureRoleColorData = ensureData;

  var obs = new MutationObserver(function () {
    applyAll();
  });

  function start() {
    var box = document.getElementById("sv-messages");
    if (box) obs.observe(box, { childList: true, subtree: true });
    var ml = document.getElementById("sv-member-list");
    if (ml) obs.observe(ml, { childList: true, subtree: true });
    ensureData();
    applyAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  // When server view opens / guild changes
  setInterval(function () {
    var gid = guildId();
    var view = document.getElementById("server-view");
    if (view && !view.hidden && gid) ensureData();
    applyAll();
  }, 2500);
})();
