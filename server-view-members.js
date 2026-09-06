/**
 * Server View - Members tab
 * Exposes window.svSwitchTab for inline onclick + event handlers.
 */
(function () {
  "use strict";

  var membersCache = [];
  var loading = false;
  var searchTimer = null;

  function esc(value) {
    var s = String(value == null ? "" : value);
    return s
      .split("&").join("&")
      .split("<").join("<")
      .split(">").join(">")
      .split('"').join(""");
  }

  function getServer() {
    if (window.selectedServer && window.selectedServer.id) return window.selectedServer;
    if (window.__svGuildId) return { id: String(window.__svGuildId) };
    return null;
  }

  function openDrawer() {
    var v = document.getElementById("server-view");
    if (v) v.classList.add("drawer-open");
  }

  function defaultAvatar(id) {
    var n = 0;
    try {
      n = Number(String(id).slice(-2)) % 6;
    } catch (e) {
      n = 0;
    }
    return "https://cdn.discordapp.com/embed/avatars/" + n + ".png";
  }

  function setTab(tab) {
    var activeTab = tab === "members" ? "members" : "channels";
    openDrawer();

    var tabs = document.querySelectorAll("[data-sv-tab]");
    for (var i = 0; i < tabs.length; i++) {
      var btn = tabs[i];
      if (btn.getAttribute("data-sv-tab") === activeTab) btn.classList.add("active");
      else btn.classList.remove("active");
    }

    var chList = document.getElementById("sv-channel-list");
    var memberPanel = document.getElementById("sv-member-panel");

    if (chList) {
      if (activeTab === "channels") {
        chList.hidden = false;
        chList.style.display = "";
        chList.removeAttribute("hidden");
      } else {
        chList.hidden = true;
        chList.style.display = "none";
        chList.setAttribute("hidden", "hidden");
      }
    }

    if (memberPanel) {
      if (activeTab === "members") {
        memberPanel.hidden = false;
        memberPanel.style.display = "flex";
        memberPanel.removeAttribute("hidden");
      } else {
        memberPanel.hidden = true;
        memberPanel.style.display = "none";
        memberPanel.setAttribute("hidden", "hidden");
      }
    }

    if (activeTab === "members") loadMembers();
    return false;
  }

  window.svSwitchTab = setTab;
  window.__svSetSidebarTab = setTab;

  function loadMembers(query) {
    var list = document.getElementById("sv-member-list");
    if (!list) return;

    var server = getServer();
    if (!server || !server.id) {
      list.innerHTML = '<p class="sv-empty">No server selected.</p>';
      return;
    }

    if (loading) return;
    loading = true;
    list.innerHTML = '<p class="sv-empty">Loading members...</p>';

    var url =
      "/api/members?guildId=" +
      encodeURIComponent(server.id) +
      "&limit=150";
    if (query) url += "&q=" + encodeURIComponent(query);

    fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" }
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          throw new Error(result.data.error || "Failed to load members (" + result.status + ")");
        }
        membersCache = Array.isArray(result.data.members) ? result.data.members : [];
        window.membersCache = membersCache;
        renderMembers(membersCache, result.data);
      })
      .catch(function (err) {
        list.innerHTML =
          '<p class="sv-empty sv-error">' +
          esc(err.message || "Could not load members") +
          "</p>";
      })
      .then(function () {
        loading = false;
      });
  }

  window.__svLoadMembers = loadMembers;

  function renderMembers(members, meta) {
    var list = document.getElementById("sv-member-list");
    if (!list) return;

    if (!members || !members.length) {
      var extra = "";
      if (meta && meta.fetchError) {
        extra += "<br><small>" + esc(meta.fetchError) + "</small>";
      }
      if (meta && meta.memberCount) {
        extra += "<br><small>Server reports " + esc(meta.memberCount) + " members.</small>";
      }
      extra +=
        "<br><small>Redeploy the bot on Railway after enabling Server Members Intent, then try again.</small>";
      list.innerHTML = '<p class="sv-empty">No members found.' + extra + "</p>";
      return;
    }

    var html = "";
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      if (!m || !m.id) continue;

      var name = m.displayName || m.globalName || m.username || "User";
      var sub = m.username && m.username !== name ? "@" + m.username : "";
      var avatar = m.avatar || defaultAvatar(m.id);
      var bot = m.bot ? '<span class="sv-bot-badge">BOT</span>' : "";
      var status = m.status
        ? '<span class="sv-member-status sv-status-' + esc(m.status) + '"></span>'
        : "";

      html += '<div class="sv-member-row" data-member-id="' + esc(m.id) + '">';
      html += '<div class="sv-member-av-wrap">' + status;
      html +=
        '<img class="sv-member-av" src="' +
        esc(avatar) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer">';
      html += "</div><div class="sv-member-info">';
      html += '<span class="sv-member-name">' + esc(name) + "</span>" + bot;
      if (sub) html += '<span class="sv-member-sub">' + esc(sub) + "</span>";
      html += "</div>";

      if (!m.bot) {
        html +=
          '<button type="button" class="sv-member-punish sv-punish-btn" data-punish-user="' +
          esc(m.id) +
          '" data-punish-name="' +
          esc(name) +
          '" data-punish-msg="" title="Punish">Punish</button>';
      }
      html += "</div>";
    }

    if (meta && meta.truncated) {
      html +=
        '<p class="sv-empty" style="padding:8px 12px;font-size:12px">Showing ' +
        members.length +
        " of " +
        meta.total +
        ". Search to find others.</p>";
    }

    list.innerHTML = html;
  }

  function onSearchInput(e) {
    var q = (e.target && e.target.value) || "";
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      loadMembers(String(q).trim());
    }, 280);
  }

  function handleActivate(e) {
    var t = e.target;
    if (!t) return;

    if (t.id === "sv-members-btn" || (t.closest && t.closest("#sv-members-btn"))) {
      e.preventDefault();
      e.stopPropagation();
      setTab("members");
      return;
    }

    var tabBtn = t.getAttribute && t.getAttribute("data-sv-tab")
      ? t
      : t.closest
        ? t.closest("[data-sv-tab]")
        : null;
    if (tabBtn) {
      e.preventDefault();
      e.stopPropagation();
      setTab(tabBtn.getAttribute("data-sv-tab"));
    }
  }

  function bind() {
    document.addEventListener("click", handleActivate, true);
    document.addEventListener("pointerup", handleActivate, true);

    var search = document.getElementById("sv-member-search");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "1";
      search.addEventListener("input", onSearchInput);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
