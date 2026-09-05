(function () {
  "use strict";
  var state = { userId: "", userName: "", messageId: "", channelId: "" };
  function ensureStyles() {
    if (document.querySelector('link[data-sv-punish-css]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "server-view-punish.css?v=1";
    l.dataset.svPunishCss = "1";
    document.head.appendChild(l);
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
    document.getElementById("sv-punish-cancel").addEventListener("click", closeModal);
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap) closeModal();
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
  window.openPunishModal = function (info) {
    ensureModal();
    state = info || state;
    var name = document.getElementById("sv-punish-name");
    var reason = document.getElementById("sv-punish-reason");
    var msg = document.getElementById("sv-punish-msg");
    if (name) name.textContent = state.userName || "user";
    if (reason) reason.value = "";
    if (msg) msg.textContent = "";
    var modal = document.getElementById("sv-punish-modal");
    if (modal) modal.hidden = false;
    if (reason) reason.focus();
  };
  async function submitPunish() {
    var server = window.selectedServer;
    if (!server || !server.id) { alert("Choose a server first."); return; }
    if (!state.userId) { alert("No user selected."); return; }
    var action = document.getElementById("sv-punish-action").value;
    var reason = (document.getElementById("sv-punish-reason").value || "").trim() || "No reason provided";
    var duration = document.getElementById("sv-punish-duration").value || "10m";
    var msg = document.getElementById("sv-punish-msg");
    var btn = document.getElementById("sv-punish-apply");
    if (msg) msg.textContent = "Applying…";
    if (btn) btn.disabled = true;
    try {
      var res = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guildId: server.id,
          channelId: state.channelId || "punish",
          action: action,
          userId: state.userId,
          reason: reason,
          duration: duration,
          evidence: state.messageId || null
        })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok || data.ok === false) throw new Error(data.error || "Punish failed");
      if (msg) msg.textContent = data.message || "Done.";
      setTimeout(closeModal, 900);
    } catch (err) {
      if (msg) msg.textContent = err.message || "Failed";
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureModal);
  else ensureModal();
})();
