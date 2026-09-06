/**
 * Server View - Members tab (Channels | Members)
 */
(function () {
  "use strict";

  var membersCache = [];
  var loading = false;
  var activeTab = "channels";
  var searchTimer = null;
  var boundOnce = false;

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
    activeTab = tab === "members" ? "members" : "channels";
    openDrawer();

    var tabs = document.querySelectorAll("[data-sv-tab]");
    for (var i = 0; i < tabs.length; i++) {
      var btn = tabs[i];
      if (btn.getAttribute("data-sv-tab") === activeTab) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
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

    if (activeTab === "members") {
      loadMembers();
    }
  }

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

  function renderMembers(members, meta) {
    var list = document.getElementById("sv-member-list");
    if (!list) return;

    if (!members || !members.length) {
      var hint =
        meta && meta.cached === 0
          ? "<br>Enable <strong>Server Members Intent</strong> for the bot in the Discord Developer Portal, then redeploy."
          : "";
      list.innerHTML = '<p class="sv-empty">No members found.' + hint + "</p>";
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
      html += "</div>";
      html += '<div class="sv-member-info">';
      html += '<span class="sv-member-name">' + esc(name) + "</span>";
      html += bot;
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
        ". Use search to find others.</p>";
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

  function onTabClick(e) {
    e.preventDefault();
    e.stopPropagation();
    var btn = e.currentTarget || e.target;
    if (!btn) return;
    if (btn.getAttribute && !btn.getAttribute("data-sv-tab") && btn.closest) {
      btn = btn.closest("[data-sv-tab]");
    }
    if (!btn || !btn.getAttribute) return;
    var tab = btn.getAttribute("data-sv-tab");
    if (tab) setTab(tab);
  }

  function bindTabs() {
    var tabs = document.querySelectorAll("[data-sv-tab]");
    for (var i = 0; i < tabs.length; i++) {
      var btn = tabs[i];
      if (btn.dataset.svTabBound === "1") continue;
      btn.dataset.svTabBound = "1";
      btn.addEventListener("click", onTabClick);
    }

    var membersBtn = document.getElementById("sv-members-btn");
    if (membersBtn && membersBtn.dataset.svTabBound !== "1") {
      membersBtn.dataset.svTabBound = "1";
      membersBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        setTab("members");
      });
    }

    var search = document.getElementById("sv-member-search");
    if (search && search.dataset.bound !== "1") {
      search.dataset.bound = "1";
      search.addEventListener("input", onSearchInput);
    }
  }

  function bind() {
    if (boundOnce) {
      bindTabs();
      return;
    }
    boundOnce = true;
    bindTabs();

    // Re-bind if DOM changes
    if (document.body) {
      var obs = new MutationObserver(function () {
        bindTabs();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }

    // Also expose for debugging
    window.__svSetSidebarTab = setTab;
    window.__svLoadMembers = loadMembers;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
