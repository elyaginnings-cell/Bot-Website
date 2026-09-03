/**
 * Server View — complete rewrite
 * Depends on window.selectedServer and window.channelsCache from script.js
 */
(function () {
  "use strict";

  var activeChannelId = null;
  var pollTimer = null;
  var knownIds = {};
  var lastMessages = [];
  var loading = false;
  var sending = false;
  var bound = false;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getServer() {
    return window.selectedServer || null;
  }

  function getChannels() {
    var list = window.channelsCache;
    return Array.isArray(list) ? list : [];
  }

  function openDrawer() {
    var v = document.getElementById("server-view");
    if (v) v.classList.add("drawer-open");
  }
  function closeDrawer() {
    var v = document.getElementById("server-view");
    if (v) v.classList.remove("drawer-open");
  }

  function loadPrefs() {
    var theme = localStorage.getItem("svTheme") || "discord";
    var density = localStorage.getItem("svDensity") || "default";
    var fontSize = localStorage.getItem("svFontSize") || "16";
    var te = document.getElementById("sv-theme");
    var de = document.getElementById("sv-density");
    var fe = document.getElementById("sv-font-size");
    if (te) te.value = theme;
    if (de) de.value = density;
    if (fe) fe.value = fontSize;
    applyPrefs();
  }

  function applyPrefs() {
    var view = document.getElementById("server-view");
    if (!view) return;
    var theme = (document.getElementById("sv-theme") || {}).value || "discord";
    var density = (document.getElementById("sv-density") || {}).value || "default";
    var fontSize = (document.getElementById("sv-font-size") || {}).value || "16";
    view.classList.remove(
      "theme-darker",
      "theme-light",
      "theme-garden",
      "density-compact",
      "density-cozy"
    );
    if (theme === "darker") view.classList.add("theme-darker");
    if (theme === "light") view.classList.add("theme-light");
    if (theme === "garden") view.classList.add("theme-garden");
    if (density === "compact") view.classList.add("density-compact");
    if (density === "cozy") view.classList.add("density-cozy");
    view.style.setProperty("--sv-font-size", fontSize + "px");
    localStorage.setItem("svTheme", theme);
    localStorage.setItem("svDensity", density);
    localStorage.setItem("svFontSize", fontSize);
  }

  function openServerView() {
    var server = getServer();
    if (!server || !server.id) {
      alert("Choose a server first (Choose Server button).");
      return;
    }
    var app = document.getElementById("app");
    var view = document.getElementById("server-view");
    if (!view) {
      alert("Server View HTML is missing.");
      return;
    }
    if (app) app.hidden = true;
    view.hidden = false;
    document.body.classList.add("server-view-open");

    var nameEl = document.getElementById("sv-server-name");
    if (nameEl) nameEl.textContent = server.name || "Server";
    var pill = document.getElementById("sv-server-pill");
    if (pill) pill.textContent = server.name || "Server";

    var nameInput = document.getElementById("sv-display-name");
    if (nameInput && !nameInput.value) {
      nameInput.value = localStorage.getItem("svDisplayName") || "";
    }

    applyPrefs();
    closeDrawer();
    renderChannels();

    if (activeChannelId) {
      loadMessages(true);
    } else if (window.matchMedia("(max-width: 768px)").matches) {
      openDrawer();
    }

    startPoll();
  }

  function closeServerView() {
    stopPoll();
    closeDrawer();
    var panel = document.getElementById("sv-settings-panel");
    if (panel) panel.hidden = true;
    var app = document.getElementById("app");
    var view = document.getElementById("server-view");
    if (view) view.hidden = true;
    if (app) app.hidden = false;
    document.body.classList.remove("server-view-open");
  }

  function renderChannels() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    var channels = getChannels();
    var cats = channels.filter(function (c) {
      return c.type === 4;
    });
    var texts = channels.filter(function (c) {
      return c.type === 0 || c.type === 5;
    });

    if (!texts.length) {
      list.innerHTML =
        '<p class="sv-empty">No text channels.<br>Pick a server and wait for channels to load.</p>';
      return;
    }

    var byParent = {};
    texts.forEach(function (ch) {
      var key = ch.parentId || "_none";
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(ch);
    });

    var html = "";
    var ordered = ["_none"].concat(
      cats.map(function (c) {
        return c.id;
      })
    );
    var seen = {};

    ordered.forEach(function (pid) {
      var group = byParent[pid];
      if (!group || !group.length) return;
      seen[pid] = true;
      var cat = cats.find(function (c) {
        return c.id === pid;
      });
      if (cat) html += '<div class="sv-cat">' + esc(cat.name) + "</div>";
      else if (pid === "_none") html += '<div class="sv-cat">Text channels</div>';
      group
        .slice()
        .sort(function (a, b) {
          return (a.position || 0) - (b.position || 0) || String(a.name).localeCompare(String(b.name));
        })
        .forEach(function (ch) {
          var active = ch.id === activeChannelId ? " active" : "";
          html +=
            '<button type="button" class="sv-ch' +
            active +
            '" data-id="' +
            esc(ch.id) +
            '"><span class="sv-hash">#</span>' +
            esc(ch.name) +
            "</button>";
        });
    });

    Object.keys(byParent).forEach(function (pid) {
      if (seen[pid]) return;
      byParent[pid].forEach(function (ch) {
        var active = ch.id === activeChannelId ? " active" : "";
        html +=
          '<button type="button" class="sv-ch' +
          active +
          '" data-id="' +
          esc(ch.id) +
          '"><span class="sv-hash">#</span>' +
          esc(ch.name) +
          "</button>";
      });
    });

    list.innerHTML = html;
    var buttons = list.querySelectorAll(".sv-ch");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (e) {
        var btn = e.currentTarget;
        selectChannel(btn.getAttribute("data-id"), btn.textContent);
      });
    }
  }

  function selectChannel(id, title) {
    activeChannelId = id;
    knownIds = {};
    lastMessages = [];
    var clean = String(title || "channel").replace(/^\s*#\s*/, "").trim();
    var titleEl = document.getElementById("sv-channel-title");
    if (titleEl) titleEl.textContent = clean;
    var input = document.getElementById("sv-input");
    var send = document.getElementById("sv-send");
    if (input) {
      input.disabled = false;
      input.placeholder = "Message #" + clean;
    }
    if (send) send.disabled = false;
    closeDrawer();
    renderChannels();
    loadMessages(true);
  }

  function loadMessages(full) {
    var server = getServer();
    if (!server || !server.id || !activeChannelId || loading) return;
    loading = true;
    var params = new URLSearchParams({
      guildId: server.id,
      channelId: activeChannelId,
      limit: "50",
    });
    fetch("/api/messages?" + params.toString(), {
      credentials: "include",
      cache: "no-store",
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        var box = document.getElementById("sv-messages");
        if (!box) return;
        if (!result.ok) {
          box.innerHTML =
            '<p class="sv-empty">❌ ' +
            esc((result.data && result.data.error) || "Failed to load (" + result.status + ")") +
            "</p>";
          return;
        }
        var messages = (result.data && result.data.messages) || [];
        if (full) {
          knownIds = {};
          messages.forEach(function (m) {
            knownIds[m.id] = true;
          });
          lastMessages = messages;
          renderMessages(messages);
        } else {
          var atBottom =
            box.scrollHeight - box.scrollTop - box.clientHeight < 120;
          var fresh = messages.filter(function (m) {
            return !knownIds[m.id];
          });
          if (fresh.length) {
            fresh.forEach(function (m) {
              knownIds[m.id] = true;
              lastMessages.push(m);
            });
            renderMessages(lastMessages.slice(-60));
            if (atBottom) box.scrollTop = box.scrollHeight;
          }
        }
      })
      .catch(function (err) {
        console.error(err);
        var box = document.getElementById("sv-messages");
        if (box)
          box.innerHTML =
            '<p class="sv-empty">❌ Network error loading messages</p>';
      })
      .finally(function () {
        loading = false;
      });
  }

  function formatContent(content) {
    if (!content) return "";
    var text = esc(content);
    text = text.replace(
      /(https?:\/\/[^\s&lt;]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return text;
  }

  function messageHtml(m, grouped) {
    var author = m.author || {};
    var name =
      author.displayName ||
      author.nickname ||
      author.globalName ||
      author.username ||
      "Unknown";
    var bot = author.bot ? '<span class="sv-bot">BOT</span>' : "";
    var time = m.createdTimestamp
      ? new Date(m.createdTimestamp).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    var av =
      author.avatar
        ? '<img class="sv-av" src="' + esc(author.avatar) + '" alt="">'
        : '<div class="sv-av fallback">☕</div>';
    var body = formatContent(m.content || "");
    var atts = (m.attachments || [])
      .map(function (a) {
        if (a.contentType && a.contentType.indexOf("image/") === 0) {
          return (
            '<img class="sv-img" src="' +
            esc(a.url) +
            '" alt="" data-full="' +
            esc(a.url) +
            '">'
          );
        }
        return (
          '<a class="sv-file" href="' +
          esc(a.url) +
          '" target="_blank" rel="noopener">📎 ' +
          esc(a.name || "file") +
          "</a>"
        );
      })
      .join("");
    if (!body && !atts) body = '<em style="opacity:.6">(empty)</em>';
    return (
      '<div class="sv-msg' +
      (grouped ? " grouped" : "") +
      '" data-id="' +
      esc(m.id) +
      '">' +
      '<div class="sv-av-wrap">' +
      av +
      "</div>" +
      '<div class="sv-msg-body">' +
      '<div class="sv-msg-meta"><strong>' +
      esc(name) +
      "</strong>" +
      bot +
      '<span class="sv-time">' +
      esc(time) +
      "</span></div>" +
      (body ? '<div class="sv-msg-text">' + body + "</div>" : "") +
      atts +
      "</div></div>"
    );
  }

  function renderMessages(messages) {
    var box = document.getElementById("sv-messages");
    if (!box) return;
    if (!messages.length) {
      box.innerHTML =
        '<p class="sv-empty">No messages yet.<br>Say something!</p>';
      return;
    }
    var html = "";
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var prev = i > 0 ? messages[i - 1] : null;
      var grouped =
        prev &&
        prev.author &&
        m.author &&
        prev.author.id === m.author.id &&
        m.createdTimestamp - prev.createdTimestamp < 7 * 60 * 1000;
      html += messageHtml(m, grouped);
    }
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  }

  function onMessagesClick(e) {
    var t = e.target;
    if (t && t.matches && t.matches("img.sv-img")) {
      openLightbox(t.getAttribute("data-full") || t.src);
    }
  }

  function openLightbox(src) {
    var box = document.getElementById("sv-lightbox");
    var img = document.getElementById("sv-lightbox-img");
    if (!box || !img) return;
    img.src = src;
    box.hidden = false;
  }
  function closeLightbox() {
    var box = document.getElementById("sv-lightbox");
    if (box) box.hidden = true;
  }

  function sendMessage(e) {
    e.preventDefault();
    if (sending) return;
    var server = getServer();
    var input = document.getElementById("sv-input");
    var sendBtn = document.getElementById("sv-send");
    var content = input && input.value ? input.value.trim() : "";
    if (!content || !server || !server.id || !activeChannelId) return;

    var username =
      ((document.getElementById("sv-display-name") || {}).value ||
        localStorage.getItem("svDisplayName") ||
        "").trim().slice(0, 80);
    if (username) localStorage.setItem("svDisplayName", username);

    sending = true;
    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    var params = new URLSearchParams({
      guildId: server.id,
      channelId: activeChannelId,
    });
    var payload = { content: content };
    if (username) payload.username = username;

    fetch("/api/messages?" + params.toString(), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          alert(
            (result.data && result.data.error) ||
              "Send failed (" + result.status + ")"
          );
          return;
        }
        if (input) input.value = "";
        if (result.data && result.data.message && result.data.message.id) {
          knownIds[result.data.message.id] = true;
          lastMessages.push(result.data.message);
          renderMessages(lastMessages.slice(-60));
        } else {
          loadMessages(true);
        }
      })
      .catch(function (err) {
        console.error(err);
        alert((err && err.message) || "Send failed");
      })
      .finally(function () {
        sending = false;
        if (input) {
          input.disabled = false;
          input.focus();
        }
        if (sendBtn) sendBtn.disabled = false;
      });
  }

  function startPoll() {
    stopPoll();
    pollTimer = setInterval(function () {
      var view = document.getElementById("server-view");
      if (view && !view.hidden) loadMessages(false);
    }, 3500);
  }
  function stopPoll() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function bindOnce() {
    if (bound) return;
    bound = true;
    var closeBtn = document.getElementById("close-server-view");
    if (closeBtn) closeBtn.addEventListener("click", closeServerView);
    var backBtn = document.getElementById("sv-back");
    if (backBtn) backBtn.addEventListener("click", closeServerView);
    var refresh = document.getElementById("sv-refresh");
    if (refresh)
      refresh.addEventListener("click", function () {
        loadMessages(true);
      });
    var form = document.getElementById("sv-composer");
    if (form) form.addEventListener("submit", sendMessage);
    var settingsBtn = document.getElementById("sv-settings-btn");
    if (settingsBtn)
      settingsBtn.addEventListener("click", function () {
        var panel = document.getElementById("sv-settings-panel");
        if (panel) panel.hidden = !panel.hidden;
      });
    ["sv-theme", "sv-density", "sv-font-size"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", applyPrefs);
    });
    var lightbox = document.getElementById("sv-lightbox");
    if (lightbox) lightbox.addEventListener("click", closeLightbox);
    var menu = document.getElementById("sv-menu-btn");
    if (menu) menu.addEventListener("click", openDrawer);
    var chClose = document.getElementById("sv-channels-close");
    if (chClose) chClose.addEventListener("click", closeDrawer);
    var backdrop = document.getElementById("sv-drawer-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeDrawer);
    var msgs = document.getElementById("sv-messages");
    if (msgs) msgs.addEventListener("click", onMessagesClick);
    var nameInput = document.getElementById("sv-display-name");
    if (nameInput) {
      nameInput.value = localStorage.getItem("svDisplayName") || "";
      nameInput.addEventListener("change", function () {
        localStorage.setItem(
          "svDisplayName",
          nameInput.value.trim().slice(0, 80)
        );
      });
    }
    loadPrefs();
  }

  window.openServerView = openServerView;
  window.closeServerView = closeServerView;

  function boot() {
    bindOnce();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
