/**
 * Members tab loader — Discord-style role groups + online/offline.
 * Does not change overall dashboard look.
 */
(function () {
  "use strict";

  var loading = false;
  var hardTimer = null;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """)
      .replace(/'/g, "&#39;");
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

  function roleColorCss(color) {
    if (color == null || color === 0 || color === "#000000") return "";
    if (typeof color === "number") {
      return "color:#" + ("000000" + (color >>> 0).toString(16)).slice(-6);
    }
    if (typeof color === "string" && color.charAt(0) === "#") return "color:" + color;
    return "";
  }

  function rolesById() {
    var map = {};
    var list = Array.isArray(window.rolesCache) ? window.rolesCache : [];
    list.forEach(function (r) {
      if (r && r.id) map[String(r.id)] = r;
    });
    return map;
  }

  function topRole(member, roleMap) {
    var ids = Array.isArray(member.roleIds) ? member.roleIds : [];
    var best = null;
    ids.forEach(function (id) {
      var r = roleMap[String(id)];
      if (!r || r.name === "@everyone") return;
      if (!best || (r.position || 0) > (best.position || 0)) best = r;
    });
    return best;
  }

  function isOnline(m) {
    var s = String(m.status || m.presence || "").toLowerCase();
    if (!s || s === "null" || s === "undefined") return null; // unknown
    return s !== "offline" && s !== "invisible";
  }

  function memberRow(m, roleMap) {
    if (!m || !m.id) return "";
    var name = m.displayName || m.globalName || m.username || "User";
    var sub = m.username && m.username !== name ? "@" + m.username : "";
    var av = m.avatar || defaultAvatar(m.id);
    var top = topRole(m, roleMap);
    var colorStyle = top ? roleColorCss(top.color) : "";
    var status = isOnline(m);
    var statusDot =
      status === true
        ? '<span class="sv-status-dot online" title="Online"></span>'
        : status === false
          ? '<span class="sv-status-dot offline" title="Offline"></span>'
          : "";

    var html = '<div class="sv-member-row" data-member-id="' + esc(m.id) + '">';
    html +=
      '<div class="sv-member-av-wrap">' +
      statusDot +
      '<img class="sv-member-av" src="' +
      esc(av) +
      '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'"></div>';
    html +=
      '<div class="sv-member-info"><span class="sv-member-name"' +
      (colorStyle ? ' style="' + colorStyle + '"' : "") +
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

  function sectionHeader(title, count) {
    return (
      '<div class="sv-member-group-title">' +
      esc(title) +
      " — " +
      count +
      "</div>"
    );
  }

  function render(members, meta) {
    members = members || [];
    meta = meta || {};
    if (!members.length) {
      paint(
        '<p class="sv-empty"><strong>No members returned</strong><br>' +
          (meta.error ? esc(meta.error) + "<br>" : "") +
          (meta.source ? "Source: " + esc(meta.source) + "<br>" : "") +
          "Check DISCORD_BOT_TOKEN + Server Members Intent.</p>"
      );
      return;
    }

    var roleMap = rolesById();
    var online = [];
    var offline = [];
    var unknown = [];

    members.forEach(function (m) {
      var st = isOnline(m);
      if (st === true) online.push(m);
      else if (st === false) offline.push(m);
      else unknown.push(m);
    });

    // If presence unknown for everyone, show role-grouped list (Discord-like when no presence)
    var usePresence = online.length + offline.length > 0;

    function groupByRole(list) {
      var groups = {};
      var order = [];
      list.forEach(function (m) {
        var top = topRole(m, roleMap);
        var key = top ? String(top.id) : "_online";
        var title = top ? top.name : "Online";
        if (!groups[key]) {
          groups[key] = { title: title, position: top ? top.position || 0 : -1, members: [] };
          order.push(key);
        }
        groups[key].members.push(m);
      });
      order.sort(function (a, b) {
        return (groups[b].position || 0) - (groups[a].position || 0);
      });
      return { groups: groups, order: order };
    }

    var html = "";

    if (usePresence) {
      var onGrouped = groupByRole(online);
      onGrouped.order.forEach(function (key) {
        var g = onGrouped.groups[key];
        html += sectionHeader(g.title, g.members.length);
        g.members
          .sort(function (a, b) {
            return String(a.displayName || "").localeCompare(String(b.displayName || ""), undefined, {
              sensitivity: "base",
            });
          })
          .forEach(function (m) {
            html += memberRow(m, roleMap);
          });
      });

      if (offline.length) {
        html += sectionHeader("Offline", offline.length);
        offline
          .sort(function (a, b) {
            return String(a.displayName || "").localeCompare(String(b.displayName || ""), undefined, {
              sensitivity: "base",
            });
          })
          .forEach(function (m) {
            html += memberRow(m, roleMap);
          });
      }

      if (unknown.length) {
        html += sectionHeader("Members", unknown.length);
        unknown.forEach(function (m) {
          html += memberRow(m, roleMap);
        });
      }
    } else {
      // No presence data: group everyone by highest role
      var allGrouped = groupByRole(members);
      allGrouped.order.forEach(function (key) {
        var g = allGrouped.groups[key];
        html += sectionHeader(g.title === "Online" ? "Members" : g.title, g.members.length);
        g.members
          .sort(function (a, b) {
            return String(a.displayName || "").localeCompare(String(b.displayName || ""), undefined, {
              sensitivity: "base",
            });
          })
          .forEach(function (m) {
            html += memberRow(m, roleMap);
          });
      });
    }

    // minimal additive styles for status dots / group titles (does not restyle whole UI)
    if (!document.getElementById("sv-members-enhance-css")) {
      var s = document.createElement("style");
      s.id = "sv-members-enhance-css";
      s.textContent =
        ".sv-member-group-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;color:#949ba4;padding:12px 10px 4px}" +
        ".sv-status-dot{position:absolute;right:0;bottom:0;width:10px;height:10px;border-radius:50%;border:2px solid #2b2d31}" +
        ".sv-status-dot.online{background:#23a559}" +
        ".sv-status-dot.offline{background:#80848e}" +
        ".sv-member-av-wrap{position:relative}";
      document.head.appendChild(s);
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
    paint('<p class="sv-empty">Loading members…</p>');

    hardTimer = setTimeout(function () {
      loading = false;
      paint(
        '<p class="sv-empty sv-error"><strong>Timed out</strong><br>' +
          "Add <code>DISCORD_BOT_TOKEN</code> on Vercel and enable Server Members Intent.</p>"
      );
    }, 15000);

    // ensure roles for colors/grouping
    if (!window.rolesCache || !window.rolesCache.length) {
      fetch("/api/guilds?resource=meta&guildId=" + encodeURIComponent(gid), {
        credentials: "include",
        cache: "no-store",
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (d) {
          if (d && Array.isArray(d.roles)) window.rolesCache = d.roles;
          if (d && Array.isArray(d.emojis)) window.emojisCache = d.emojis;
        })
        .catch(function () {});
    }

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
      render(members, data);
    };

    xhr.ontimeout = function () {
      clearTimeout(hardTimer);
      loading = false;
      paint('<p class="sv-empty sv-error"><strong>Request timed out</strong></p>');
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
