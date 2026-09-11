/**
 * UX polish:
 * - Desktop: right-click message → menu
 * - Mobile: hold / long-press message → same menu
 * - Quieter poll; member-list punish stays visible on hover/tap
 */
(function () {
  "use strict";
  if (window.__svUxPolishV3) return;
  window.__svUxPolishV3 = true;

  var LONG_PRESS_MS = 480;
  var MOVE_CANCEL_PX = 12;

  function injectCss() {
    if (document.getElementById("sv-ux-polish-css")) return;
    var s = document.createElement("style");
    s.id = "sv-ux-polish-css";
    s.textContent = [
      "#server-view .sv-msg .sv-msg-actions{display:none!important}",
      "#server-view .sv-msg .sv-reply-btn,#server-view .sv-msg .sv-punish-btn,#server-view .sv-msg .sv-react-btn{display:none!important}",
      "#sv-msg-menu{position:fixed;z-index:100000;min-width:200px;background:#111214;border:1px solid #1e1f22;border-radius:12px;padding:6px;box-shadow:0 8px 28px rgba(0,0,0,.55);-webkit-user-select:none;user-select:none}",
      "#sv-msg-menu[hidden]{display:none!important}",
      "#sv-msg-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;color:#dbdee1;padding:14px 14px;border-radius:8px;cursor:pointer;font-size:16px;font-family:inherit;-webkit-tap-highlight-color:transparent}",
      "#sv-msg-menu button:hover,#sv-msg-menu button:active{background:#5865f2;color:#fff}",
      "#sv-msg-menu .sv-menu-sep{height:1px;background:#1e1f22;margin:4px 0}",
      "#server-view article.sv-msg.sv-msg-holding{background:rgba(88,101,242,.12)!important}",
      "#server-view .sv-member-row{position:relative;display:flex;align-items:center;gap:8px}",
      "#server-view .sv-member-punish{opacity:0;border:0;background:transparent;color:#b5bac1;font-size:12px;cursor:pointer;padding:6px 8px;border-radius:4px;margin-left:auto;-webkit-tap-highlight-color:transparent}",
      "#server-view .sv-member-row:hover .sv-member-punish,#server-view .sv-member-row:focus-within .sv-member-punish{opacity:1}",
      "@media (hover:none) and (pointer:coarse){",
      "  #server-view .sv-member-punish{opacity:0.85}",
      "  #sv-msg-menu{left:12px!important;right:12px;width:auto;min-width:0;bottom:max(12px,env(safe-area-inset-bottom));top:auto!important;border-radius:16px;padding:10px}",
      "  #sv-msg-menu button{padding:16px 16px;font-size:17px}",
      "}",
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
    var action = prompt(
      "Punish action for " + (userName || userId) + " (warn / mute / kick / ban):",
      "warn"
    );
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

    // prevent touch on menu from bubbling / closing immediately
    m.addEventListener(
      "touchstart",
      function (e) {
        e.stopPropagation();
      },
      { passive: true }
    );
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

    var isCoarse =
      window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches;

    if (isCoarse || window.innerWidth < 700) {
      // bottom sheet style — CSS also forces this on coarse pointers
      m.style.left = "12px";
      m.style.right = "12px";
      m.style.top = "auto";
      m.style.bottom = "max(12px, env(safe-area-inset-bottom))";
      m.style.width = "auto";
    } else {
      m.style.right = "auto";
      m.style.bottom = "auto";
      m.style.width = "";
      m.style.left = Math.max(8, Math.min(x, window.innerWidth - 220)) + "px";
      m.style.top = Math.max(8, Math.min(y, window.innerHeight - 160)) + "px";
    }

    try {
      if (navigator.vibrate) navigator.vibrate(12);
    } catch (e) {}
  }

  function bindContextMenu() {
    var root = document.getElementById("sv-messages");
    if (!root) return;

    // Desktop right-click
    if (!root.dataset.ctxBound) {
      root.dataset.ctxBound = "1";
      root.addEventListener("contextmenu", function (e) {
        var article = e.target.closest ? e.target.closest("article.sv-msg") : null;
        if (!article) return;
        if (e.target.closest && e.target.closest("a, input, textarea")) return;
        e.preventDefault();
        e.stopPropagation();
        openMenu(e.clientX, e.clientY, article);
      });
    }

    // Mobile long-press
    if (!root.dataset.longBound) {
      root.dataset.longBound = "1";

      var timer = null;
      var startX = 0;
      var startY = 0;
      var targetArticle = null;
      var opened = false;

      function clearHold() {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (targetArticle) targetArticle.classList.remove("sv-msg-holding");
        targetArticle = null;
      }

      root.addEventListener(
        "touchstart",
        function (e) {
          if (!e.touches || e.touches.length !== 1) return;
          var t = e.touches[0];
          var article = e.target.closest ? e.target.closest("article.sv-msg") : null;
          if (!article) return;
          if (e.target.closest && e.target.closest("a, input, textarea, button")) return;

          opened = false;
          startX = t.clientX;
          startY = t.clientY;
          targetArticle = article;
          article.classList.add("sv-msg-holding");

          timer = setTimeout(function () {
            timer = null;
            if (!targetArticle) return;
            opened = true;
            openMenu(startX, startY, targetArticle);
            targetArticle.classList.remove("sv-msg-holding");
          }, LONG_PRESS_MS);
        },
        { passive: true }
      );

      root.addEventListener(
        "touchmove",
        function (e) {
          if (!timer || !e.touches || !e.touches[0]) return;
          var t = e.touches[0];
          var dx = Math.abs(t.clientX - startX);
          var dy = Math.abs(t.clientY - startY);
          if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearHold();
        },
        { passive: true }
      );

      function endTouch(e) {
        if (opened) {
          // stop the ghost click that would close the menu
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          opened = false;
          clearHold();
          return;
        }
        clearHold();
      }

      root.addEventListener("touchend", endTouch, { passive: false });
      root.addEventListener("touchcancel", clearHold, { passive: true });
    }

    if (!window.__svMenuDismissBound) {
      window.__svMenuDismissBound = true;
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
      document.addEventListener(
        "touchstart",
        function (e) {
          var m = document.getElementById("sv-msg-menu");
          if (!m || m.hidden) return;
          if (m.contains(e.target)) return;
          closeMenu();
        },
        { passive: true, capture: true }
      );
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeMenu();
      });
    }
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
    console.log("[sv-ux-polish] v3 long-press ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
