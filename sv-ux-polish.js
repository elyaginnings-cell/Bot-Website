/**
 * UX polish:
 * - Reply / React / Punish on right-click (message actions hidden)
 * - Quieter poll
 * - Does NOT hide member-list punish
 */
(function () {
  "use strict";
  if (window.__svUxPolishV2) return;
  window.__svUxPolishV2 = true;

  function injectCss() {
    if (document.getElementById("sv-ux-polish-css")) return;
    var s = document.createElement("style");
    s.id = "sv-ux-polish-css";
    s.textContent = [
      /* only hide message hover actions — not member list */
      "#server-view .sv-msg .sv-msg-actions{display:none!important}",
      "#server-view .sv-msg .sv-reply-btn,#server-view .sv-msg .sv-punish-btn,#server-view .sv-msg .sv-react-btn{display:none!important}",
      "#sv-msg-menu{position:fixed;z-index:100000;min-width:180px;background:#111214;border:1px solid #1e1f22;border-radius:8px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.5)}",
      "#sv-msg-menu[hidden]{display:none!important}",
      "#sv-msg-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;color:#dbdee1;padding:10px 12px;border-radius:4px;cursor:pointer;font-size:14px;font-family:inherit}",
      "#sv-msg-menu button:hover{background:#5865f2;color:#fff}",
      "#sv-msg-menu .sv-menu-sep{height:1px;background:#1e1f22;margin:4px 0}",
      /* member list punish */
      "#server-view .sv-member-row{position:relative}",
      "#server-view .sv-member-punish{opacity:0;border:0;background:transparent;color:#b5bac1;font-size:11px;cursor:pointer;padding:2px 6px;border-radius:4px;margin-left:auto}",
      "#server-view .sv-member-row:hover .sv-member-punish{opacity:1}",
      "#server-view .sv-member-punish:hover{background:rgba(237,66,69,.2);color:#ed4245}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function closeMenu() {
    var m = document.getElementById("sv-msg-menu");
    if (m) m.hidden = true;
  }

  function openPunish(userId, userName, messageId) {
    if (typeof window.openPunishModal === "function") {
      window.openPunishModal({
        userId: userId,
        userName: userName || "user",
        messageId: messageId || "",
      });
      return;
    }
    // minimal fallback prompt flow
    var action = prompt("Punish action for " + (userName || userId) + " (warn / mute / kick / ban):", "warn");
    if (!action) return;
    action = String(action).toLowerCase().trim();
    if (["warn", "mute", "kick", "ban"].indexOf(action) === -1) {
      alert("Use warn, mute, kick, or ban");
      return;
    }
    var reason = prompt("Reason:", "") || "";
    var gid =
      (window.selectedServer && window.selectedServer.id) || window.__svGuildId || "";
    if (!gid) {
      alert("No server selected");
      return;
    }
    fetch("/api/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        action: action,
        guildId: gid,
        userId: userId,
        reason: reason,
        channelId: "punish",
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.error || "Failed");
          alert(action + " applied");
        });
      })
      .catch(function (err) {
        alert(err.message || "Punish failed");
      });
  }

  window.__svOpenPunish = openPunish;

  function ensureMenu() {
    var m = document.getElementById("sv-msg-menu");
    if (m) return m;
    m = document.createElement("div");
    m.id = "sv-msg-menu";
    m.hidden = true;
    m.innerHTML =
      '<button type="button" data-act="reply">Reply</button>' +
      '<button type="button" data-act="react">Add reaction</button>' +
      '<div class="sv-menu-sep"></div>' +
      '<button type="button" data-act="punish">Punish…</button>';
    document.body.appendChild(m);

    m.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var btn = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      var mid = m.dataset.messageId || "";
      var aid = m.dataset.authorId || "";
      var aname = m.dataset.authorName || "User";
      var ax = m._anchorX || 80;
      var ay = m._anchorY || 80;
      closeMenu();

      if (act === "reply") {
        var fake = document.querySelector('.sv-reply-btn[data-reply-id="' + mid + '"]');
        if (fake) {
          // temporarily show so click works
          fake.style.display = "inline-block";
          fake.click();
          fake.style.display = "";
        } else {
          window.__svReplyTo = mid;
          var input = document.getElementById("sv-input");
          if (input) {
            input.placeholder = "Replying to " + aname + "…";
            input.focus();
          }
        }
      } else if (act === "react") {
        // defer so document click handlers don't kill the picker
        setTimeout(function () {
          if (typeof window.__svOpenReactPicker === "function") {
            window.__svOpenReactPicker(mid, ax, ay);
          } else if (typeof window.__svAddReaction === "function") {
            window.__svAddReaction(mid, "👍");
          } else {
            alert("Reaction picker not loaded yet — hard refresh");
          }
        }, 30);
      } else if (act === "punish") {
        openPunish(aid, aname, mid);
      }
    });
    return m;
  }

  function openMenu(x, y, article) {
    var m = ensureMenu();
    m.dataset.messageId = article.getAttribute("data-message-id") || "";
    m.dataset.authorId = article.getAttribute("data-author-id") || "";
    var nameEl = article.querySelector(".sv-author");
    m.dataset.authorName = nameEl ? nameEl.textContent : "User";
    m._anchorX = x;
    m._anchorY = y;
    var punishBtn = m.querySelector('[data-act="punish"]');
    if (punishBtn) punishBtn.style.display = m.dataset.authorId ? "" : "none";
    m.hidden = false;
    m.style.left = Math.max(8, Math.min(x, window.innerWidth - 200)) + "px";
    m.style.top = Math.max(8, Math.min(y, window.innerHeight - 140)) + "px";
  }

  function bindContextMenu() {
    var root = document.getElementById("sv-messages");
    if (!root || root.dataset.ctxBound) return;
    root.dataset.ctxBound = "1";
    root.addEventListener("contextmenu", function (e) {
      var article = e.target.closest ? e.target.closest("article.sv-msg") : null;
      if (!article) return;
      if (e.target.closest && e.target.closest("a, input, textarea")) return;
      e.preventDefault();
      e.stopPropagation();
      openMenu(e.clientX, e.clientY, article);
    });
    document.addEventListener(
      "click",
      function (e) {
        var m = document.getElementById("sv-msg-menu");
        if (!m || m.hidden) return;
        if (m.contains(e.target)) return;
        closeMenu();
      },
      true
    );
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  function quietPoll() {
    if (window.__svQuietPollHooked) return;
    window.__svQuietPollHooked = true;
    var native = window.setInterval;
    window.setInterval = function (fn, ms) {
      try {
        var src = Function.prototype.toString.call(fn);
        if (src && src.indexOf("loadMessages") !== -1 && ms && ms < 12000) ms = 15000;
      } catch (e) {}
      return native.call(window, fn, ms);
    };
  }

  function boot() {
    quietPoll();
    injectCss();
    ensureMenu();
    bindContextMenu();
    setInterval(bindContextMenu, 4000);
    console.log("[sv-ux-polish] v2 ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
