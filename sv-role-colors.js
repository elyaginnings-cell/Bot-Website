/**
 * Role colors on chat author names (additive; does not change layout).
 */
(function () {
  "use strict";
  if (window.__svRoleColorsV1) return;
  window.__svRoleColorsV1 = true;

  function roleMap() {
    var map = {};
    var list = Array.isArray(window.rolesCache) ? window.rolesCache : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id) map[String(list[i].id)] = list[i];
    }
    return map;
  }

  function colorForMember(member, map) {
    if (!member) return "";
    var ids = Array.isArray(member.roleIds) ? member.roleIds : [];
    var best = null;
    for (var i = 0; i < ids.length; i++) {
      var r = map[String(ids[i])];
      if (!r || r.name === "@everyone") continue;
      if (!best || (Number(r.position) || 0) > (Number(best.position) || 0)) best = r;
    }
    if (!best || best.color == null || best.color === 0 || best.color === "#000000") return "";
    if (typeof best.color === "number") {
      return "#" + ("000000" + (best.color >>> 0).toString(16)).slice(-6);
    }
    if (typeof best.color === "string" && best.color.charAt(0) === "#") return best.color;
    return "";
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
      if (c) el.style.color = c;
    });
  }

  var obs = new MutationObserver(function () {
    applyAuthorColors();
  });
  function start() {
    var box = document.getElementById("sv-messages");
    if (box) obs.observe(box, { childList: true, subtree: true });
    applyAuthorColors();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  setInterval(applyAuthorColors, 3000);
})();
