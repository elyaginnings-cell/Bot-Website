/**
 * Server View — Members tab (Channels | Members)
 * Punish members without opening a message.
 */
(function () {
  "use strict";

  var membersCache = [];
  var loading = false;
  var activeTab = "channels"; // channels | members
  var searchTimer = null;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function getServer() {
    if (window.selectedServer && window.selectedServer.id) return window.selectedServer;
    if (window.__svGuildId) return { id: String(window.__svGuildId) };
    return null;
  }

  function ensureSidebarTabs() {
    var aside = document.getElementById("sv-channels");
    if (!aside) return;

    if (!document.getElementById("sv-sidebar-tabs")) {
      var head = aside.querySelector(".sv-channels-head");
      var tabs = document.createElement("div");
      tabs.id = "sv-sidebar-tabs";
      tabs.className = "sv-sidebar-tabs";
      tabs.innerHTML =
        '<button type="button" class="sv-side-tab active" data-sv-tab="channels">Channels</button>' +
        '<button type="button" class="sv-side-tab" data-sv-tab="members">Members</button>';
      if (head && head.nextSibling) aside.insertBefore(tabs, head.nextSibling);
      else aside.appendChild(tabs);
    }

    if (!document.getElementById("sv-member-panel")) {
      var panel = document.createElement("div");
      panel.id = "sv-member-panel";
      panel.className = "sv-member-panel";
      panel.hidden = true;
      panel.innerHTML =
        '<div class="sv-member-search-wrap">' +
        '<input type="search" id="sv-member-search" class="sv-member-search" placeholder="Search members…" autocomplete="off">' +
        '</div>' +
        '<div id="sv-member-list" class="sv-member-list"></div>';
      aside.appendChild(panel);
    }

    // Style channel list as a panel sibling
    var chList = document.getElementById("sv-channel-list");
    if (chList) chList.classList.add("sv-side-panel");
  }

  function setTab(tab) {
    activeTab = tab === "members" ? "members" : "channels";
    ensureSidebarTabs();

    var tabs = document.querySelectorAll(".sv-side-tab");
    tabs.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-sv-tab") === activeTab);
    });

    var chList = document.getElementById("sv-channel-list");
    var memberPanel = document.getElementById("sv-member-panel");
    if (chList) chList.hidden = activeTab !== "channels";
    if (memberPanel) memberPanel.hidden = activeTab !== "members";

    if (activeTab === "members") {
      loadMembers();
      var search = document.getElementById("sv-member-search");
      if (search) setTimeout(function () { search.focus(); }, 50);
    }
  }

  async function loadMembers(query) {
    ensureSidebarTabs();
    var list = document.getElementById("sv-member-list");
    if (!list) return;

    var server = getServer();
    if (!server || !server.id) {
      list.innerHTML = '<p class="sv-empty">No server selected.</p>';
      return;
    }

    if (loading) return;
    loading = true;
    list.innerHTML = '<p class="sv-empty">Loading members…</p>';

    try {
      var url =
        "/api/members?guildId=" +
        encodeURIComponent(server.id) +
        "&limit=150";
      if (query) url += "&q=" + encodeURIComponent(query);

      var res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || "Failed to load members");

      membersCache = Array.isArray(data.members) ? data.members : [];
      window.membersCache = membersCache;
      renderMembers(membersCache, data);
    } catch (err) {
      list.innerHTML =
        '<p class="sv-empty sv-error">' +
        esc(err.message || "Could not load members") +
        "</p>";
    } finally {
      loading = false;
    }
  }

  function renderMembers(members, meta) {
    var list = document.getElementById("sv-member-list");
    if (!list) return;

    if (!members.length) {
      list.innerHTML =
        '<p class="sv-empty">No members found.' +
        (meta && meta.cached === 0
          ? "<br>Bot may need the Server Members intent."
          : "") +
        "</p>";
      return;
    }

    var html = "";
    members.forEach(function (m) {
      if (!m || !m.id) return;
      var name = m.displayName || m.globalName || m.username || "User";
      var sub = m.username && m.username !== name ? "@" + m.username : "";
      var avatar =
        m.avatar ||
        "https://cdn.discordapp.com/embed/avatars/" +
          (Number(BigInt(m.id) >> 22n) % 6) +
          ".png";
      var bot = m.bot ? '<span class="sv-bot-badge">BOT</span>' : "";
      var status = m.status ? '<span class="sv-member-status sv-status-' + esc(m.status) + '"></span>' : "";

      html +=
        '<div class="sv-member-row" data-member-id="' +
        esc(m.id) +
        '">' +
        '<div class="sv-member-av-wrap">' +
        status +
        '<img class="sv-member-av" src="' +
        esc(avatar) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'">' +
        "</div>" +
        '<div class="sv-member-info">' +
        '<span class="sv-member-name">' +
        esc(name) +
        "</span>" +
        bot +
        (sub ? '<span class="sv-member-sub">' + esc(sub) + "</span>" : "") +
        "</div>";

      if (!m.bot) {
        html +=
          '<button type="button" class="sv-member-punish sv-punish-btn" ' +
          'data-punish-user="' +
          esc(m.id) +
          '" data-punish-name="' +
          esc(name) +
          '" data-punish-msg="" title="Punish">Punish</button>';
      }

      html += "</div>";
    });

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
      loadMembers(q.trim());
    }, 280);
  }

  function onDocClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var tab = t.closest("[data-sv-tab]");
    if (tab) {
      e.preventDefault();
      setTab(tab.getAttribute("data-sv-tab"));
      return;
    }

    // Punish buttons use existing server-view-punish.js delegation
  }

  function onServerViewOpen() {
    ensureSidebarTabs();
    // Stay on channels by default; members loads on tab click
    setTab("channels");
  }

  function bind() {
    ensureSidebarTabs();
    document.addEventListener("click", onDocClick, true);

    var search = document.getElementById("sv-member-search");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "1";
      search.addEventListener("input", onSearchInput);
    }

    // When server view opens, ensure tabs exist
    ["open-server-view", "nav-server-view"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn && !btn.dataset.membersBound) {
        btn.dataset.membersBound = "1";
        btn.addEventListener("click", function () {
          setTimeout(onServerViewOpen, 80);
        });
      }
    });

    // Observe for re-renders of channel list
    var obs = new MutationObserver(function () {
      ensureSidebarTabs();
      var search2 = document.getElementById("sv-member-search");
      if (search2 && !search2.dataset.bound) {
        search2.dataset.bound = "1";
        search2.addEventListener("input", onSearchInput);
      }
    });
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  }

  window.__svSetSidebarTab = setTab;
  window.__svLoadMembers = loadMembers;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
