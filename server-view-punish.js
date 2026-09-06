(function () {
  "use strict";
  var state = { userId: "", userName: "", messageId: "", channelId: "" };
  var submitting = false;

  function ensureStyles() {
    if (document.querySelector('link[data-sv-punish-css]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "server-view-punish.css?v=5";
    l.dataset.svPunishCss = "1";
    document.head.appendChild(l);
  }

  function getServer() {
    if (window.selectedServer && window.selectedServer.id) return window.selectedServer;
    var nameEl = document.getElementById("sv-server-name") || document.getElementById("selected-server-name");
    var id = window.__svGuildId || (window.selectedServer && window.selectedServer.id);
    if (id) return { id: String(id), name: nameEl ? nameEl.textContent : "Server" };
    return null;
  }

  function getActiveChannelId() {
    var active = document.querySelector("#sv-channel-list .sv-ch.active");
    if (active) {
      var id =
        active.getAttribute("data-channel-id") ||
        active.dataset.channelId ||
        "";
      if (id) return String(id);
    }
    return state.channelId || "";
  }

  function decodeAttr(value) {
    if (value == null) return "";
    var s = String(value);
    s = s
      .replace(/"/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .trim();
    return s;
  }

  function ensureModal() {
    ensureStyles();
    if (document.getElementById("sv-punish-modal")) return;
    var wrap = document.createElement("div");
    wrap.id = "sv-punish-modal";
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="sv-punish-card">' +
      '<h3>Punish <span id="sv-punish-name">user</span></h3>' +
      '<label>Action<select id="sv-punish-action">' +
      '<option value="warn">Warn</option>' +
      '<option value="mute">Mute</option>' +
      '<option value="kick">Kick</option>' +
      '<option value="ban">Ban</option>' +
      '</select></label>' +
      '<label id="sv-punish-duration-wrap">Mute duration' +
      '<input id="sv-punish-duration" type="text" value="10m" placeholder="10m, 1h, 1d">' +
      '</label>' +
      '<label>Reason<input id="sv-punish-reason" type="text" maxlength="400" placeholder="Reason"></label>' +
      '<p class="sv-punish-msg" id="sv-punish-msg"></p>' +
      '<div class="sv-punish-actions">' +
      '<button type="button" class="sv-punish-cancel" id="sv-punish-cancel">Cancel</button>' +
      '<button type="button" class="sv-punish-apply" id="sv-punish-apply">Apply</button>' +
      '</div></div>';
    document.body.appendChild(wrap);
    document.getElementById("sv-punish-cancel").addEventListener("click", closeModalAndFlag);
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap) closeModalAndFlag();
    });
    document.getElementById("sv-punish-apply").addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      submitPunish();
    });
    document.getElementById("sv-punish-action").addEventListener("change", syncDuration);
    syncDuration();
  }

  function syncDuration() {
    var action = document.getElementById("sv-punish-action");
    var wrap = document.getElementById("sv-punish-duration-wrap");
    if (wrap) wrap.style.display = action && action.value === "mute" ? "block" : "none";
  }

  function closeModal() {
    var modal = document.getElementById("sv-punish-modal");
    if (modal) modal.hidden = true;
  }

  function closeModalAndFlag() {
    closeModal();
    document.body.classList.remove("sv-punish-open");
    submitting = false;
  }

  function currentUserId() {
    var modal = document.getElementById("sv-punish-modal");
    var fromModal = modal && (modal.dataset.userId || modal.getAttribute("data-user-id"));
    return String(state.userId || fromModal || window.__svPunishUserId || "").trim();
  }

  window.openPunishModal = function (info) {
    ensureModal();
    submitting = false;
    info = info || {};
    var userId = decodeAttr(info.userId || info.user_id || "");
    var userName = decodeAttr(info.userName || info.user_name || "user") || "user";
    var messageId = decodeAttr(info.messageId || info.message_id || "");
    var channelId = decodeAttr(info.channelId || info.channel_id || getActiveChannelId() || "");

    if (userId && !/^\d{5,}$/.test(userId)) {
      var m = userId.match(/(\d{17,20})/);
      if (m) userId = m[1];
    }

    state = {
      userId: userId,
      userName: userName,
      messageId: messageId,
      channelId: channelId
    };
    window.__svPunishUserId = userId;
    window.__svPunishState = state;

    var server = getServer();
    if (server && server.id) window.__svGuildId = String(server.id);

    var modal = document.getElementById("sv-punish-modal");
    if (modal) {
      modal.dataset.userId = userId;
      modal.dataset.userName = userName;
      modal.dataset.messageId = messageId;
      modal.dataset.channelId = channelId;
      modal.hidden = false;
      document.body.classList.add("sv-punish-open");
    }

    var name = document.getElementById("sv-punish-name");
    var reason = document.getElementById("sv-punish-reason");
    var msg = document.getElementById("sv-punish-msg");
    var action = document.getElementById("sv-punish-action");
    var btn = document.getElementById("sv-punish-apply");
    if (name) name.textContent = userName || "user";
    if (reason) reason.value = "";
    if (btn) btn.disabled = false;
    if (msg) {
      if (userId) {
        msg.textContent = "User: " + userId;
        msg.style.color = "#949ba4";
      } else {
        msg.textContent = "No user id on that message — try another message.";
        msg.style.color = "#f23f43";
      }
    }
    if (action) action.value = "warn";
    syncDuration();
    if (reason) reason.focus();
  };

  async function submitPunish() {
    if (submitting) return;
    submitting = true;

    var server = getServer();
    if (!server || !server.id) {
      var m = document.getElementById("sv-punish-msg");
      if (m) {
        m.textContent = "No server selected. Open Server View from a chosen server.";
        m.style.color = "#f23f43";
      }
      submitting = false;
      return;
    }

    var userId = currentUserId();
    if (!userId) {
      var m2 = document.getElementById("sv-punish-msg");
      if (m2) {
        m2.textContent = "No user selected.";
        m2.style.color = "#f23f43";
      }
      submitting = false;
      return;
    }

    var action = document.getElementById("sv-punish-action").value;
    var reason =
      (document.getElementById("sv-punish-reason").value || "").trim() || "No reason provided";
    var duration = document.getElementById("sv-punish-duration").value || "10m";
    var msg = document.getElementById("sv-punish-msg");
    var btn = document.getElementById("sv-punish-apply");
    var messageId =
      state.messageId ||
      (document.getElementById("sv-punish-modal") &&
        document.getElementById("sv-punish-modal").dataset.messageId) ||
      "";
    var channelId =
      state.channelId ||
      getActiveChannelId() ||
      (document.getElementById("sv-punish-modal") &&
        document.getElementById("sv-punish-modal").dataset.channelId) ||
      "punish";

    if (msg) {
      msg.textContent = "Applying…";
      msg.style.color = "#dbdee1";
    }
    if (btn) btn.disabled = true;
    try {
      var res = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: String(server.id),
          channelId: String(channelId),
          action: action,
          userId: String(userId),
          reason: reason,
          duration: duration,
          evidence: messageId || null,
          moderatorTag: "Dashboard"
        })
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok || data.ok === false) throw new Error(data.error || "Punish failed");
      if (msg) {
        msg.textContent = data.message || "Done.";
        msg.style.color = "#57F287";
      }
      setTimeout(function () {
        closeModalAndFlag();
      }, 900);
    } catch (err) {
      if (msg) {
        msg.textContent = err.message || "Failed";
        msg.style.color = "#f23f43";
      }
      submitting = false;
      if (btn) btn.disabled = false;
    }
  }

  function extractFromButton(btn) {
    if (!btn) return { userId: "", userName: "user", messageId: "" };
    var userId =
      decodeAttr(btn.getAttribute("data-punish-user")) ||
      decodeAttr(btn.dataset.punishUser) ||
      "";
    var userName =
      decodeAttr(btn.getAttribute("data-punish-name")) ||
      decodeAttr(btn.dataset.punishName) ||
      "user";
    var messageId =
      decodeAttr(btn.getAttribute("data-punish-msg")) ||
      decodeAttr(btn.dataset.punishMsg) ||
      "";

    var row = btn.closest(".sv-msg, [data-author-id]");
    if (row) {
      if (!userId) {
        userId =
          decodeAttr(row.getAttribute("data-author-id")) ||
          decodeAttr(row.dataset.authorId) ||
          "";
      }
      if (!messageId) {
        messageId =
          decodeAttr(row.getAttribute("data-message-id")) ||
          decodeAttr(row.dataset.messageId) ||
          "";
      }
      if (!userName || userName === "user") {
        var authorEl = row.querySelector(".sv-author");
        if (authorEl) userName = authorEl.textContent.trim() || userName;
      }
    }
    return { userId: userId, userName: userName, messageId: messageId };
  }

  function onDocClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var btn = t.closest(".sv-punish-btn, [data-punish-user]");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    var info = extractFromButton(btn);
    window.openPunishModal({
      userId: info.userId,
      userName: info.userName,
      messageId: info.messageId,
      channelId: getActiveChannelId()
    });
  }

  function boot() {
    ensureModal();
    if (!document.documentElement.dataset.svPunishClick) {
      document.documentElement.dataset.svPunishClick = "1";
      document.addEventListener("click", onDocClick, true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
