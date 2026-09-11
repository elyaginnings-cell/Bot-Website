/**
 * Media lightbox + message reactions + GIF picker + favorites
 */
(function () {
  "use strict";
  if (window.__svMediaReactV1) return;
  window.__svMediaReactV1 = true;

  var FAV_EMOJI_KEY = "sv_fav_emojis_v1";
  var FAV_GIF_KEY = "sv_fav_gifs_v1";

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

  function saveFav(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr.slice(0, 48)));
    } catch (e) {}
  }

  function toggleFavEmoji(emoji) {
    var list = loadFav(FAV_EMOJI_KEY);
    var i = list.indexOf(emoji);
    if (i >= 0) list.splice(i, 1);
    else list.unshift(emoji);
    saveFav(FAV_EMOJI_KEY, list);
    return list;
  }

  function toggleFavGif(gif) {
    var list = loadFav(FAV_GIF_KEY);
    var i = list.findIndex(function (g) {
      return g && g.url === gif.url;
    });
    if (i >= 0) list.splice(i, 1);
    else list.unshift({ url: gif.url, preview: gif.preview || gif.url, title: gif.title || "gif" });
    saveFav(FAV_GIF_KEY, list);
    return list;
  }

  function guildId() {
    if (window.selectedServer && window.selectedServer.id) return String(window.selectedServer.id);
    if (window.__svGuildId) return String(window.__svGuildId);
    return "";
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
      "#sv-lightbox img,#sv-lightbox video{max-width:min(96vw,1200px);max-height:90vh;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.5)}",
      "#sv-lightbox .sv-lb-close{position:absolute;top:16px;right:16px;border:0;background:#2b2d31;color:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer}",
      "#server-view .sv-attachment-image-btn{display:block;margin-top:6px;padding:0;border:0;background:transparent;cursor:zoom-in;max-width:100%}",
      "#server-view .sv-attachment-image{max-width:min(400px,100%);max-height:300px;border-radius:8px;display:block}",
      "#server-view .sv-attachment-video{max-width:min(400px,100%);max-height:300px;border-radius:8px;margin-top:6px}",
      "#server-view .sv-msg-actions{display:inline-flex;gap:4px;margin-left:8px;opacity:0;transition:opacity .12s}",
      "#server-view .sv-msg:hover .sv-msg-actions{opacity:1}",
      "#server-view .sv-react-btn{border:0;background:transparent;color:#b5bac1;cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px}",
      "#server-view .sv-react-btn:hover{background:rgba(255,255,255,.08);color:#fff}",
      "#server-view .sv-reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}",
      "#server-view .sv-reaction{display:inline-flex;align-items:center;gap:4px;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;padding:2px 6px;font-size:13px;color:#dbdee1;cursor:pointer}",
      "#server-view .sv-reaction.me{background:rgba(88,101,242,.25);border-color:rgba(88,101,242,.5)}",
      "#server-view .sv-reaction-picker{position:absolute;z-index:90;background:#2b2d31;border:1px solid #1e1f22;border-radius:12px;padding:8px;display:grid;grid-template-columns:repeat(8,1fr);gap:4px;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:280px}",
      "#server-view .sv-reaction-picker button{border:0;background:transparent;font-size:22px;cursor:pointer;border-radius:6px;padding:4px}",
      "#server-view .sv-reaction-picker button:hover{background:rgba(255,255,255,.1)}",
      "#server-view .sv-gif-btn,#server-view .sv-emoji-btn{flex-shrink:0;width:36px;height:36px;border:none;border-radius:8px;background:transparent;color:#b5bac1;font-size:13px;font-weight:700;cursor:pointer}",
      "#server-view .sv-gif-btn:hover{background:rgba(255,255,255,.08);color:#fff}",
      "#server-view .sv-gif-panel{position:absolute;bottom:calc(100% + 8px);right:0;z-index:85;width:min(380px,94vw);max-height:min(420px,60vh);background:#2b2d31;border:1px solid #1e1f22;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.45);display:flex;flex-direction:column;overflow:hidden}",
      "#server-view .sv-gif-panel[hidden]{display:none!important}",
      "#server-view .sv-gif-search{margin:8px;padding:8px 10px;border:0;border-radius:6px;background:#1e1f22;color:#dbdee1;font-size:13px}",
      "#server-view .sv-gif-tabs{display:flex;gap:4px;padding:0 8px 6px}",
      "#server-view .sv-gif-tabs button{border:0;background:transparent;color:#b5bac1;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}",
      "#server-view .sv-gif-tabs button.active{background:rgba(88,101,242,.35);color:#fff}",
      "#server-view .sv-gif-grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:0 8px 10px}",
      "#server-view .sv-gif-cell{position:relative;border:0;padding:0;background:#1e1f22;border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1.2}",
      "#server-view .sv-gif-cell img{width:100%;height:100%;object-fit:cover;display:block}",
      "#server-view .sv-gif-star{position:absolute;top:4px;right:4px;border:0;background:rgba(0,0,0,.5);color:#f0b232;border-radius:4px;cursor:pointer;font-size:14px;padding:2px 5px}",
      "#server-view .sv-fav-star{border:0;background:transparent;cursor:pointer;font-size:14px;opacity:.5}",
      "#server-view .sv-fav-star.on{opacity:1}",
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
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        lb.hidden = true;
        lb.querySelector(".sv-lb-body").innerHTML = "";
      }
    });
    return lb;
  }

  function openLightbox(url, isVideo) {
    var lb = ensureLightbox();
    var body = lb.querySelector(".sv-lb-body");
    if (isVideo) {
      body.innerHTML =
        '<video src="' + esc(url) + '" controls autoplay playsinline style="max-width:96vw;max-height:90vh"></video>';
    } else {
      body.innerHTML = '<img src="' + esc(url) + '" alt="">';
    }
    lb.hidden = false;
  }

  function bindLightbox() {
    document.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest ? e.target.closest("[data-lightbox]") : null;
        if (btn) {
          e.preventDefault();
          openLightbox(btn.getAttribute("data-lightbox"), false);
          return;
        }
        var img = e.target.closest ? e.target.closest(".sv-attachment-image") : null;
        if (img && img.src) {
          e.preventDefault();
          openLightbox(img.src, false);
        }
      },
      true
    );
  }

  var QUICK = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👀", "✅", "❌", "☕", "💯"];

  async function addReaction(messageId, emoji) {
    var cid = channelId();
    if (!cid || !messageId || !emoji) return;
    try {
      var res = await fetch("/api/react", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ channelId: cid, messageId: messageId, emoji: emoji }),
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        alert(data.error || "Could not add reaction (bot needs Add Reactions permission)");
        return;
      }
      // optimistic UI
      var article = document.querySelector('article.sv-msg[data-message-id="' + messageId + '"]');
      if (article) {
        var box = article.querySelector(".sv-reactions");
        if (!box) {
          box = document.createElement("div");
          box.className = "sv-reactions";
          var body = article.querySelector(".sv-msg-body");
          if (body) body.appendChild(box);
        }
        var existing = Array.prototype.find.call(box.querySelectorAll(".sv-reaction"), function (el) {
          return (el.getAttribute("data-emoji") || "") === emoji;
        });
        if (existing) {
          var c = existing.querySelector(".sv-reaction-count");
          if (c) c.textContent = String((parseInt(c.textContent, 10) || 1) + 1);
          existing.classList.add("me");
        } else {
          var span = document.createElement("button");
          span.type = "button";
          span.className = "sv-reaction me";
          span.setAttribute("data-emoji", emoji);
          span.innerHTML = esc(emoji) + '<span class="sv-reaction-count">1</span>';
          box.appendChild(span);
        }
      }
    } catch (err) {
      alert(err.message || "Reaction failed");
    }
  }

  function showReactPicker(anchor, messageId) {
    closeReactPicker();
    var picker = document.createElement("div");
    picker.id = "sv-reaction-picker";
    picker.className = "sv-reaction-picker";
    var favs = loadFav(FAV_EMOJI_KEY);
    var emojis = favs.concat(QUICK.filter(function (e) {
      return favs.indexOf(e) === -1;
    }));
    picker.innerHTML = emojis
      .map(function (e) {
        return '<button type="button" data-emoji="' + esc(e) + '">' + e + "</button>";
      })
      .join("");
    document.body.appendChild(picker);
    var rect = anchor.getBoundingClientRect();
    picker.style.position = "fixed";
    picker.style.left = Math.min(rect.left, window.innerWidth - 300) + "px";
    picker.style.top = Math.max(8, rect.top - 120) + "px";
    picker.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-emoji]") : null;
      if (!b) return;
      addReaction(messageId, b.getAttribute("data-emoji"));
      closeReactPicker();
    });
  }

  function closeReactPicker() {
    var p = document.getElementById("sv-reaction-picker");
    if (p) p.remove();
  }

  function enhanceMessageActions() {
    document.querySelectorAll("article.sv-msg[data-message-id]").forEach(function (el) {
      var mid = el.getAttribute("data-message-id");
      if (!mid) return;
      var actions = el.querySelector(".sv-msg-actions");
      if (!actions) {
        var meta = el.querySelector(".sv-msg-meta");
        if (!meta) return;
        actions = document.createElement("div");
        actions.className = "sv-msg-actions";
        meta.appendChild(actions);
      }
      if (actions.querySelector(".sv-react-btn")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sv-react-btn";
      btn.title = "Add reaction";
      btn.textContent = "😊";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showReactPicker(btn, mid);
      });
      actions.appendChild(btn);
    });
  }

  // ——— GIF picker ———
  function ensureGifUi() {
    var input = document.getElementById("sv-input");
    if (!input) return;
    if (document.getElementById("sv-gif-btn")) return;

    var composer = document.getElementById("sv-composer") || input.parentElement;
    if (!composer) return;
    if (getComputedStyle(composer).position === "static") composer.style.position = "relative";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "sv-gif-btn";
    btn.className = "sv-gif-btn";
    btn.title = "GIF";
    btn.textContent = "GIF";

    var emojiBtn = document.getElementById("sv-emoji-btn");
    var send = document.getElementById("sv-send");
    if (emojiBtn && emojiBtn.parentElement) emojiBtn.parentElement.insertBefore(btn, emojiBtn);
    else if (send && send.parentElement) send.parentElement.insertBefore(btn, send);
    else if (input.parentElement) input.parentElement.appendChild(btn);
    else composer.appendChild(btn);

    var panel = document.createElement("div");
    panel.id = "sv-gif-panel";
    panel.className = "sv-gif-panel";
    panel.hidden = true;
    panel.innerHTML =
      '<input type="search" class="sv-gif-search" id="sv-gif-search" placeholder="Search GIFs…" autocomplete="off">' +
      '<div class="sv-gif-tabs"><button type="button" class="active" data-gif-tab="search">Search</button><button type="button" data-gif-tab="favs">Favorites</button></div>' +
      '<div class="sv-gif-grid" id="sv-gif-grid"></div>';
    composer.appendChild(panel);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      if (!panel.hidden) {
        loadGifs(document.getElementById("sv-gif-search").value || "hello");
        document.getElementById("sv-gif-search").focus();
      }
    });

    var search = document.getElementById("sv-gif-search");
    var t = null;
    search.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        loadGifs(search.value || "hello");
      }, 350);
    });

    panel.querySelector(".sv-gif-tabs").addEventListener("click", function (e) {
      var tab = e.target.closest("[data-gif-tab]");
      if (!tab) return;
      panel.querySelectorAll("[data-gif-tab]").forEach(function (b) {
        b.classList.toggle("active", b === tab);
      });
      if (tab.getAttribute("data-gif-tab") === "favs") renderGifGrid(loadFav(FAV_GIF_KEY));
      else loadGifs(search.value || "hello");
    });

    document.addEventListener(
      "click",
      function (e) {
        if (panel.hidden) return;
        if (panel.contains(e.target) || btn.contains(e.target)) return;
        panel.hidden = true;
      },
      true
    );
  }

  async function loadGifs(q) {
    var grid = document.getElementById("sv-gif-grid");
    if (!grid) return;
    grid.innerHTML = '<p style="grid-column:1/-1;color:#b5bac1;padding:8px">Loading…</p>';
    try {
      var res = await fetch("/api/gifs?q=" + encodeURIComponent(q || "hello"), {
        credentials: "include",
        cache: "no-store",
      });
      var data = await res.json();
      renderGifGrid(data.gifs || []);
    } catch (e) {
      grid.innerHTML = '<p style="grid-column:1/-1;color:#f23f43;padding:8px">Failed to load GIFs</p>';
    }
  }

  function renderGifGrid(gifs) {
    var grid = document.getElementById("sv-gif-grid");
    if (!grid) return;
    var favs = loadFav(FAV_GIF_KEY);
    if (!gifs.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;color:#b5bac1;padding:8px">No GIFs</p>';
      return;
    }
    grid.innerHTML = gifs
      .map(function (g) {
        var starred = favs.some(function (f) {
          return f && f.url === g.url;
        });
        return (
          '<div class="sv-gif-cell" data-gif-url="' +
          esc(g.url) +
          '">' +
          '<img src="' +
          esc(g.preview || g.url) +
          '" alt="' +
          esc(g.title || "gif") +
          '" loading="lazy">' +
          '<button type="button" class="sv-gif-star" data-star="1" title="Favorite">' +
          (starred ? "★" : "☆") +
          "</button></div>"
        );
      })
      .join("");

    grid.querySelectorAll(".sv-gif-cell").forEach(function (cell) {
      cell.addEventListener("click", function (e) {
        if (e.target && e.target.getAttribute("data-star")) {
          e.preventDefault();
          e.stopPropagation();
          var url = cell.getAttribute("data-gif-url");
          var img = cell.querySelector("img");
          toggleFavGif({ url: url, preview: img && img.src, title: img && img.alt });
          e.target.textContent = e.target.textContent === "★" ? "☆" : "★";
          return;
        }
        var url = cell.getAttribute("data-gif-url");
        sendGif(url);
      });
    });
  }

  async function sendGif(url) {
    var input = document.getElementById("sv-input");
    var cid = channelId();
    var gid = guildId();
    if (!url || !cid || !gid) return;
    // Send as message content (Discord unfurls GIF links)
    try {
      var res = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ guildId: gid, channelId: cid, content: url }),
      });
      if (!res.ok) {
        var data = await res.json().catch(function () {
          return {};
        });
        alert(data.error || "Failed to send GIF");
        return;
      }
      var panel = document.getElementById("sv-gif-panel");
      if (panel) panel.hidden = true;
      // trigger refresh
      if (typeof window.loadMessages === "function") window.loadMessages(true);
      else {
        // poll path
        setTimeout(function () {
          var ev = new Event("sv-refresh-messages");
          document.dispatchEvent(ev);
        }, 400);
      }
    } catch (e) {
      alert(e.message || "Send failed");
    }
  }

  // Star on emoji picker cells if present
  function patchEmojiFavorites() {
    var panel = document.getElementById("sv-emoji-panel");
    if (!panel || panel.dataset.favPatched) return;
    panel.dataset.favPatched = "1";
    panel.addEventListener(
      "contextmenu",
      function (e) {
        var cell = e.target.closest ? e.target.closest("[data-emoji]") : null;
        if (!cell) return;
        e.preventDefault();
        var emoji = cell.getAttribute("data-emoji");
        toggleFavEmoji(emoji);
        cell.style.outline = loadFav(FAV_EMOJI_KEY).indexOf(emoji) >= 0 ? "2px solid #f0b232" : "";
      },
      true
    );
  }

  function boot() {
    injectCss();
    bindLightbox();
    ensureLightbox();
    ensureGifUi();
    setInterval(function () {
      enhanceMessageActions();
      ensureGifUi();
      patchEmojiFavorites();
    }, 1200);
    document.addEventListener("click", function () {
      closeReactPicker();
    });
    console.log("[sv-media-react] lightbox + react + gif + favorites ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
