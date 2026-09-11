/**
 * Emoji + GIF picker (GIF is a tab inside the emoji panel)
 */
(function () {
  "use strict";
  if (window.__svEmojiPickerV2) return;
  window.__svEmojiPickerV2 = true;

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
        "😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭",
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
      id: "food",
      label: "Food",
      icon: "☕",
      emojis: [
        "☕","🫖","🍵","🧋","🥤","🍺","🍻","🥂","🍷","🍕","🍔","🍟","🌮","🍣","🍩","🍪",
        "🎂","🍰","🍦","🍎","🍌","🍇","🍓","🥑","🌮","🌯","🍜","🍝","🍳","🥐",
      ],
    },
    {
      id: "symbols",
      label: "Symbols",
      icon: "❤️",
      emojis: [
        "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💯","💢","💥","💫","⭐","🌟",
        "✨","🔥","✅","❌","⭕","❓","❗","💬","🎉","🎊","🏆","🎁","💤","🎵",
      ],
    },
  ];

  var FAV_GIF_KEY = "sv_fav_gifs_v1";

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getInput() {
    return document.getElementById("sv-input");
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

  function injectCss() {
    if (document.getElementById("sv-emoji-picker-css")) return;
    var s = document.createElement("style");
    s.id = "sv-emoji-picker-css";
    s.textContent = [
      "#server-view .sv-emoji-btn{flex-shrink:0;width:36px;height:36px;border:none;border-radius:8px;background:transparent;color:#b5bac1;font-size:22px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}",
      "#server-view .sv-emoji-btn:hover{background:rgba(255,255,255,.08);color:#fff}",
      "#server-view .sv-emoji-btn.active{background:rgba(88,101,242,.25);color:#fff}",
      "#server-view .sv-emoji-panel{position:absolute;bottom:calc(100% + 8px);right:0;z-index:90;width:min(380px,94vw);max-height:min(420px,60vh);background:#2b2d31;border:1px solid #1e1f22;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.45);display:flex;flex-direction:column;overflow:hidden}",
      "#server-view .sv-emoji-panel[hidden]{display:none!important}",
      "#server-view .sv-emoji-tabs{display:flex;gap:2px;padding:8px 8px 6px;border-bottom:1px solid #1e1f22;overflow-x:auto;flex-shrink:0;scrollbar-width:none}",
      "#server-view .sv-emoji-tabs::-webkit-scrollbar{display:none}",
      "#server-view .sv-emoji-tab{flex:0 0 auto;min-width:32px;height:32px;padding:0 6px;border:none;border-radius:6px;background:transparent;font-size:14px;font-weight:700;cursor:pointer;line-height:1;color:#dbdee1}",
      "#server-view .sv-emoji-tab:hover{background:rgba(255,255,255,.08)}",
      "#server-view .sv-emoji-tab.active{background:rgba(88,101,242,.35);color:#fff}",
      "#server-view .sv-emoji-search-wrap{padding:6px 10px;flex-shrink:0}",
      "#server-view .sv-emoji-search{width:100%;box-sizing:border-box;border:none;border-radius:6px;padding:8px 10px;font-size:13px;background:#1e1f22;color:#dbdee1;outline:none}",
      "#server-view .sv-emoji-grid{flex:1 1 auto;overflow-y:auto;padding:6px 8px 12px;display:grid;grid-template-columns:repeat(8,1fr);gap:2px;-webkit-overflow-scrolling:touch}",
      "#server-view .sv-emoji-grid.gif-mode{grid-template-columns:repeat(2,1fr);gap:6px}",
      "#server-view .sv-emoji-cell{border:none;background:transparent;border-radius:6px;padding:4px;font-size:24px;line-height:1.2;cursor:pointer;aspect-ratio:1;display:flex;align-items:center;justify-content:center}",
      "#server-view .sv-emoji-cell:hover{background:rgba(255,255,255,.1)}",
      "#server-view .sv-emoji-label{grid-column:1/-1;font-size:11px;font-weight:700;color:#949ba4;text-transform:uppercase;letter-spacing:.03em;padding:8px 4px 4px}",
      "#server-view .sv-gif-cell{position:relative;border:0;padding:0;background:#1e1f22;border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1.2}",
      "#server-view .sv-gif-cell img{width:100%;height:100%;object-fit:cover;display:block}",
      "#server-view .sv-gif-star{position:absolute;top:4px;right:4px;border:0;background:rgba(0,0,0,.5);color:#f0b232;border-radius:4px;cursor:pointer;font-size:14px;padding:2px 5px}",
      "#server-view .sv-composer-wrap{position:relative}",
      /* hide legacy standalone GIF button if present */
      "#server-view #sv-gif-btn,#server-view .sv-gif-btn{display:none!important}",
      "#server-view #sv-gif-panel{display:none!important}",
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
    var search = document.getElementById("sv-emoji-search");
    if (search) {
      search.value = "";
      search.placeholder = "Search emoji or GIFs…";
      setTimeout(function () {
        search.focus();
      }, 40);
    }
    renderGrid("smileys", "");
  }

  function togglePanel() {
    var panel = document.getElementById("sv-emoji-panel");
    if (!panel || panel.hidden) openPanel();
    else closePanel();
  }

  function setActiveTab(id) {
    var tabs = document.querySelectorAll("#sv-emoji-panel .sv-emoji-tab");
    tabs.forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-cat") === id);
    });
  }

  function renderGrid(catId, query) {
    var grid = document.getElementById("sv-emoji-grid");
    if (!grid) return;
    setActiveTab(catId);
    grid.dataset.mode = catId;

    if (catId === "gifs" || catId === "gif-favs") {
      grid.classList.add("gif-mode");
      if (catId === "gif-favs") {
        renderGifCells(loadFavGifs());
      } else {
        loadGifs(query || "hello");
      }
      return;
    }

    grid.classList.remove("gif-mode");
    var cat = null;
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === catId) {
        cat = CATEGORIES[i];
        break;
      }
    }
    if (!cat) cat = CATEGORIES[0];
    var html = '<div class="sv-emoji-label">' + esc(cat.label) + "</div>";
    cat.emojis.forEach(function (e) {
      html +=
        '<button type="button" class="sv-emoji-cell" data-emoji="' +
        esc(e) +
        '">' +
        e +
        "</button>";
    });
    grid.innerHTML = html;
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
        return (
          '<div class="sv-gif-cell" data-gif-url="' +
          esc(g.url) +
          '">' +
          '<img src="' +
          esc(g.preview || g.url) +
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
    } catch (e) {
      alert(e.message || "Send failed");
    }
  }

  function ensureUi() {
    var input = getInput();
    if (!input) return false;
    if (document.getElementById("sv-emoji-btn")) return true;

    var composer = document.getElementById("sv-composer") || input.parentElement;
    if (!composer) return false;
    if (!composer.classList.contains("sv-composer-wrap")) {
      composer.classList.add("sv-composer-wrap");
      if (getComputedStyle(composer).position === "static") composer.style.position = "relative";
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "sv-emoji-btn";
    btn.className = "sv-emoji-btn";
    btn.title = "Emoji & GIFs";
    btn.textContent = "😀";

    var send = document.getElementById("sv-send");
    if (send && send.parentElement) send.parentElement.insertBefore(btn, send);
    else if (input.parentElement) input.parentElement.appendChild(btn);
    else composer.appendChild(btn);

    var panel = document.createElement("div");
    panel.id = "sv-emoji-panel";
    panel.className = "sv-emoji-panel";
    panel.hidden = true;

    var tabs = document.createElement("div");
    tabs.className = "sv-emoji-tabs";
    CATEGORIES.forEach(function (c, i) {
      var t = document.createElement("button");
      t.type = "button";
      t.className = "sv-emoji-tab" + (i === 0 ? " active" : "");
      t.setAttribute("data-cat", c.id);
      t.title = c.label;
      t.textContent = c.icon;
      tabs.appendChild(t);
    });
    // GIF tabs
    var gifTab = document.createElement("button");
    gifTab.type = "button";
    gifTab.className = "sv-emoji-tab";
    gifTab.setAttribute("data-cat", "gifs");
    gifTab.title = "GIFs";
    gifTab.textContent = "GIF";
    tabs.appendChild(gifTab);

    var favTab = document.createElement("button");
    favTab.type = "button";
    favTab.className = "sv-emoji-tab";
    favTab.setAttribute("data-cat", "gif-favs");
    favTab.title = "Favorite GIFs";
    favTab.textContent = "★";
    tabs.appendChild(favTab);

    var searchWrap = document.createElement("div");
    searchWrap.className = "sv-emoji-search-wrap";
    searchWrap.innerHTML =
      '<input type="search" id="sv-emoji-search" class="sv-emoji-search" placeholder="Search emoji or GIFs…" autocomplete="off">';

    var grid = document.createElement("div");
    grid.id = "sv-emoji-grid";
    grid.className = "sv-emoji-grid";

    panel.appendChild(tabs);
    panel.appendChild(searchWrap);
    panel.appendChild(grid);
    composer.appendChild(panel);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    });

    tabs.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-cat]") : null;
      if (!t) return;
      var id = t.getAttribute("data-cat");
      var search = document.getElementById("sv-emoji-search");
      renderGrid(id, search ? search.value : "");
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

    grid.addEventListener("click", function (e) {
      var star = e.target.closest ? e.target.closest("[data-star]") : null;
      if (star) {
        e.preventDefault();
        e.stopPropagation();
        var cell = star.closest("[data-gif-url]");
        if (!cell) return;
        var url = cell.getAttribute("data-gif-url");
        var img = cell.querySelector("img");
        var list = loadFavGifs();
        var idx = list.findIndex(function (g) {
          return g && g.url === url;
        });
        if (idx >= 0) list.splice(idx, 1);
        else
          list.unshift({
            url: url,
            preview: img && img.src,
            title: (img && img.alt) || "gif",
          });
        saveFavGifs(list);
        star.textContent = idx >= 0 ? "☆" : "★";
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

    renderGrid(CATEGORIES[0].id, "");
    console.log("[sv-emoji-picker] v2 emoji + GIF tabs ready");
    return true;
  }

  function boot() {
    injectCss();
    ensureUi();
    setInterval(function () {
      var view = document.getElementById("server-view");
      if (view && !view.hidden) ensureUi();
    }, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
