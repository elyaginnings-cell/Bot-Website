/**
 * Full emoji + GIF picker with favorite emojis.
 * Long-press or star on an emoji to favorite. Star tab = favorites.
 */
(function () {
  "use strict";
  window.__svEmojiPickerV6 = true;

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
        "💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
      ],
    },
    {
      id: "gestures",
      label: "Gestures",
      icon: "👋",
      emojis: [
        "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆",
        "🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️",
        "💅","💪","👀","👁️","👅","👄","💋",
      ],
    },
    {
      id: "people",
      label: "People",
      icon: "👤",
      emojis: [
        "👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","👮","💂","🥷","👷",
        "🤴","👸","🦸","🦹","🧙","🧚","🧛","🧜","エルフ","🧞","🧟","🚶","🏃","💃","🕺","🧘",
      ],
    },
    {
      id: "animals",
      label: "Animals",
      icon: "🐶",
      emojis: [
        "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
        "🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🦄","🐝","🐛","🦋",
        "🐢","🐍","🦎","🐙","🦑","🐠","🐟","🐬","🐳","🦈","🐊",
      ],
    },
    {
      id: "food",
      label: "Food",
      icon: "☕",
      emojis: [
        "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍑","🥭","🍍","🥝","🍅","🥑",
        "🥐","🍞","🧀","🥚","🍳","🥞","🥓","🍔","🍟","🍕","🌮","🌯","🍝","🍜","🍣","🍩",
        "🍪","🎂","🍰","☕","🍵","🧋","🍺","🍻","🥂","🍷","🍸","🍹","🧊",
      ],
    },
    {
      id: "activities",
      label: "Activities",
      icon: "⚽",
      emojis: [
        "⚽","🏀","🏈","⚾","🎾","🏐","🎱","🏓","⛳","🏹","🥊","🎿","🏂","🏊","🏄","🚴",
        "🏆","🥇","🥈","🥉","🎯","🎮","🎲","🎭","🎨","🎬","🎤","🎧","🎸","🎹",
      ],
    },
    {
      id: "objects",
      label: "Objects",
      icon: "💡",
      emojis: [
        "⌚","📱","💻","⌨️","🖥️","📷","🎥","📞","📺","🔋","💡","🔦","💵","💰","💎",
        "🔧","🔨","🔑","🎁","🎈","🎉","🎊","✉️","📦","📅",
      ],
    },
    {
      id: "symbols",
      label: "Symbols",
      icon: "❤️",
      emojis: [
        "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💕","💖","💗","💘","💝",
        "💯","💢","💥","💫","✅","❌","⭕","❗","❓","⭐","🌟","✨","⚡","🔥","🌈","☀️","🌙",
      ],
    },
    {
      id: "flags",
      label: "Flags",
      icon: "🏁",
      emojis: [
        "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏴‍☠️",
        "🇺🇸","🇬🇧","🇨🇦","🇦🇺","🇩🇪","🇫🇷","🇮🇹","🇪🇸","🇯🇵","🇰🇷","🇨🇳","🇧🇷","🇲🇽","🇮🇳","🇷🇺","🇺🇦",
      ],
    },
  ];

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function loadFavEmojis() {
    try {
      var a = JSON.parse(localStorage.getItem(FAV_EMOJI_KEY) || "[]") || [];
      return a.filter(function (e) {
        return typeof e === "string" && e;
      });
    } catch (e) {
      return [];
    }
  }

  function saveFavEmojis(arr) {
    try {
      localStorage.setItem(FAV_EMOJI_KEY, JSON.stringify(arr.slice(0, 64)));
    } catch (e) {}
  }

  function toggleFavEmoji(emoji) {
    var list = loadFavEmojis();
    var i = list.indexOf(emoji);
    if (i >= 0) list.splice(i, 1);
    else list.unshift(emoji);
    saveFavEmojis(list);
    return list.indexOf(emoji) >= 0;
  }

  function loadFavGifs() {
    try {
      return JSON.parse(localStorage.getItem(FAV_GIF_KEY) || "[]") || [];
    } catch (e) {
      return [];
    }
  }

  function saveFavGifs(arr) {
    try {
      localStorage.setItem(FAV_GIF_KEY, JSON.stringify(arr.slice(0, 48)));
    } catch (e) {}
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
    return (
      document.getElementById("sv-input") ||
      document.querySelector("#server-view textarea, #server-view #sv-composer input")
    );
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
      "#server-view .sv-emoji-btn,#sv-emoji-btn{display:inline-flex!important;visibility:visible!important;opacity:1!important;flex-shrink:0;width:40px;height:40px;border:none;border-radius:8px;background:#2b2d31;color:#fff;font-size:22px;cursor:pointer;align-items:center;justify-content:center}",
      "#server-view .sv-emoji-btn:hover,#sv-emoji-btn:hover{background:#5865f2}",
      "#server-view .sv-emoji-btn.active{background:rgba(88,101,242,.45)}",
      "#server-view .sv-emoji-panel{position:absolute;bottom:calc(100% + 8px);right:0;z-index:90;width:min(380px,94vw);max-height:min(420px,60vh);background:#2b2d31;border:1px solid #1e1f22;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.45);display:flex;flex-direction:column;overflow:hidden}",
      "#server-view .sv-emoji-panel[hidden]{display:none!important}",
      "#server-view .sv-emoji-tabs{display:flex;gap:2px;padding:8px;border-bottom:1px solid #1e1f22;overflow-x:auto;flex-shrink:0}",
      "#server-view .sv-emoji-tab{flex:0 0 auto;min-width:32px;height:32px;padding:0 6px;border:none;border-radius:6px;background:transparent;font-size:16px;font-weight:700;cursor:pointer;color:#dbdee1}",
      "#server-view .sv-emoji-tab.active{background:rgba(88,101,242,.35);color:#fff}",
      "#server-view .sv-emoji-search-wrap{padding:6px 10px}",
      "#server-view .sv-emoji-search{width:100%;box-sizing:border-box;border:none;border-radius:6px;padding:8px 10px;font-size:13px;background:#1e1f22;color:#dbdee1;outline:none}",
      "#server-view .sv-emoji-grid{flex:1;overflow-y:auto;padding:6px 8px 12px;display:grid;grid-template-columns:repeat(8,1fr);gap:2px}",
      "#server-view .sv-emoji-grid.gif-mode{grid-template-columns:repeat(2,1fr);gap:6px}",
      "#server-view .sv-emoji-cell{position:relative;border:none;background:transparent;border-radius:6px;padding:4px;font-size:24px;cursor:pointer;aspect-ratio:1;display:flex;align-items:center;justify-content:center}",
      "#server-view .sv-emoji-cell:hover{background:rgba(255,255,255,.1)}",
      "#server-view .sv-emoji-cell .sv-e-star{position:absolute;top:0;right:0;font-size:10px;line-height:1;opacity:0;background:rgba(0,0,0,.45);border-radius:4px;padding:2px}",
      "#server-view .sv-emoji-cell:hover .sv-e-star,#server-view .sv-emoji-cell.fav .sv-e-star{opacity:1}",
      "#server-view .sv-emoji-cell.fav .sv-e-star{color:#f0b232}",
      "#server-view .sv-emoji-label{grid-column:1/-1;font-size:11px;font-weight:700;color:#949ba4;text-transform:uppercase;padding:8px 4px 4px}",
      "#server-view .sv-emoji-hint{grid-column:1/-1;font-size:11px;color:#949ba4;padding:4px;opacity:.85}",
      "#server-view .sv-gif-cell{position:relative;border:0;padding:0;background:#1e1f22;border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1.2}",
      "#server-view .sv-gif-cell img{width:100%;height:100%;object-fit:cover;display:block}",
      "#server-view .sv-gif-star{position:absolute;top:4px;right:4px;border:0;background:rgba(0,0,0,.5);color:#f0b232;border-radius:4px;cursor:pointer;font-size:14px;padding:2px 5px}",
      "#server-view .sv-composer-wrap{position:relative}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function insertAtCursor(input, text) {
    if (!input) return;
    var start = input.selectionStart != null ? input.selectionStart : input.value.length;
    var end = input.selectionEnd != null ? input.selectionEnd : start;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    var pos = start + text.length;
    try {
      input.setSelectionRange(pos, pos);
    } catch (e) {}
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
    var panel = document.getElementById("sv-emoji-panel");
    var btn = document.getElementById("sv-emoji-btn");
    if (!panel) return;
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

  function setActiveTab(id) {
    document.querySelectorAll("#sv-emoji-panel .sv-emoji-tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-cat") === id);
    });
  }

  function emojiCellHtml(e, favs) {
    var isFav = favs.indexOf(e) >= 0;
    return (
      '<button type="button" class="sv-emoji-cell' +
      (isFav ? " fav" : "") +
      '" data-emoji="' +
      esc(e) +
      '">' +
      e +
      '<span class="sv-e-star" data-fav-emoji="' +
      esc(e) +
      '" title="Favorite">' +
      (isFav ? "★" : "☆") +
      "</span></button>"
    );
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
      var html =
        '<div class="sv-emoji-label">Favorites</div>' +
        '<div class="sv-emoji-hint">Tap ★ on any emoji to add/remove · long-press also works</div>';
      if (!favs.length) {
        html += '<div class="sv-emoji-hint">No favorites yet — star some emojis!</div>';
      } else {
        favs.forEach(function (e) {
          html += emojiCellHtml(e, favs);
        });
      }
      grid.innerHTML = html;
      return;
    }

    var cat = CATEGORIES[0];
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === catId) cat = CATEGORIES[i];
    }
    var html2 = '<div class="sv-emoji-label">' + esc(cat.label) + "</div>";
    cat.emojis.forEach(function (e) {
      html2 += emojiCellHtml(e, favs);
    });
    grid.innerHTML = html2;
  }

  async function loadGifs(q) {
    var grid = document.getElementById("sv-emoji-grid");
    if (!grid) return;
    grid.innerHTML = '<p class="sv-emoji-label">Loading GIFs…</p>';
    try {
      var res = await fetch(
        "/api/messages?resource=gifs&q=" + encodeURIComponent(q || "hello"),
        { credentials: "include", cache: "no-store" }
      );
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
    if (!gifs.length) {
      grid.innerHTML = '<p class="sv-emoji-label">No GIFs</p>';
      return;
    }
    grid.innerHTML = gifs
      .map(function (g) {
        var starred = favs.some(function (f) {
          return f && f.url === g.url;
        });
        var src = previewSrc(g);
        return (
          '<div class="sv-gif-cell" data-gif-url="' +
          esc(g.url) +
          '">' +
          '<img src="' +
          esc(src) +
          '" alt="' +
          esc(g.title || "gif") +
          '" loading="lazy">' +
          '<button type="button" class="sv-gif-star" data-star="1">' +
          (starred ? "★" : "☆") +
          "</button></div>"
        );
      })
      .join("");
  }

  async function sendGif(url) {
    var cid = channelId();
    var gid = guildId();
    if (!url || !cid || !gid) return;
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
      closePanel();
      if (typeof window.__svForceReloadMessages === "function") window.__svForceReloadMessages();
    } catch (e) {
      alert(e.message || "Send failed");
    }
  }

  function ensureUi(force) {
    injectCss();
    var input = getInput();
    if (!input) return false;

    var composer = document.getElementById("sv-composer") || input.closest("form") || input.parentElement;
    if (!composer) return false;
    composer.classList.add("sv-composer-wrap");
    if (getComputedStyle(composer).position === "static") composer.style.position = "relative";

    var btn = document.getElementById("sv-emoji-btn");
    if (!btn || force) {
      if (btn) btn.remove();
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
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        togglePanel();
      });
    }

    var panel = document.getElementById("sv-emoji-panel");
    if (!panel || force) {
      if (panel) panel.remove();
      panel = document.createElement("div");
      panel.id = "sv-emoji-panel";
      panel.className = "sv-emoji-panel";
      panel.hidden = true;

      var tabs = document.createElement("div");
      tabs.className = "sv-emoji-tabs";

      var favTab = document.createElement("button");
      favTab.type = "button";
      favTab.className = "sv-emoji-tab";
      favTab.setAttribute("data-cat", "emoji-favs");
      favTab.title = "Favorite emojis";
      favTab.textContent = "★";
      tabs.appendChild(favTab);

      CATEGORIES.forEach(function (c, i) {
        var t = document.createElement("button");
        t.type = "button";
        t.className = "sv-emoji-tab" + (i === 0 ? " active" : "");
        t.setAttribute("data-cat", c.id);
        t.title = c.label;
        t.textContent = c.icon;
        tabs.appendChild(t);
      });

      var gifTab = document.createElement("button");
      gifTab.type = "button";
      gifTab.className = "sv-emoji-tab";
      gifTab.setAttribute("data-cat", "gifs");
      gifTab.title = "GIFs";
      gifTab.textContent = "GIF";
      tabs.appendChild(gifTab);

      var gifFavTab = document.createElement("button");
      gifFavTab.type = "button";
      gifFavTab.className = "sv-emoji-tab";
      gifFavTab.setAttribute("data-cat", "gif-favs");
      gifFavTab.title = "Favorite GIFs";
      gifFavTab.textContent = "★G";
      tabs.appendChild(gifFavTab);

      var searchWrap = document.createElement("div");
      searchWrap.className = "sv-emoji-search-wrap";
      searchWrap.innerHTML =
        '<input type="search" id="sv-emoji-search" class="sv-emoji-search" placeholder="Search GIFs…" autocomplete="off">';
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
        var search = document.getElementById("sv-emoji-search");
        renderGrid(t.getAttribute("data-cat"), search ? search.value : "");
      });

      var searchTimer = null;
      document.getElementById("sv-emoji-search").addEventListener("input", function (e) {
        var q = e.target.value || "";
        var mode = document.getElementById("sv-emoji-grid").dataset.mode || "smileys";
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          if (mode === "gifs" || mode === "gif-favs") {
            setActiveTab("gifs");
            loadGifs(q || "hello");
          }
        }, 300);
      });

      var holdTimer = null;
      var holdEmoji = null;
      grid.addEventListener("pointerdown", function (e) {
        var star = e.target.closest ? e.target.closest("[data-fav-emoji]") : null;
        if (star) return;
        var cell = e.target.closest ? e.target.closest("[data-emoji]") : null;
        if (!cell) return;
        holdEmoji = cell.getAttribute("data-emoji");
        holdTimer = setTimeout(function () {
          if (!holdEmoji) return;
          toggleFavEmoji(holdEmoji);
          renderGrid(grid.dataset.mode || "smileys", "");
          holdEmoji = null;
        }, 450);
      });
      function clearHold() {
        if (holdTimer) clearTimeout(holdTimer);
        holdTimer = null;
        holdEmoji = null;
      }
      grid.addEventListener("pointerup", clearHold);
      grid.addEventListener("pointerleave", clearHold);
      grid.addEventListener("pointercancel", clearHold);

      grid.addEventListener("click", function (e) {
        var star = e.target.closest ? e.target.closest("[data-fav-emoji]") : null;
        if (star) {
          e.preventDefault();
          e.stopPropagation();
          toggleFavEmoji(star.getAttribute("data-fav-emoji"));
          renderGrid(grid.dataset.mode || "smileys", "");
          return;
        }
        var gifStar = e.target.closest ? e.target.closest("[data-star]") : null;
        if (gifStar) {
          e.preventDefault();
          e.stopPropagation();
          var cell = gifStar.closest("[data-gif-url]");
          if (!cell) return;
          var url = cell.getAttribute("data-gif-url");
          var list = loadFavGifs();
          var idx = list.findIndex(function (g) {
            return g && g.url === url;
          });
          if (idx >= 0) list.splice(idx, 1);
          else list.unshift({ url: url, preview: url, title: "gif" });
          saveFavGifs(list);
          gifStar.textContent = idx >= 0 ? "☆" : "★";
          return;
        }
        var gif = e.target.closest ? e.target.closest("[data-gif-url]") : null;
        if (gif) {
          sendGif(gif.getAttribute("data-gif-url"));
          return;
        }
        var cellE = e.target.closest ? e.target.closest("[data-emoji]") : null;
        if (!cellE) return;
        insertAtCursor(getInput(), cellE.getAttribute("data-emoji"));
      });
    }

    if (!window.__svEmojiOutsideBound) {
      window.__svEmojiOutsideBound = true;
      document.addEventListener(
        "click",
        function (e) {
          var panel = document.getElementById("sv-emoji-panel");
          var btn = document.getElementById("sv-emoji-btn");
          if (!panel || panel.hidden) return;
          if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
          closePanel();
        },
        true
      );
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
    }, 2000);
    console.log("[sv-emoji-picker] v6 favorites + 🥹");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
