/**
 * Server View - Members tab
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

  function getListEl() {
    return document.getElementById("sv-member-list");
  }

  function setListHtml(html) {
    var list = getListEl();
    if (!list) {
      console.warn("[members] #sv-member-list missing");
      return;
    }
    list.innerHTML = html;
    list.style.display = "block";
    list.style.visibility = "visible";
    list.style.minHeight = "180px";
    list.style.color = "#dbdee1";
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
        memberPanel.style.visibility = "visible";
        memberPanel.removeAttribute("hidden");
      } else {
        memberPanel.hidden = true;
        memberPanel.style.display = "none";
        memberPanel.setAttribute("hidden", "hidden");
      }
    }

    if (activeTab === "members") {
      setListHtml('<p class="sv-empty">Loading members…</p>');
      loadMembers();
    }
    return false;
  }

  window.svSwitchTab = setTab;
  window.__svSetSidebarTab = setTab;

  function loadMembers(query) {
    var server = getServer();
    if (!server || !server.id) {
      setListHtml('<p class="sv-empty">No server selected. Choose a server first.</p>');
      return;
    }

    if (loading) return;
    loading = true;
    setListHtml('<p class="sv-empty">Loading members…</p>');

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
        return res.text().then(function (text) {
          var data = {};
          try {
            data = text ? JSON.parse(text) : {};
          } catch (e) {
            data = { error: "Bad JSON from API", raw: String(text).slice(0, 200) };
          }
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          throw new Error(
            result.data.error ||
              "Failed to load members (HTTP " + result.status + ")"
          );
        }

        var members = Array.isArray(result.data.members)
          ? result.data.members
          : Array.isArray(result.data)
            ? result.data
            : [];

        membersCache = members;
        window.membersCache = membersCache;
        renderMembers(members, result.data);
      })
      .catch(function (err) {
        setListHtml(
          '<p class="sv-empty sv-error"><strong>Could not load members</strong><br>' +
            esc(err.message || "Unknown error") +
            "</p>"
        );
      })
      .then(function () {
        loading = false;
      });
  }

  window.__svLoadMembers = loadMembers;

  function renderMembers(members, meta) {
    meta = meta || {};

    if (!members || !members.length) {
      var bits = [];
      bits.push("<strong>No members returned</strong>");
      if (meta.memberCount != null) {
        bits.push("Server memberCount: " + esc(meta.memberCount));
      }
      if (meta.cached != null) bits.push("Cached: " + esc(meta.cached));
      if (meta.source) bits.push("Source: " + esc(meta.source));
      if (meta.fetchError) bits.push("Error: " + esc(meta.fetchError));
      bits.push("Redeploy the bot on Railway if this stays empty.");
      setListHtml('<p class="sv-empty">' + bits.join("<br>") + "</p>");
      return;
    }

    var html =
      '<p class="sv-empty" style="padding:6px 10px;font-size:12px;opacity:0.85">' +
      members.length +
      " member" +
      (members.length === 1 ? "" : "s") +
      "</p>";

    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      if (!m || !m.id) continue;

      var name = m.displayName || m.globalName || m.username || "User";
      var sub = m.username && m.username !== name ? "@" + m.username : "";
      var avatar = m.avatar || defaultAvatar(m.id);
      var bot = m.bot ? '<span class="sv-bot-badge">BOT</span>' : "";

      html += '<div class="sv-member-row" data-member-id="' + esc(m.id) + '">';
      html += '<div class="sv-member-av-wrap">';
      html +=
        '<img class="sv-member-av" src="' +
        esc(avatar) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'">';
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

    setListHtml(html);
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

    var tabBtn =
      t.getAttribute && t.getAttribute("data-sv-tab")
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
