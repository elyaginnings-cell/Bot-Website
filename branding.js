/**
 * Tab title + bot status + invite helpers for Settings.
 * Dashboard UI stays Coffee Shop / your bot.
 */
(function () {
  var DEFAULT_TAB_TITLE = "Amazon.com. Spend Less. Smile More.";

  function loadTabTitle() {
    try {
      var raw = localStorage.getItem("siteTabTitle");
      if (raw && String(raw).trim()) return String(raw).trim();
    } catch (e) {}
    return DEFAULT_TAB_TITLE;
  }

  function saveTabTitle(title) {
    var next = (title && String(title).trim()) || DEFAULT_TAB_TITLE;
    try {
      localStorage.setItem("siteTabTitle", next);
    } catch (e) {}
    return next;
  }

  function applyTabTitle(title) {
    document.title = title || loadTabTitle();
    var nameEl = document.getElementById("site-name");
    if (nameEl) nameEl.value = document.title;
  }

  function setMsg(id, text, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || "";
    el.style.color = ok === false ? "#ff7180" : "#57F287";
  }

  function buildInviteUrl(clientId, perms) {
    if (!clientId) return "";
    var p = encodeURIComponent(String(perms == null ? "8" : perms));
    return (
      "https://discord.com/oauth2/authorize?client_id=" +
      encodeURIComponent(clientId) +
      "&permissions=" +
      p +
      "&scope=bot%20applications.commands"
    );
  }

  async function fetchBotInfo() {
    try {
      var res = await fetch("/api/bot-status", { credentials: "include", cache: "no-store" });
      var data = await res.json().catch(function () { return {}; });
      return data;
    } catch (e) {
      return null;
    }
  }

  async function loadPresenceIntoForm() {
    try {
      var res = await fetch("/api/presence", { credentials: "include", cache: "no-store" });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) return;
      var statusEl = document.getElementById("bot-status");
      var typeEl = document.getElementById("bot-activity-type");
      var nameEl = document.getElementById("bot-activity-name");
      if (statusEl && data.status) statusEl.value = data.status;
      if (typeEl && data.activityType != null) typeEl.value = String(data.activityType);
      if (nameEl && data.activityName != null) nameEl.value = data.activityName;
    } catch (e) {}
  }

  async function refreshInvite() {
    var urlEl = document.getElementById("invite-url");
    var permsEl = document.getElementById("invite-perms");
    if (!urlEl) return;
    var info = await fetchBotInfo();
    var clientId =
      (info && info.bot && info.bot.bot && info.bot.bot.id) ||
      (info && info.bot && info.bot.id) ||
      null;
    // /api/bot-status returns { bot: { online, bot: {id...}, ... } }
    if (!clientId && info && info.bot && info.bot.bot) clientId = info.bot.bot.id;
    if (!clientId && info && info.bot && info.bot.id) clientId = info.bot.id;
    // nested shape from our proxy
    try {
      if (!clientId && info && info.bot && info.bot.bot && info.bot.bot.id) {
        clientId = info.bot.bot.id;
      }
    } catch (e) {}
    var perms = permsEl ? permsEl.value : "8";
    if (!clientId) {
      urlEl.value = "";
      urlEl.placeholder = "Bot offline or client id unavailable";
      setMsg("invite-status", "Could not load bot id — is the bot online?", false);
      return;
    }
    urlEl.value = buildInviteUrl(clientId, perms);
    setMsg("invite-status", "Invite ready.", true);
  }

  function bindSettings() {
    var saveBtn = document.getElementById("save-branding");
    if (saveBtn && !saveBtn.__bound) {
      saveBtn.__bound = true;
      saveBtn.addEventListener("click", function () {
        var nameEl = document.getElementById("site-name");
        var next = saveTabTitle(nameEl && nameEl.value);
        applyTabTitle(next);
        setMsg("branding-status", "Tab title saved.", true);
      });
    }
    var resetBtn = document.getElementById("reset-branding");
    if (resetBtn && !resetBtn.__bound) {
      resetBtn.__bound = true;
      resetBtn.addEventListener("click", function () {
        try {
          localStorage.removeItem("siteTabTitle");
        } catch (e) {}
        applyTabTitle(DEFAULT_TAB_TITLE);
        setMsg("branding-status", "Tab title reset to default.", true);
      });
    }

    var saveStatus = document.getElementById("save-bot-status");
    if (saveStatus && !saveStatus.__bound) {
      saveStatus.__bound = true;
      saveStatus.addEventListener("click", async function () {
        var status = (document.getElementById("bot-status") || {}).value || "online";
        var activityType = Number((document.getElementById("bot-activity-type") || {}).value || 0);
        var activityName = ((document.getElementById("bot-activity-name") || {}).value || "").trim();
        setMsg("bot-status-msg", "Saving…", true);
        try {
          var res = await fetch("/api/presence", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: status, activityType: activityType, activityName: activityName })
          });
          var data = await res.json().catch(function () { return {}; });
          if (!res.ok) {
            setMsg("bot-status-msg", data.error || "Failed to update status", false);
            return;
          }
          setMsg("bot-status-msg", "Bot status updated.", true);
        } catch (e) {
          setMsg("bot-status-msg", e.message || "Failed", false);
        }
      });
    }

    var permsEl = document.getElementById("invite-perms");
    if (permsEl && !permsEl.__bound) {
      permsEl.__bound = true;
      permsEl.addEventListener("change", function () {
        refreshInvite();
      });
    }

    var openInvite = document.getElementById("open-invite");
    if (openInvite && !openInvite.__bound) {
      openInvite.__bound = true;
      openInvite.addEventListener("click", function () {
        var urlEl = document.getElementById("invite-url");
        var url = urlEl && urlEl.value;
        if (!url) {
          setMsg("invite-status", "No invite link yet.", false);
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
      });
    }

    var copyInvite = document.getElementById("copy-invite");
    if (copyInvite && !copyInvite.__bound) {
      copyInvite.__bound = true;
      copyInvite.addEventListener("click", async function () {
        var urlEl = document.getElementById("invite-url");
        var url = urlEl && urlEl.value;
        if (!url) {
          setMsg("invite-status", "No invite link yet.", false);
          return;
        }
        try {
          await navigator.clipboard.writeText(url);
          setMsg("invite-status", "Copied to clipboard.", true);
        } catch (e) {
          urlEl.select();
          setMsg("invite-status", "Select and copy the link.", true);
        }
      });
    }

    loadPresenceIntoForm();
    refreshInvite();
  }

  function boot() {
    applyTabTitle(loadTabTitle());
    bindSettings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-tab="settings"]');
    if (t) setTimeout(bindSettings, 50);
  });
})();
