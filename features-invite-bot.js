/**
 * Settings → Invite bot to a server you manage.
 * Lists Discord guilds where you have Administrator or Manage Server,
 * then opens Discord's official invite URL (pre-selected guild).
 */
(function () {
  "use strict";
  if (window.__inviteBotUiV1) return;
  window.__inviteBotUiV1 = true;

  function $(id) {
    return document.getElementById(id);
  }

  function iconUrl(g) {
    if (g.icon) {
      return (
        "https://cdn.discordapp.com/icons/" +
        g.id +
        "/" +
        g.icon +
        ".png?size=64"
      );
    }
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  function ensureCard() {
    var section = $("settings");
    if (!section) return null;
    if ($("invite-bot-card")) return $("invite-bot-card");

    var card = document.createElement("div");
    card.className = "card form-card wide";
    card.id = "invite-bot-card";
    card.style.marginTop = "16px";
    card.innerHTML =
      '<span class="eyebrow">INVITE BOT</span>' +
      "<h2>Add bot to a server</h2>" +
      '<p class="form-hint">Pick a server you own or can manage. Discord will open so you can confirm the invite.</p>' +
      '<div id="invite-bot-status" class="form-hint" style="margin-bottom:10px"></div>' +
      '<div id="invite-bot-list" style="display:flex;flex-direction:column;gap:8px;max-height:320px;overflow:auto"></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">' +
      '<button type="button" class="button" id="invite-bot-refresh">Refresh servers</button>' +
      '<button type="button" class="button secondary" id="invite-bot-generic">Open generic invite</button>' +
      '<a class="button secondary" id="invite-bot-relogin" href="/api/login" style="display:none;text-decoration:none">Log in with Discord</a>' +
      "</div>";

    section.appendChild(card);
    return card;
  }

  function setStatus(msg, ok) {
    var el = $("invite-bot-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  function renderGuilds(data) {
    var list = $("invite-bot-list");
    var relogin = $("invite-bot-relogin");
    if (!list) return;

    if (data.needsDiscord) {
      list.innerHTML =
        '<p class="form-hint">' +
        (data.message ||
          "Log in with Discord to see servers you can invite the bot to.") +
        "</p>";
      if (relogin) relogin.style.display = "inline-flex";
      window.__inviteBotGeneric = data.genericInvite || null;
      return;
    }

    if (relogin) relogin.style.display = "none";
    window.__inviteBotGeneric = data.genericInvite || null;

    var guilds = data.guilds || [];
    if (!guilds.length) {
      list.innerHTML =
        '<p class="form-hint">No servers found where you have <strong>Administrator</strong> or <strong>Manage Server</strong>.</p>';
      return;
    }

    list.innerHTML = guilds
      .map(function (g) {
        var badge = g.botInServer
          ? '<span style="font-size:11px;opacity:.75;margin-left:6px">Already in server</span>'
          : '<span style="font-size:11px;color:#4ade80;margin-left:6px">Not in server</span>';
        var owner = g.owner ? " · Owner" : "";
        return (
          '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(128,128,128,.28);background:rgba(0,0,0,.1)">' +
          '<img src="' +
          iconUrl(g) +
          '" alt="" width="40" height="40" style="border-radius:12px;flex-shrink:0" onerror="this.src=\'https://cdn.discordapp.com/embed/avatars/0.png\'">' +
          '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          String(g.name || "Server").replace(/</g, "<") +
          badge +
          "</div>" +
          '<div class="form-hint" style="margin:0;font-size:12px">' +
          g.id +
          owner +
          "</div></div>" +
          '<button type="button" class="button" data-invite-url="' +
          String(g.inviteUrl || "").replace(/"/g, """) +
          '"' +
          (g.botInServer ? ' style="opacity:.9"' : "") +
          ">" +
          (g.botInServer ? "Re-invite" : "Invite") +
          "</button></div>"
        );
      })
      .join("");
  }

  async function load() {
    ensureCard();
    setStatus("Loading servers…", true);
    try {
      var res = await fetch("/api/invite-bot", {
        credentials: "include",
        cache: "no-store",
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        setStatus(data.error || "Could not load servers.", false);
        return;
      }
      renderGuilds(data);
      if (data.ok) {
        setStatus(
          "Showing " +
            (data.guilds || []).length +
            " server(s) you can manage.",
          true
        );
      } else {
        setStatus(data.message || "", data.needsDiscord ? false : true);
      }
    } catch (e) {
      setStatus("Network error loading servers.", false);
    }
  }

  function bind() {
    ensureCard();
    var list = $("invite-bot-list");
    if (list && !list.dataset.bound) {
      list.dataset.bound = "1";
      list.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-invite-url]");
        if (!btn) return;
        var url = btn.getAttribute("data-invite-url");
        if (!url) return;
        window.open(url, "_blank", "noopener,noreferrer");
      });
    }
    var refresh = $("invite-bot-refresh");
    if (refresh && !refresh.dataset.bound) {
      refresh.dataset.bound = "1";
      refresh.addEventListener("click", load);
    }
    var generic = $("invite-bot-generic");
    if (generic && !generic.dataset.bound) {
      generic.dataset.bound = "1";
      generic.addEventListener("click", function () {
        if (window.__inviteBotGeneric) {
          window.open(window.__inviteBotGeneric, "_blank", "noopener,noreferrer");
        } else {
          load().then(function () {
            if (window.__inviteBotGeneric) {
              window.open(
                window.__inviteBotGeneric,
                "_blank",
                "noopener,noreferrer"
              );
            } else {
              setStatus("Invite link not ready yet.", false);
            }
          });
        }
      });
    }
  }

  function onShow() {
    if (typeof window.showSection !== "function" || window.showSection.__inviteBot) {
      return;
    }
    var orig = window.showSection;
    window.showSection = function (tab) {
      var r = orig.apply(this, arguments);
      if (String(tab) === "settings") {
        setTimeout(function () {
          bind();
          load();
        }, 40);
      }
      return r;
    };
    window.showSection.__inviteBot = true;
  }

  document.addEventListener(
    "click",
    function (e) {
      var t = e.target && e.target.closest && e.target.closest('[data-tab="settings"]');
      if (t) {
        setTimeout(function () {
          bind();
          load();
        }, 50);
      }
    },
    true
  );

  [0, 500, 1500, 4000].forEach(function (ms) {
    setTimeout(function () {
      onShow();
      bind();
      if ($("settings") && $("settings").classList.contains("active")) load();
    }, ms);
  });

  console.log("[invite-bot] settings panel ready");
})();
