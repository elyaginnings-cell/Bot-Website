/**
 * Full emoji + GIF picker with favorite emojis.
 * v8: single open path, mobile bottom sheet, no double-toggle.
 */
(function () {
  "use strict";
  window.__svEmojiPickerV8 = true;

  var FAV_EMOJI_KEY = "sv_fav_emojis_v1";
  var FAV_GIF_KEY = "sv_fav_gifs_v1";

  var CATEGORIES = [
    {
      id: "smileys",
      label: "Smileys",
      icon: "😀",
      emojis: [
        "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
        "😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔",
        "🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷",
        "🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐",
        "😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭",
        "😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️",
        "💩","🤡","👹","👺","👻","👽","👾","🤖"
      ]
    },
    {
      id: "gestures",
      label: "Gestures",
      icon: "👋",
      emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","💪","👀","👁️","👅","👄","💋"]
    },
    {
      id: "symbols",
      label: "Symbols",
      icon: "❤️",
      emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💕","💖","💗","💘","💝","💯","💢","💥","💫","✅","❌","⭕","❗","❓","⭐","🌟","✨","⚡","🔥","🌈","☀️","🌙"]
    },
    {
      id: "food",
      label: "Food",
      icon: "☕",
      emojis: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍑","🥭","🍍","🥝","🍅","🥑","🥐","🍞","🧀","🥚","🍳","🥞","🥓","🍔","🍟","🍕","🌮","🌯","🍝","🍜","🍣","🍩","🍪","🎂","🍰","☕","🍵","🧋","🍺","🍻","🥂","🍷","🍸","🍹","🧊"]
    }
  ];

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/>/g, "\u0026gt;")
      .replace(/"/g, "\u0026quot;");
  }

  function loadFavEmojis() {
    try {
      var a = JSON.parse(localStorage.getItem(FAV_EMOJI_KEY) || "[]") || [];
      return a.filter(function (e) { return typeof e === "string" && e; });
    } catch (e) { return []; }
  }
  function saveFavEmojis(arr) {
    try { localStorage.setItem(FAV_EMOJI_KEY, JSON.stringify(arr.slice(0, 64))); } catch (e) {}
  }
  function toggleFavEmoji(emoji) {
    var list = loadFavEmojis();
    var i = list.indexOf(emoji);
    if (i >= 0) list.splice(i, 1); else list.unshift(emoji);
    saveFavEmojis(list);
    return list.indexOf(emoji) >= 0;
  }
  function loadFavGifs() {
    try { return JSON.parse(localStorage.getItem(FAV_GIF_KEY) || "[]") || []; } catch (e) { return []; }
  }
  function saveFavGifs(arr) {
    try { localStorage.setItem(FAV_GIF_KEY, JSON.stringify(arr.slice(0, 48))); } catch (e) {}
  }
  function previewSrc(g) {
    if (g.proxyPreview) return g.proxyPreview;
    if (g.proxyUrl) return g.proxyUrl;
    var raw = g.preview || g.url || "";
    if (window.__svProxyMedia) return window.__svProxyMedia(raw);
    if (raw && raw.indexOf("/api/messages?resource=media") === -1) {
      return "/api/messages?resource=media&url=" + encodeURIComponent(raw);
    }
    return raw;
  }
  function getInput() {
    return document.getElementById("sv-input") ||
      document.querySelector("#server-view textarea, #server-view #sv-composer input, #sv-composer textarea");
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
    var old = document.getElementById("sv-emoji-picker-css");
    if (old) old.remove();
    var s = document.createElement("style");
    s.id = "sv-emoji-picker-css";
    s.textContent = [
      "#sv-emoji-btn,#server-view .sv-emoji-btn{display:inline-flex!important;visibility:visible!important;opacity:1!important;flex-shrink:0;width:44px;height:44px;border:none;border-radius:8px;background:#2b2d31;color:#fff;font-size:22px;cursor:pointer;align-items:center;justify-content:center;z-index:6;-webkit-tap-highlight-color:transparent;touch-action:manipulation}",
      "#sv-emoji-btn:hover{background:#5865f2}",
      "#sv-emoji-btn.active{background:rgba(88,101,242,.45)}",
      "#sv-emoji-panel,#server-view .sv-emoji-panel{position:absolute;bottom:calc(100% + 8px);right:0;z-index:100050;width:min(380px,94vw);max-height:min(420px,60vh);background:#2b2d31;border:1px solid #1e1f22;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.45);display:flex;flex-direction:column;overflow:hidden}",
      "#sv-emoji-panel[hidden]{display:none!important}",
      "#sv-emoji-panel .sv-emoji-tabs{display:flex;gap:2px;padding:8px;border-bottom:1px solid #1e1f22;overflow-x:auto;flex-shrink:0}",
      "#sv-emoji-panel .sv-emoji-tab{flex:0 0 auto;min-width:36px;height:36px;padding:0 6px;border:none;border-radius:6px;background:transparent;font-size:16px;font-weight:700;cursor:pointer;color:#dbdee1;touch-action:manipulation}",
      "#sv-emoji-panel .sv-emoji-tab.active{background:rgba(88,101,242,.35);color:#fff}",
      "#sv-emoji-panel .sv-emoji-search-wrap{padding:6px 10px}",
      "#sv-emoji-panel .sv-emoji-search{width:100%;box-sizing:border-box;border:none;border-radius:6px;padding:10px;font-size:16px;background:#1e1f22;color:#dbdee1;outline:none}",
      "#sv-emoji-panel .sv-emoji-grid{flex:1;overflow-y:auto;padding:6px 8px 12px;display:grid;grid-template-columns:repeat(8,1fr);gap:2px;-webkit-overflow-scrolling:touch}",
      "#sv-emoji-panel .sv-emoji-grid.gif-mode{grid-template-columns:repeat(2,1fr);gap:6px}",
      "#sv-emoji-panel .sv-emoji-cell{position:relative;border:none;background:transparent;border-radius:6px;padding:4px;font-size:26px;cursor:pointer;aspect-ratio:1;display:flex;align-items:center;justify-content:center;min-height:44px;touch-action:manipulation}",
      "#sv-emoji-panel .sv-emoji-cell:hover{background:rgba(255,255,255,.1)}",
      "#sv-emoji-panel .sv-emoji-cell .sv-e-star{position:absolute;top:0;right:0;font-size:10px;opacity:0;background:rgba(0,0,0,.45);border-radius:4px;padding:2px}",
      "#sv-emoji-panel .sv-emoji-cell:hover .sv-e-star,#sv-emoji-panel .sv-emoji-cell.fav .sv-e-star{opacity:1}",
      "#sv-emoji-panel .sv-emoji-cell.fav .sv-e-star{color:#f0b232}",
      "#sv-emoji-panel .sv-emoji-label{grid-column:1/-1;font-size:11px;font-weight:700;color:#949ba4;text-transform:uppercase;padding:8px 4px 4px}",
      "#sv-emoji-panel .sv-emoji-hint{grid-column:1/-1;font-size:11px;color:#949ba4;padding:4px}",
      "#sv-emoji-panel .sv-gif-cell{position:relative;border:0;padding:0;background:#1e1f22;border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1.2}",
      "#sv-emoji-panel .sv-gif-cell img{width:100%;height:100%;object-fit:cover;display:block}",
      "#sv-emoji-panel .sv-gif-star{position:absolute;top:4px;right:4px;border:0;background:rgba(0,0,0,.5);color:#f0b232;border-radius:4px;cursor:pointer;font-size:14px;padding:2px 5px}",
      ".sv-composer-wrap{position:relative}",
      "@media (max-width:768px),(hover:none) and (pointer:coarse){",
      "  #sv-emoji-panel,#server-view .sv-emoji-panel{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;width:100%!important;max-width:100%!important;max-height:min(55vh,420px)!important;border-radius:16px 16px 0 0!important;z-index:100050!important}",
      "  #sv-emoji-panel .sv-emoji-grid{grid-template-columns:repeat(7,1fr)!important;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}",
      "}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function insertAtCursor(input, text) {
    if (!input) return;
    var start = input.selectionStart != null ? input.selectionStart : input.value.length;
    var end = input.selectionEnd != null ? input.selectionEnd : start;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    var pos = start + text.length;
    try { input.setSelectionRange(pos, pos); } catch (e) {}
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function closePanel() {
    var panel = document.getElementById("sv-emoji-panel");
    var btn = document.getElementById("sv-emoji-btn");
    if (panel) panel.hidden = true;
    if (btn) btn.classList.remove("active");
  }

  function openPanel() {
    ensureUi(false);
    var panel = document.getElementById("sv-emoji-panel");
    var btn = document.getElementById("sv-emoji-btn");
    if (!panel) {
      ensureUi(true);
      panel = document.getElementById("sv-emoji-panel");
    }
    if (!panel) return;
    window.__svEmojiOpenedAt = Date.now();
    panel.hidden = false;
    if (btn) btn.classList.add("active");
    var favs = loadFavEmojis();
    renderGrid(favs.length ? "emoji-favs" : "smileys", "");
  }

  function togglePanel() {
    var panel = document.getElementById("sv-emoji-panel");
    if (!panel || panel.hidden) openPanel();
    else closePanel();
  }

  window.__svToggleEmojiPanel = togglePanel;
  window.__svOpenEmojiPanel = openPanel;

  function setActiveTab(id) {
    document.querySelectorAll("#sv-emoji-panel .sv-emoji-tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-cat") === id);
    });
  }

  function emojiCellHtml(e, favs) {
    var isFav = favs.indexOf(e) >= 0;
    return '<button type="button" class="sv-emoji-cell' + (isFav ? " fav" : "") +
      '" data-emoji="' + esc(e) + '">' + e +
      '<span class="sv-e-star" data-fav-emoji="' + esc(e) + '" title="Favorite">' +
      (isFav ? "★" : "☆") + "</span></button>";
  }

  function renderGrid(catId, query) {
    var grid = document.getElementById("sv-emoji-grid");
    if (!grid) return;
    setActiveTab(catId);
    grid.dataset.mode = catId;
    var favs = loadFavEmojis();
    if (catId === "gifs" || catId === "gif-favs") {
      grid.classList.add("gif-mode");
      if (catId === "gif-favs") renderGifCells(loadFavGifs());
      else loadGifs(query || "hello");
      return;
    }
    grid.classList.remove("gif-mode");
    if (catId === "emoji-favs") {
      var html = '<div class="sv-emoji-label">Favorites</div><div class="sv-emoji-hint">Tap ★ on any emoji to favorite</div>';
      if (!favs.length) html += '<div class="sv-emoji-hint">No favorites yet</div>';
      else favs.forEach(function (e) { html += emojiCellHtml(e, favs); });
      grid.innerHTML = html;
      return;
    }
    var cat = CATEGORIES[0];
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === catId) cat = CATEGORIES[i];
    }
    var html2 = '<div class="sv-emoji-label">' + esc(cat.label) + "</div>";
    (cat.emojis || []).forEach(function (e) { if (e) html2 += emojiCellHtml(e, favs); });
    grid.innerHTML = html2;
  }

  async function loadGifs(q) {
    var grid = document.getElementById("sv-emoji-grid");
    if (!grid) return;
    grid.innerHTML = '<p class="sv-emoji-label">Loading GIFs…</p>';
    try {
      var res = await fetch("/api/messages?resource=gifs&q=" + encodeURIComponent(q || "hello"), { credentials: "include", cache: "no-store" });
      var data = await res.json();
      renderGifCells(data.gifs || []);
    } catch (e) {
      grid.innerHTML = '<p class="sv-emoji-label" style="color:#f23f43">Failed to load GIFs</p>';
    }
  }

  function renderGifCells(gifs) {
    var grid = document.getElementById("sv-emoji-grid");
    if (!grid) return;
    grid.classList.add("gif-mode");
    var favs = loadFavGifs();
    if (!gifs.length) { grid.innerHTML = '<p class="sv-emoji-label">No GIFs</p>'; return; }
    grid.innerHTML = gifs.map(function (g) {
      var starred = favs.some(function (f) { return f && f.url === g.url; });
      var src = previewSrc(g);
      return '<div class="sv-gif-cell" data-gif-url="' + esc(g.url) + '">' +
        '<img src="' + esc(src) + '" alt="' + esc(g.title || "gif") + '" loading="lazy">' +
        '<button type="button" class="sv-gif-star" data-star="1">' + (starred ? "★" : "☆") + "</button></div>";
    }).join("");
  }

  async function sendGif(url) {
    var cid = channelId();
    var gid = guildId();
    if (!url || !cid || !gid) return;
    try {
      var res = await fetch("/api/messages", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ guildId: gid, channelId: cid, content: url })
      });
      if (!res.ok) {
        var data = await res.json().catch(function () { return {}; });
        alert(data.error || "Failed to send GIF");
        return;
      }
      closePanel();
      if (typeof window.__svForceReloadMessages === "function") window.__svForceReloadMessages();
    } catch (e) { alert(e.message || "Send failed"); }
  }

  function ensureUi(force) {
    injectCss();
    var input = getInput();
    if (!input) return false;
    var composer = document.getElementById("sv-composer") || input.closest("form") || input.parentElement;
    if (!composer) return false;
    composer.classList.add("sv-composer-wrap");
    try { if (getComputedStyle(composer).position === "static") composer.style.position = "relative"; } catch (e) {}

    var btn = document.getElementById("sv-emoji-btn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "sv-emoji-btn";
      btn.className = "sv-emoji-btn";
      btn.title = "Emoji & GIFs";
      btn.textContent = "😀";
      var send = document.getElementById("sv-send");
      if (send && send.parentElement) send.parentElement.insertBefore(btn, send);
      else if (input.parentElement) input.parentElement.appendChild(btn);
      else composer.appendChild(btn);
    }
    // NO click handler here — sv-emoji-force owns a single delegated open path

    var panel = document.getElementById("sv-emoji-panel");
    if (!panel || force) {
      if (panel) panel.remove();
      panel = document.createElement("div");
      panel.id = "sv-emoji-panel";
      panel.className = "sv-emoji-panel";
      panel.hidden = true;

      var tabs = document.createElement("div");
      tabs.className = "sv-emoji-tabs";
      function addTab(id, title, label, active) {
        var t = document.createElement("button");
        t.type = "button";
        t.className = "sv-emoji-tab" + (active ? " active" : "");
        t.setAttribute("data-cat", id);
        t.title = title;
        t.textContent = label;
        tabs.appendChild(t);
      }
      addTab("emoji-favs", "Favorite emojis", "★", false);
      CATEGORIES.forEach(function (c, i) { addTab(c.id, c.label, c.icon, i === 0); });
      addTab("gifs", "GIFs", "GIF", false);
      addTab("gif-favs", "Favorite GIFs", "★G", false);

      var searchWrap = document.createElement("div");
      searchWrap.className = "sv-emoji-search-wrap";
      var search = document.createElement("input");
      search.type = "search";
      search.id = "sv-emoji-search";
      search.className = "sv-emoji-search";
      search.placeholder = "Search GIFs…";
      search.autocomplete = "off";
      searchWrap.appendChild(search);

      var grid = document.createElement("div");
      grid.id = "sv-emoji-grid";
      grid.className = "sv-emoji-grid";

      panel.appendChild(tabs);
      panel.appendChild(searchWrap);
      panel.appendChild(grid);
      composer.appendChild(panel);

      tabs.addEventListener("click", function (e) {
        var t = e.target.closest ? e.target.closest("[data-cat]") : null;
        if (!t) return;
        renderGrid(t.getAttribute("data-cat"), search.value || "");
      });

      var searchTimer = null;
      search.addEventListener("input", function (e) {
        var q = e.target.value || "";
        var mode = grid.dataset.mode || "smileys";
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          if (mode === "gifs" || mode === "gif-favs") {
            setActiveTab("gifs");
            loadGifs(q || "hello");
          }
        }, 300);
      });

      grid.addEventListener("click", function (e) {
        var star = e.target.closest ? e.target.closest("[data-fav-emoji]") : null;
        if (star) {
          e.preventDefault(); e.stopPropagation();
          toggleFavEmoji(star.getAttribute("data-fav-emoji"));
          renderGrid(grid.dataset.mode || "smileys", "");
          return;
        }
        var gifStar = e.target.closest ? e.target.closest("[data-star]") : null;
        if (gifStar) {
          e.preventDefault(); e.stopPropagation();
          var cell = gifStar.closest("[data-gif-url]");
          if (!cell) return;
          var url = cell.getAttribute("data-gif-url");
          var list = loadFavGifs();
          var idx = list.findIndex(function (g) { return g && g.url === url; });
          if (idx >= 0) list.splice(idx, 1);
          else list.unshift({ url: url, preview: url, title: "gif" });
          saveFavGifs(list);
          gifStar.textContent = idx >= 0 ? "☆" : "★";
          return;
        }
        var gif = e.target.closest ? e.target.closest("[data-gif-url]") : null;
        if (gif) { sendGif(gif.getAttribute("data-gif-url")); return; }
        var cellE = e.target.closest ? e.target.closest("[data-emoji]") : null;
        if (!cellE) return;
        insertAtCursor(getInput(), cellE.getAttribute("data-emoji"));
      });
    }

    if (!window.__svEmojiOutsideBound) {
      window.__svEmojiOutsideBound = true;
      document.addEventListener("click", function (e) {
        var panel = document.getElementById("sv-emoji-panel");
        var btn = document.getElementById("sv-emoji-btn");
        var fb = document.getElementById("sv-emoji-fallback");
        if (!panel || panel.hidden) return;
        if (window.__svEmojiOpenedAt && Date.now() - window.__svEmojiOpenedAt < 450) return;
        if (panel.contains(e.target)) return;
        if (btn && btn.contains(e.target)) return;
        if (fb && fb.contains(e.target)) return;
        closePanel();
      }, true);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closePanel();
      });
    }
    return true;
  }

  window.__svEnsureEmojiPicker = ensureUi;

  function boot() {
    injectCss();
    ensureUi(true);
    setInterval(function () {
      var view = document.getElementById("server-view");
      if (view && !view.hidden) ensureUi(false);
    }, 4000);
    console.log("[sv-emoji-picker] v8 ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
