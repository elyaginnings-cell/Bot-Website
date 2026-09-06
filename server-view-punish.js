(function () {
  "use strict";
  var state = { userId: "", userName: "", messageId: "", channelId: "" };

  function ensureStyles() {
    if (document.querySelector('link[data-sv-punish-css]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "server-view-punish.css?v=4";
    l.dataset.svPunishCss = "1";
    document.head.appendChild(l);
  }

  function getServer() {
    if (window.selectedServer && window.selectedServer.id) return window.selectedServer;
    var nameEl = document.getElementById("sv-server-name") || document.getElementById("selected-server-name");
    var id = window.__svGuildId || (window.selectedServer && window.selectedServer.id);
    if (id) return { id: id, name: nameEl ? nameEl.textContent : "Server" };
    return null;
  }

  function getActiveChannelId() {
    // Prefer channel title data, fall back to any selected channel button
    var active = document.querySelector("#sv-channel-list .sv-ch.active");
    if (active && active.getAttribute("data-channel-id")) return active.getAttribute("data-channel-id");
    return state.channelId || "";
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
    document.getElementById("sv-punish-apply").addEventListener("click", submitPunish);
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
  }

  window.openPunishModal = function (info) {
    ensureModal();
    info = info || {};
    var userId = String(info.userId || info.user_id || "").trim();
    var userName = String(info.userName || info.user_name || "user").trim() || "user";
    var messageId = String(info.messageId || info.message_id || "").trim();
    var channelId = String(info.channelId || info.channel_id || getActiveChannelId() || "").trim();

    state = {
      userId: userId,
      userName: userName,
      messageId: messageId,
      channelId: channelId
    };

    var server = getServer();
    if (server && server.id) window.__svGuildId = server.id;

    var name = document.getElementById("sv-punish-name");
    var reason = document.getElementById("sv-punish-reason");
    var msg = document.getElementById("sv-punish-msg");
    var action = document.getElementById("sv-punish-action");
    if (name) name.textContent = state.userName || "user";
    if (reason) reason.value = "";
    if (msg) {
      msg.textContent = state.userId ? "" : "No user id on that message — try another message.";
      msg.style.color = state.userId ? "#57F287" : "#f23f43";
    }
    if (action) action.value = "warn";
    syncDuration();

    var modal = document.getElementById("sv-punish-modal");
    if (modal) {
      modal.hidden = false;
      document.body.classList.add("sv-punish-open");
    }
    if (reason) reason.focus();
  };

  async function submitPunish() {
    var server = getServer();
    if (!server || !server.id) {
      var m = document.getElementById("sv-punish-msg");
      if (m) {
        m.textContent = "No server selected. Open Server View from a chosen server.";
        m.style.color = "#f23f43";
      }
      return;
    }
    if (!state.userId) {
      var m2 = document.getElementById("sv-punish-msg");
      if (m2) {
        m2.textContent = "No user selected.";
        m2.style.color = "#f23f43";
      }
      return;
    }
    var action = document.getElementById("sv-punish-action").value;
    var reason =
      (document.getElementById("sv-punish-reason").value || "").trim() || "No reason provided";
    var duration = document.getElementById("sv-punish-duration").value || "10m";
    var msg = document.getElementById("sv-punish-msg");
    var btn = document.getElementById("sv-punish-apply");
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
          guildId: server.id,
          channelId: state.channelId || getActiveChannelId() || "punish",
          action: action,
          userId: state.userId,
          reason: reason,
          duration: duration,
          evidence: state.messageId || null,
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
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Capture-phase click so we always get user id even if other handlers fail
  function onDocClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-punish-user], .sv-punish-btn") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    var userId = btn.getAttribute("data-punish-user") || "";
    var userName = btn.getAttribute("data-punish-name") || "user";
    var messageId = btn.getAttribute("data-punish-msg") || "";

    // Fallback: parent message row
    if (!userId) {
      var row = btn.closest("[data-author-id], .sv-msg");
      if (row) {
        userId = row.getAttribute("data-author-id") || "";
        if (!messageId) messageId = row.getAttribute("data-message-id") || "";
        var authorEl = row.querySelector(".sv-author");
        if (authorEl && userName === "user") userName = authorEl.textContent.trim() || "user";
      }
    }

    userId = String(userId || "").trim();
    window.openPunishModal({
      userId: userId,
      userName: userName,
      messageId: messageId,
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
