/**
 * Members tab loader
 */
(function () {
  "use strict";

  var loading = false;
  var hardTimer = null;

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

  function topRoleColor(member, map) {
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

  function ensureRolesThen(cb) {
    var gid = guildId();
    if (!gid) { cb(); return; }
    if (Array.isArray(window.rolesCache) && window.rolesCache.length) { cb(); return; }
    fetch("/api/guilds?resource=meta&guildId=" + encodeURIComponent(gid) + "&_=" + Date.now(), {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && Array.isArray(d.roles)) window.rolesCache = d.roles;
      })
      .catch(function () {})
      .finally(function () { cb(); });
  }

  function render(members, meta) {
    members = members || [];
    meta = meta || {};
    if (!members.length) {
      paint(
        '<p class="sv-empty"><strong>No members returned</strong><br>' +
          (meta.error ? esc(meta.error) + "<br>" : "") +
          (meta.fetchError ? esc(meta.fetchError) + "<br>" : "") +
          (meta.source ? "Source: " + esc(meta.source) + "<br>" : "") +
          (Array.isArray(meta.errors) && meta.errors.length
            ? esc(meta.errors.join(" \u00b7 ")) + "<br>"
            : "") +
          "Check: Vercel has <code>DISCORD_BOT_TOKEN</code> and Discord portal has <strong>Server Members Intent</strong> enabled.</p>"
      );
      return;
    }

    if (typeof window.__svRenderMembersDiscord === "function") {
      try {
        window.__svRenderMembersDiscord(members, meta);
        return;
      } catch (e) {
        console.warn("discord member render failed", e);
      }
    }

    var html =
      '<p class="sv-empty" style="padding:6px 10px;font-size:12px">' +
      members.length +
      " members" +
      (meta.source ? " \u00b7 " + esc(meta.source) : "") +
      "</p>";

    var map = roleMap();
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      if (!m || !m.id) continue;
      var name = m.displayName || m.globalName || m.username || "User";
      var sub = m.username && m.username !== name ? "@" + m.username : "";
      var av = m.avatar || defaultAvatar(m.id);
      html += '<div class="sv-member-row" data-member-id="' + esc(m.id) + '">';
      html +=
        '<div class="sv-member-av-wrap"><img class="sv-member-av" src="' +
        esc(av) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'"></div>';
      var color = topRoleColor(m, map);
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
    }
    paint(html);
  }

  function loadMembers(query) {
    var gid = guildId();
    if (!gid) {
      paint('<p class="sv-empty">No server selected.</p>');
      return;
    }

    if (loading) return;
    loading = true;

    if (hardTimer) clearTimeout(hardTimer);
    paint('<p class="sv-empty">Loading members\u2026</p>');

    hardTimer = setTimeout(function () {
      loading = false;
      paint(
        '<p class="sv-empty sv-error"><strong>Timed out</strong><br>' +
          "Add <code>DISCORD_BOT_TOKEN</code> on Vercel (same as Railway), enable <strong>Server Members Intent</strong>, redeploy, hard-refresh.</p>"
      );
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
        paint(
          '<p class="sv-empty sv-error">Bad JSON from /api/members<br>' +
            esc(String(xhr.responseText).slice(0, 200)) +
            "</p>"
        );
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        paint(
          '<p class="sv-empty sv-error"><strong>HTTP ' +
            xhr.status +
            "</strong><br>" +
            esc(data.error || xhr.statusText || "Failed") +
            (data.errors && data.errors.length
              ? "<br>" + esc(data.errors.join(" \u00b7 "))
              : "") +
            "</p>"
        );
        return;
      }
      var members = Array.isArray(data.members)
        ? data.members
        : Array.isArray(data)
          ? data
          : [];
      window.membersCache = members;
      ensureRolesThen(function () {
        if (typeof window.__svRenderMembersDiscord === "function") {
          try {
            window.__svRenderMembersDiscord(members, data);
            return;
          } catch (e) {
            console.warn("discord member render failed", e);
          }
        }
        render(members, data);
      });
    };

    xhr.ontimeout = function () {
      clearTimeout(hardTimer);
      loading = false;
      paint(
        '<p class="sv-empty sv-error"><strong>Request timed out</strong><br>' +
          "Set DISCORD_BOT_TOKEN on Vercel + Server Members Intent.</p>"
      );
    };

    xhr.onerror = function () {
      clearTimeout(hardTimer);
      loading = false;
      paint('<p class="sv-empty sv-error">Network error calling /api/members</p>');
    };

    try {
      xhr.send();
    } catch (e) {
      clearTimeout(hardTimer);
      loading = false;
      paint('<p class="sv-empty sv-error">' + esc(e.message || e) + "</p>");
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
