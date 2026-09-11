/**
 * Lightbox + message reactions.
 * Quick reactions include 💜 and 🥹; favorites from emoji picker show first.
 */
(function () {
  "use strict";
  if (window.__svMediaReactV5) return;
  window.__svMediaReactV5 = true;

  var FAV_EMOJI_KEY = "sv_fav_emojis_v1";
  var QUICK = ["👍", "❤️", "💜", "😂", "😮", "😢", "🥹", "🔥", "🎉", "👀", "✅", "❌", "☕", "💯"];

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadFav(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]") || [];
    } catch (e) {
      return [];
    }
  }

  function channelId() {
    var active = document.querySelector("#sv-channel-list .sv-ch.active");
    if (active) return active.getAttribute("data-channel-id") || "";
    return window.__svActiveChannelId || "";
  }

  function injectCss() {
    if (document.getElementById("sv-media-react-css")) return;
    var s = document.createElement("style");
    s.id = "sv-media-react-css";
    s.textContent = [
      "#sv-lightbox{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:24px}",
      "#sv-lightbox[hidden]{display:none!important}",
      "#sv-lightbox img{max-width:min(96vw,1200px);max-height:90vh;border-radius:8px}",
      "#sv-lightbox .sv-lb-close{position:absolute;top:16px;right:16px;border:0;background:#2b2d31;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer}",
      "#server-view .sv-attachment-image{max-width:min(420px,100%);max-height:320px;border-radius:8px;cursor:zoom-in}",
      "#server-view .sv-reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}",
      "#server-view .sv-reaction{display:inline-flex;align-items:center;gap:4px;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;padding:2px 6px;font-size:13px;color:#dbdee1;cursor:pointer}",
      "#server-view .sv-reaction.me{background:rgba(88,101,242,.25);border-color:rgba(88,101,242,.5)}",
      "#sv-reaction-picker{position:fixed;z-index:100001;background:#2b2d31;border:1px solid #1e1f22;border-radius:12px;padding:8px;display:grid;grid-template-columns:repeat(6,1fr);gap:4px;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:280px}",
      "#sv-reaction-picker button{border:0;background:transparent;font-size:22px;cursor:pointer;border-radius:6px;padding:6px}",
      "#sv-reaction-picker button:hover{background:rgba(255,255,255,.1)}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function ensureLightbox() {
    var lb = document.getElementById("sv-lightbox");
    if (lb) return lb;
    lb = document.createElement("div");
    lb.id = "sv-lightbox";
    lb.hidden = true;
    lb.innerHTML =
      '<button type="button" class="sv-lb-close" aria-label="Close">\u2715</button><div class="sv-lb-body"></div>';
    document.body.appendChild(lb);
    lb.querySelector(".sv-lb-close").onclick = function () {
      lb.hidden = true;
      lb.querySelector(".sv-lb-body").innerHTML = "";
    };
    lb.addEventListener("click", function (e) {
      if (e.target === lb) {
        lb.hidden = true;
        lb.querySelector(".sv-lb-body").innerHTML = "";
      }
    });
    return lb;
  }

  function openLightbox(url) {
    var lb = ensureLightbox();
    lb.querySelector(".sv-lb-body").innerHTML = '<img src="' + esc(url) + '" alt="">';
    lb.hidden = false;
  }

  function bindLightbox() {
    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest ? e.target.closest("[data-lightbox]") : null;
        if (btn) {
          e.preventDefault();
          openLightbox(btn.getAttribute("data-lightbox"));
          return;
        }
        var img = e.target.closest ? e.target.closest(".sv-attachment-image, .sv-embed-image") : null;
        if (img && img.src) {
          e.preventDefault();
          openLightbox(img.src);
        }
      },
      true
    );
  }

  async function addReaction(messageId, emoji) {
    var cid = channelId();
    if (!cid || !messageId || !emoji) return;
    try {
      var res = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          action: "react",
          channelId: cid,
          messageId: messageId,
          emoji: emoji,
        }),
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        alert(data.error || "Could not add reaction (bot needs Add Reactions + token)");
        return;
      }
      var article = document.querySelector('article.sv-msg[data-message-id="' + messageId + '"]');
      if (article) {
        var box = article.querySelector(".sv-reactions");
        if (!box) {
          box = document.createElement("div");
          box.className = "sv-reactions";
          var body = article.querySelector(".sv-msg-body");
          if (body) body.appendChild(box);
        }
        var span = document.createElement("button");
        span.type = "button";
        span.className = "sv-reaction me";
        span.innerHTML = esc(emoji) + " 1";
        box.appendChild(span);
      }
    } catch (err) {
      alert(err.message || "Reaction failed");
    }
  }

  window.__svAddReaction = addReaction;

  function closeReactPicker() {
    var p = document.getElementById("sv-reaction-picker");
    if (p) p.remove();
  }

  function openReactPicker(messageId, x, y) {
    closeReactPicker();
    var picker = document.createElement("div");
    picker.id = "sv-reaction-picker";
    var favs = loadFav(FAV_EMOJI_KEY);
    var emojis = favs.concat(
      QUICK.filter(function (e) {
        return favs.indexOf(e) === -1;
      })
    );
    picker.innerHTML = emojis
      .map(function (e) {
        return '<button type="button" data-emoji="' + esc(e) + '">' + e + "</button>";
      })
      .join("");
    document.body.appendChild(picker);
    picker.style.left = Math.min(x || 80, window.innerWidth - 300) + "px";
    picker.style.top = Math.min(y || 80, window.innerHeight - 180) + "px";

    picker.addEventListener("click", function (e) {
      e.stopPropagation();
      var b = e.target.closest ? e.target.closest("[data-emoji]") : null;
      if (!b) return;
      addReaction(messageId, b.getAttribute("data-emoji"));
      closeReactPicker();
    });

    setTimeout(function () {
      function outside(ev) {
        if (!document.getElementById("sv-reaction-picker")) {
          document.removeEventListener("click", outside, true);
          return;
        }
        var p = document.getElementById("sv-reaction-picker");
        if (p && !p.contains(ev.target)) {
          closeReactPicker();
          document.removeEventListener("click", outside, true);
        }
      }
      document.addEventListener("click", outside, true);
    }, 50);
  }

  window.__svOpenReactPicker = openReactPicker;

  function boot() {
    injectCss();
    bindLightbox();
    ensureLightbox();
    var gb = document.getElementById("sv-gif-btn");
    if (gb) gb.remove();
    var gp = document.getElementById("sv-gif-panel");
    if (gp) gp.remove();
    console.log("[sv-media-react] v5 reactions + 💜 🥹");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
