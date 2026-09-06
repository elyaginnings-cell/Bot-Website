/**
 * Members tab loader (new filename = cache bust)
 */
(function () {
  "use strict";

  var loading = false;
  var hardTimer = null;

  function esc(v) {
    return String(v == null ? "" : v)
      .split("&").join("&")
      .split("<").join("<")
      .split(">").join(">")
      .split('"').join(""");
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
    try { n = Number(String(id).slice(-2)) % 6; } catch (e) {}
    return "https://cdn.discordapp.com/embed/avatars/" + n + ".png";
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
          "If this stays empty, set DISCORD_BOT_TOKEN on Vercel to your bot token and redeploy.</p>"
      );
      return;
    }

    var html =
      '<p class="sv-empty" style="padding:6px 10px;font-size:12px">' +
      members.length +
      " members</p>";

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
        '" alt="" loading="lazy" referrerpolicy="no-referrer"></div>';
      html +=
        '<div class="sv-member-info"><span class="sv-member-name">' +
        esc(name) +
        "</span>";
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
    paint('<p class="sv-empty">Loading members…</p>');

    // Hard stop no matter what fetch does
    hardTimer = setTimeout(function () {
      loading = false;
      paint(
        '<p class="sv-empty sv-error"><strong>Timed out (8s)</strong><br>' +
          "The /api/members request did not finish. " +
          "Add <code>DISCORD_BOT_TOKEN</code> on Vercel (same token as Railway), redeploy the website, then hard-refresh.</p>"
      );
    }, 8000);

    var url =
      "/api/members?guildId=" +
      encodeURIComponent(gid) +
      "&limit=100&_=" +
      Date.now();
    if (query) url += "&q=" + encodeURIComponent(query);

    // XHR has a real timeout property (more reliable than fetch abort on some browsers)
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 7500;
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
      render(members, data);
    };

    xhr.ontimeout = function () {
      clearTimeout(hardTimer);
      loading = false;
      paint(
        '<p class="sv-empty sv-error"><strong>Request timed out</strong><br>' +
          "Set DISCORD_BOT_TOKEN on Vercel and redeploy.</p>"
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
