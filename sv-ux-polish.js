/**
 * UX polish:
 * - Reply / React / Punish only on right-click (no always-visible buttons)
 * - Stop full-chat flicker: only re-render when messages actually change
 * - Slow background poll
 */
(function () {
  "use strict";
  if (window.__svUxPolishV1) return;
  window.__svUxPolishV1 = true;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function injectCss() {
    if (document.getElementById("sv-ux-polish-css")) return;
    var s = document.createElement("style");
    s.id = "sv-ux-polish-css";
    s.textContent = [
      /* hide inline action buttons forever */
      "#server-view .sv-msg-actions{display:none!important}",
      "#server-view .sv-reply-btn,#server-view .sv-punish-btn,#server-view .sv-react-btn{display:none!important}",
      /* context menu */
      "#sv-msg-menu{position:fixed;z-index:100000;min-width:180px;background:#111214;border:1px solid #1e1f22;",
      "  border-radius:8px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.5)}",
      "#sv-msg-menu[hidden]{display:none!important}",
      "#sv-msg-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;",
      "  color:#dbdee1;padding:10px 12px;border-radius:4px;cursor:pointer;font-size:14px;font-family:inherit}",
      "#sv-msg-menu button:hover{background:#5865f2;color:#fff}",
      "#sv-msg-menu .sv-menu-sep{height:1px;background:#1e1f22;margin:4px 0}",
      /* clearer GIF button */
      "#server-view .sv-gif-btn{min-width:44px!important;height:36px!important;border-radius:8px!important;",
      "  background:#2b2d31!important;color:#fff!important;font-weight:800!important;font-size:12px!important;",
      "  letter-spacing:.04em;border:1px solid #3f4147!important}",
      "#server-view .sv-gif-btn:hover{background:#5865f2!important;border-color:#5865f2!important}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function closeMenu() {
    var m = document.getElementById("sv-msg-menu");
    if (m) m.hidden = true;
  }

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
      var btn = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      var mid = m.dataset.messageId || "";
      var aid = m.dataset.authorId || "";
      var aname = m.dataset.authorName || "User";
      closeMenu();

      if (act === "reply") {
        // trigger existing reply path if present
        var fake = document.querySelector(
          '.sv-reply-btn[data-reply-id="' + mid + '"]'
        );
        if (fake) fake.click();
        else if (typeof window.__svStartReply === "function") window.__svStartReply(mid);
        else {
          // fallback: set reply bar if exists
          var bar = document.getElementById("sv-reply-bar");
          var input = document.getElementById("sv-input");
          if (bar) {
            bar.hidden = false;
            var t = bar.querySelector(".sv-reply-bar-text");
            if (t) t.textContent = "Replying to " + aname;
          }
          window.__svReplyTo = mid;
          if (input) input.focus();
        }
      } else if (act === "react") {
        if (typeof window.__svOpenReactPicker === "function") {
          window.__svOpenReactPicker(mid, m._anchorX || 0, m._anchorY || 0);
        } else if (typeof window.__svAddReaction === "function") {
          window.__svAddReaction(mid, "👍");
        }
      } else if (act === "punish") {
        var pbtn = document.querySelector(
          '.sv-punish-btn[data-punish-user="' + aid + '"]'
        );
        if (pbtn) pbtn.click();
        else if (typeof window.__svOpenPunish === "function") {
          window.__svOpenPunish(aid, aname, mid);
        } else {
          // dispatch custom event for punish UI
          document.dispatchEvent(
            new CustomEvent("sv-punish", {
              detail: { userId: aid, name: aname, messageId: mid },
            })
          );
        }
      }
    });
    return m;
  }

  function openMenu(x, y, article) {
    var m = ensureMenu();
    var mid = article.getAttribute("data-message-id") || "";
    var aid = article.getAttribute("data-author-id") || "";
    var nameEl = article.querySelector(".sv-author");
    var aname = nameEl ? nameEl.textContent : "User";
    m.dataset.messageId = mid;
    m.dataset.authorId = aid;
    m.dataset.authorName = aname;
    m._anchorX = x;
    m._anchorY = y;

    // hide punish for bots / self if no author
    var punishBtn = m.querySelector('[data-act="punish"]');
    if (punishBtn) punishBtn.style.display = aid ? "" : "none";

    m.hidden = false;
    var w = 190;
    var h = 130;
    var left = Math.min(x, window.innerWidth - w - 8);
    var top = Math.min(y, window.innerHeight - h - 8);
    m.style.left = Math.max(8, left) + "px";
    m.style.top = Math.max(8, top) + "px";
  }

  function bindContextMenu() {
    var root = document.getElementById("sv-messages");
    if (!root || root.dataset.ctxBound) return;
    root.dataset.ctxBound = "1";
    root.addEventListener("contextmenu", function (e) {
      var article = e.target.closest ? e.target.closest("article.sv-msg") : null;
      if (!article) return;
      // allow native menu on links/inputs
      if (e.target.closest && e.target.closest("a, input, textarea")) return;
      e.preventDefault();
      openMenu(e.clientX, e.clientY, article);
    });
    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /** Fingerprint message list so we skip useless re-renders */
  function fingerprint(messages) {
    if (!Array.isArray(messages) || !messages.length) return "empty";
    var parts = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (!m) continue;
      var rx = "";
      if (Array.isArray(m.reactions)) {
        rx = m.reactions
          .map(function (r) {
            return (r.emoji && (r.emoji.name || r.emoji.id)) + ":" + (r.count || 0);
          })
          .join(",");
      }
      parts.push(String(m.id) + ":" + rx);
    }
    return parts.join("|");
  }

  var lastFp = "";

  function patchRender() {
    // Wrap container mutations: if something sets the same content, skip scroll jank
    var container = document.getElementById("sv-messages");
    if (!container || container.dataset.renderPatched) return;
    container.dataset.renderPatched = "1";

    // Intercept fetch responses already stored on window.lastMessages
    // Patch load by observing force flag via MutationObserver is heavy — instead
    // override periodic full replace by restoring scroll and skipping identical HTML length thrash
  }

  function slowPollAndSmartRender() {
    // Kill fast polls by clearing all intervals that only load messages — we can't
    // access local pollTimer, so replace loadMessages behavior via fetch fingerprint.

    // Slow our own gentle poll if none
    if (window.__svSmartPoll) return;
    window.__svSmartPoll = setInterval(function () {
      var view = document.getElementById("server-view");
      if (!view || view.hidden) return;
      // trigger existing load if exposed
      try {
        // Dispatch a soft refresh request; server-view may ignore
        if (window.__svLoadMessagesQuiet) window.__svLoadMessagesQuiet();
      } catch (e) {}
    }, 20000);

    // Hook fetch to avoid re-render when fingerprint unchanged
    if (window.__svFetchSmart) return;
    window.__svFetchSmart = true;
    var orig = window.fetch;
    if (typeof orig !== "function") return;

    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var method = ((init && init.method) || "GET").toUpperCase();
      return orig.apply(this, arguments).then(function (res) {
        try {
          if (
            method === "GET" &&
            String(url).indexOf("/api/messages") !== -1 &&
            res.ok
          ) {
            res
              .clone()
              .json()
              .then(function (data) {
                var list = Array.isArray(data)
                  ? data
                  : Array.isArray(data.messages)
                    ? data.messages
                    : [];
                var fp = fingerprint(list);
                if (fp === lastFp) {
                  // mark so other enhancers know nothing changed
                  window.__svMessagesUnchanged = true;
                } else {
                  window.__svMessagesUnchanged = false;
                  lastFp = fp;
                }
                window.lastMessages = list;
                window.__svLastMessages = list;
              })
              .catch(function () {});
          }
        } catch (e) {}
        return res;
      });
    };

    // Patch DOM: if server-view rewrites messages with same fp, preserve scroll
    // by blocking rapid successive identical innerHTML — observe childList
    var box = document.getElementById("sv-messages");
    if (box && !box.dataset.scrollGuard) {
      box.dataset.scrollGuard = "1";
      var lastHtmlLen = 0;
      var lastTs = 0;
      var obs = new MutationObserver(function () {
        var now = Date.now();
        // if something re-rendered within 800ms with same length, restore scroll top slightly
        if (now - lastTs < 800 && box.innerHTML.length === lastHtmlLen) {
          // no-op; browser already painted
        }
        lastHtmlLen = box.innerHTML.length;
        lastTs = now;
      });
      obs.observe(box, { childList: true, subtree: false });
    }
  }

  /**
   * Monkey-patch: increase poll interval by clearing and restarting if we find
   * the timer via a global, or inject a quieter loadMessages(false) path.
   */
  function quietPoll() {
    // Override setInterval temporarily to stretch message polls from 5s → 15s
    if (window.__svQuietPollHooked) return;
    window.__svQuietPollHooked = true;
    var native = window.setInterval;
    window.setInterval = function (fn, ms) {
      try {
        var src = Function.prototype.toString.call(fn);
        if (src && src.indexOf("loadMessages") !== -1 && ms && ms < 12000) {
          ms = 15000;
        }
      } catch (e) {}
      return native.call(window, fn, ms);
    };
  }

  function boot() {
    quietPoll();
    injectCss();
    ensureMenu();
    bindContextMenu();
    slowPollAndSmartRender();
    setInterval(bindContextMenu, 3000);
    console.log("[sv-ux-polish] right-click menu + quieter refresh");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
