/**
 * Server View — Members tab (Channels | Members)
 * Punish members without opening a message.
 */
(function () {
  "use strict";

  var membersCache = [];
  var loading = false;
  var activeTab = "channels";
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

  function openDrawer() {
    var v = document.getElementById("server-view");
    if (v) v.classList.add("drawer-open");
  }

  function defaultAvatar(id) {
    var n = 0;
    try {
      n = Number(String(id).slice(-2)) % 6;
    } catch (_) {
      n = 0;
    }
    return "https://cdn.discordapp.com/embed/avatars/" + n + ".png";
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
        "</div>" +
        '<div id="sv-member-list" class="sv-member-list"></div>';
      aside.appendChild(panel);
    }

    // Bind search if present
    var search = document.getElementById("sv-member-search");
    if (search && !search.dataset.bound) {
      search.dataset.bound = "1";
      search.addEventListener("input", onSearchInput);
    }
  }

  function setTab(tab) {
    activeTab = tab === "members" ? "members" : "channels";
    ensureSidebarTabs();

    // Always show the sidebar so the tabs are visible
    openDrawer();

    var tabs = document.querySelectorAll(".sv-side-tab");
    tabs.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-sv-tab") === activeTab);
    });

    var chList = document.getElementById("sv-channel-list");
    var memberPanel = document.getElementById("sv-member-panel");
    if (chList) {
      if (activeTab === "channels") {
        chList.hidden = false;
        chList.removeAttribute("hidden");
      } else {
        chList.hidden = true;
        chList.setAttribute("hidden", "");
      }
    }
    if (memberPanel) {
      if (activeTab === "members") {
        memberPanel.hidden = false;
        memberPanel.removeAttribute("hidden");
      } else {
        memberPanel.hidden = true;
        memberPanel.setAttribute("hidden", "");
      }
    }

    if (activeTab === "members") {
      loadMembers();
      var search = document.getElementById("sv-member-search");
      if (search) {
        setTimeout(function () {
          try {
            search.focus();
          } catch (_) {}
        }, 50);
      }
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
          ? "<br>Bot may need the <strong>Server Members Intent</strong> enabled in the Discord Developer Portal."
          : "") +
        "</p>";
      return;
    }

    var html = "";
    members.forEach(function (m) {
      if (!m || !m.id) return;
      var name = m.displayName || m.globalName || m.username || "User";
      var sub = m.username && m.username !== name ? "@" + m.username : "";
      var avatar = m.avatar || defaultAvatar(m.id);
      var bot = m.bot ? '<span class="sv-bot-badge">BOT</span>' : "";
      var status = m.status
        ? '<span class="sv-member-status sv-status-' + esc(m.status) + '"></span>'
        : "";

      html +=
        '<div class="sv-member-row" data-member-id="' +
        esc(m.id) +
        '">' +
        '<div class="sv-member-av-wrap">' +
        status +
        '<img class="sv-member-av" src="' +
        esc(avatar) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'">' +
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

    // Top bar members button
    if (t.closest("#sv-members-btn")) {
      e.preventDefault();
      e.stopPropagation();
      setTab("members");
      return;
    }

    var tab = t.closest("[data-sv-tab]");
    if (tab) {
      e.preventDefault();
      e.stopPropagation();
      setTab(tab.getAttribute("data-sv-tab"));
    }
  }

  function onServerViewOpen() {
    ensureSidebarTabs();
    openDrawer();
    setTab("channels");
  }

  function bind() {
    ensureSidebarTabs();
    document.addEventListener("click", onDocClick, true);

    ["open-server-view", "nav-server-view"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn && !btn.dataset.membersBound) {
        btn.dataset.membersBound = "1";
        btn.addEventListener("click", function () {
          setTimeout(onServerViewOpen, 100);
        });
      }
    });

    // If already in server view (script loaded late)
    var view = document.getElementById("server-view");
    if (view && !view.hidden) {
      ensureSidebarTabs();
      openDrawer();
    }
  }

  window.__svSetSidebarTab = setTab;
  window.__svLoadMembers = loadMembers;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
