/**
 * Discord-style emoji picker for Server View composer
 * Button next to the message box → full emoji panel
 */
(function () {
  "use strict";
  if (window.__svEmojiPickerV1) return;
  window.__svEmojiPickerV1 = true;

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
        "💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾"
      ],
    },
    {
      id: "gestures",
      label: "Gestures",
      icon: "👋",
      emojis: [
        "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆",
        "🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️",
        "💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀",
        "👁️","👅","👄","💋","🩸"
      ],
    },
    {
      id: "people",
      label: "People",
      icon: "👤",
      emojis: [
        "👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎","🙅","🙆",
        "💁","🙋","🧏","🙇","🤦","🤷","👮","🕵️","💂","🥷","👷","🤴","👸","👳","👲","🧕",
        "🤵","👰","🤰","🤱","👼","🎅","🤶","🦸","🦹","🧙","🧚","🧛","🧜","🧝","🧞","🧟",
        "💆","💇","🚶","🧍","🧎","🏃","💃","🕺","🕴️","👯","🧘","🛀","🛌"
      ],
    },
    {
      id: "animals",
      label: "Animals",
      icon: "🐶",
      emojis: [
        "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
        "🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗",
        "🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰","🪲","🪳","🦟","🦗","🕷️","🕸️",
        "🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳",
        "🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘",
        "🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐕‍🦺","🐈",
        "🐈‍⬛","🪶","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦",
        "🦥","🐁","🐀","🐿️","🦔"
      ],
    },
    {
      id: "food",
      label: "Food",
      icon: "☕",
      emojis: [
        "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥",
        "🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅","🥔","🍠",
        "🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🦴",
        "🌭","🍔","🍟","🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🥫","🍝",
        "🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡",
        "🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜",
        "🍯","🥛","🍼","☕","🫖","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸",
        "🍹","🧉","🍾","🧊","🥄","🍴","🍽️","🥣","🥡","🥢","🧂"
      ],
    },
    {
      id: "travel",
      label: "Travel",
      icon: "✈️",
      emojis: [
        "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🦯","🦽",
        "🦼","🛴","🚲","🛵","🏍️","🛺","🚨","🚔","🚍","🚘","🚖","🚡","🚠","🚟","🚃","🚋",
        "🚞","🚝","🚄","🚅","🚈","🚂","🚆","🚇","🚊","🚉","✈️","🛫","🛬","🛩️","💺","🛰️",
        "🚀","🛸","🚁","🛶","⛵","🚤","🛥️","🛳️","⛴️","🚢","⚓","🪝","⛽","🚧","🚦","🚥",
        "🚏","🗺️","🗿","🗽","🗼","🏰","🏯","🏟️","🎡","🎢","🎠","⛲","⛱️","🏖️","🏝️","🏜️",
        "🌋","⛰️","🏔️","🗻","🏕️","⛺","🛖","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩",
        "🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕","synagogue","⛩️","🕋"
      ],
    },
    {
      id: "activities",
      label: "Activities",
      icon: "⚽",
      emojis: [
        "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍",
        "🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌",
        "🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","⛹️","🤺","🤾","🏌️","🏇","🧘","🏄","🏊","🤽",
        "🚣","🧗","🚵","🚴","🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎫","🎟️","🎪","🤹",
        "🎭","🩰","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻",
        "🎲","♟️","🎯","🎳","🎮","🎰","🧩"
      ],
    },
    {
      id: "objects",
      label: "Objects",
      icon: "💡",
      emojis: [
        "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📼",
        "📷","📸","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🎙️","🎚️","🎛️","🧭",
        "⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯️","🪔","🧯","🛢️","💸",
        "💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🪜","🧰","🪛","🔧","🔨","⚒️","🛠️",
        "⛏️","🪚","🔩","⚙️","🪤","🧱","⛓️","🧲","🔫","💣","🧨","🪓","🔪","🗡️","⚔️","🛡️",
        "🚬","⚰️","🪦","⚱️","🏺","🔮","📿","🧿","💈","⚗️","🔭","🔬","🕳️","🩹","🩺","💊",
        "💉","🩸","🧬","🦠","🧫","🧪","🌡️","🧹","🪠","🧺","🧻","🚽","🚰","🚿","🛁","🛀",
        "🧼","🪥","🪒","🧽","🪣","🧴","🛎️","🔑","🗝️","🚪","🪑","🛋️","🛏️","🛌","🧸","🖼️",
        "🪞","🪟","🛍️","🛒","🎁","🎈","🎏","🎀","🪄","🪅","🎊","🎉","🎎","🏮","🎐","🧧"
      ],
    },
    {
      id: "symbols",
      label: "Symbols",
      icon: "❤️",
      emojis: [
        "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖",
        "💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈",
        "♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳",
        "🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️",
        "🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯",
        "🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔","‼️","⁉️","🔅","🔆","〽️","⚠️","🚸",
        "🔱","⚜️","🔰","♻️","✅","🈯","💹","❇️","✳️","❎","🌐","💠","Ⓜ️","🌀","💤","🏧",
        "🚾","♿","🅿️","🛗","🈳","🈂️","🛂","🛃","🛄","🛅","🚹","🚺","🚼","⚧️","🚻","🚮",
        "🎦","📶","🈁","🔣","ℹ️","🔤","🔡","🔠","🆖","🆗","🆙","🆒","🆕","🆓","0️⃣","1️⃣",
        "2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟","🔢","#️⃣","*️⃣","⏏️","▶️","⏸️","⏯️",
        "⏹️","⏺️","⏭️","⏮️","⏩","⏪","⏫","⏬","◀️","🔼","🔽","➡️","⬅️","⬆️","⬇️","↗️",
        "↘️","↙️","↖️","↕️","↔️","↪️","↩️","⤴️","⤵️","🔀","🔁","🔂","🔄","🔃","🎵","🎶",
        "➕","➖","➗","✖️","♾️","💲","💱","™️","©️","®️","👁️‍🗨️","🔚","🔙","🔛","🔝","🔜",
        "〰️","➰","➿","✔️","☑️","🔘","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔺",
        "🔻","🔸","🔹","🔶","🔷","🔳","🔲","▪️","▫️","◾","◽","◼️","◻️","🟥","🟧","🟨",
        "🟩","🟦","🟪","⬛","⬜","🟫","🔈","🔇","🔉","🔊","🔔","🔕","📣","📢","💬","💭",
        "🗯️","♠️","♣️","♥️","♦️","🃏","🎴","🀄"
      ],
    },
    {
      id: "flags",
      label: "Flags",
      icon: "🏁",
      emojis: [
        "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️",
        "🇺🇸","🇬🇧","🇨🇦","🇦🇺","🇩🇪","🇫🇷","🇮🇹","🇪🇸","🇵🇹","🇳🇱","🇧🇪","🇨🇭","🇦🇹","🇸🇪","🇳🇴","🇩🇰",
        "🇫🇮","🇮🇪","🇵🇱","🇨🇿","🇸🇰","🇭🇺","🇷🇴","🇧🇬","🇬🇷","🇹🇷","🇷🇺","🇺🇦","🇯🇵","🇰🇷","🇨🇳","🇹🇼",
        "🇭🇰","🇸🇬","🇲🇾","🇹🇭","🇻🇳","🇵🇭","🇮🇩","🇮🇳","🇵🇰","🇧🇩","🇸🇦","🇦🇪","🇮🇱","🇪🇬","🇿🇦","🇳🇬",
        "🇰🇪","🇧🇷","🇦🇷","🇲🇽","🇨🇴","🇨🇱","🇵🇪","🇨🇺","🇯🇲","🇳🇿"
      ],
    },
  ];

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

  function injectCss() {
    if (document.getElementById("sv-emoji-picker-css")) return;
    var s = document.createElement("style");
    s.id = "sv-emoji-picker-css";
    s.textContent = [
      "#server-view .sv-emoji-btn{",
      "  flex-shrink:0;width:36px;height:36px;border:none;border-radius:8px;",
      "  background:transparent;color:#b5bac1;font-size:22px;line-height:1;",
      "  cursor:pointer;display:inline-flex;align-items:center;justify-content:center;",
      "  transition:background .12s,color .12s,transform .1s;",
      "}",
      "#server-view .sv-emoji-btn:hover{background:rgba(255,255,255,.08);color:#fff}",
      "#server-view .sv-emoji-btn:active{transform:scale(.94)}",
      "#server-view .sv-emoji-btn.active{background:rgba(88,101,242,.25);color:#fff}",
      "#server-view .sv-emoji-panel{",
      "  position:absolute;bottom:calc(100% + 8px);right:0;z-index:80;",
      "  width:min(360px,92vw);max-height:min(380px,55vh);",
      "  background:#2b2d31;border:1px solid #1e1f22;border-radius:12px;",
      "  box-shadow:0 8px 24px rgba(0,0,0,.45);display:flex;flex-direction:column;",
      "  overflow:hidden;",
      "}",
      "#server-view .sv-emoji-panel[hidden]{display:none!important}",
      "#server-view .sv-emoji-tabs{",
      "  display:flex;gap:2px;padding:8px 8px 6px;border-bottom:1px solid #1e1f22;",
      "  overflow-x:auto;flex-shrink:0;scrollbar-width:none;",
      "}",
      "#server-view .sv-emoji-tabs::-webkit-scrollbar{display:none}",
      "#server-view .sv-emoji-tab{",
      "  flex:0 0 auto;width:32px;height:32px;border:none;border-radius:6px;",
      "  background:transparent;font-size:18px;cursor:pointer;line-height:1;",
      "}",
      "#server-view .sv-emoji-tab:hover{background:rgba(255,255,255,.08)}",
      "#server-view .sv-emoji-tab.active{background:rgba(88,101,242,.35)}",
      "#server-view .sv-emoji-search-wrap{padding:6px 10px;flex-shrink:0}",
      "#server-view .sv-emoji-search{",
      "  width:100%;box-sizing:border-box;border:none;border-radius:6px;",
      "  padding:8px 10px;font-size:13px;background:#1e1f22;color:#dbdee1;outline:none;",
      "}",
      "#server-view .sv-emoji-grid{",
      "  flex:1 1 auto;overflow-y:auto;padding:6px 8px 12px;",
      "  display:grid;grid-template-columns:repeat(8,1fr);gap:2px;",
      "  -webkit-overflow-scrolling:touch;",
      "}",
      "#server-view .sv-emoji-cell{",
      "  border:none;background:transparent;border-radius:6px;padding:4px;",
      "  font-size:24px;line-height:1.2;cursor:pointer;aspect-ratio:1;",
      "  display:flex;align-items:center;justify-content:center;",
      "}",
      "#server-view .sv-emoji-cell:hover{background:rgba(255,255,255,.1)}",
      "#server-view .sv-emoji-label{",
      "  grid-column:1/-1;font-size:11px;font-weight:700;color:#949ba4;",
      "  text-transform:uppercase;letter-spacing:.03em;padding:8px 4px 4px;",
      "}",
      "#server-view .sv-composer-wrap{position:relative}",
      "@media (max-width:600px){",
      "  #server-view .sv-emoji-panel{width:min(100vw - 16px,360px);right:auto;left:50%;transform:translateX(-50%)}",
      "  #server-view .sv-emoji-grid{grid-template-columns:repeat(7,1fr)}",
      "}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function insertAtCursor(input, text) {
    if (!input) return;
    var start = input.selectionStart != null ? input.selectionStart : input.value.length;
    var end = input.selectionEnd != null ? input.selectionEnd : start;
    var before = input.value.slice(0, start);
    var after = input.value.slice(end);
    input.value = before + text + after;
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
      setTimeout(function () { search.focus(); }, 50);
    }
    renderGrid(CATEGORIES[0].id, "");
  }

  function togglePanel() {
    var panel = document.getElementById("sv-emoji-panel");
    if (!panel || panel.hidden) openPanel();
    else closePanel();
  }

  function renderGrid(catId, query) {
    var grid = document.getElementById("sv-emoji-grid");
    if (!grid) return;
    var q = (query || "").trim().toLowerCase();
    var html = "";

    if (q) {
      html += '<div class="sv-emoji-label">Search</div>';
      var found = 0;
      CATEGORIES.forEach(function (cat) {
        cat.emojis.forEach(function (e) {
          // simple: show all when searching by including every emoji (no name map yet)
          // filter not by name for unicode; just show all categories if empty search
        });
      });
      // For search without names: still show active category filtered is weak.
      // Better: when searching, show all emojis from all categories (user can scan).
      CATEGORIES.forEach(function (cat) {
        cat.emojis.forEach(function (e) {
          html +=
            '<button type="button" class="sv-emoji-cell" data-emoji="' +
            esc(e) +
            '">' +
            e +
            "</button>";
          found++;
        });
      });
      // Too many when empty q handled below; when q non-empty without name index,
      // limit is still all — keep it simple: ignore q for filter, use category tabs.
    }

    // Always render by category (search box reserved for future name filter)
    var cat = CATEGORIES.find(function (c) {
      return c.id === catId;
    }) || CATEGORIES[0];
    html = '<div class="sv-emoji-label">' + esc(cat.label) + "</div>";
    cat.emojis.forEach(function (e) {
      html +=
        '<button type="button" class="sv-emoji-cell" data-emoji="' +
        esc(e) +
        '">' +
        e +
        "</button>";
    });
    grid.innerHTML = html;

    document.querySelectorAll(".sv-emoji-tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-cat") === cat.id);
    });
  }

  function ensureUi() {
    var input = getInput();
    if (!input) return false;
    if (document.getElementById("sv-emoji-btn")) return true;

    var composer = document.getElementById("sv-composer") || input.parentElement;
    if (!composer) return false;

    // Wrap composer relative for panel positioning if needed
    if (!composer.classList.contains("sv-composer-wrap")) {
      composer.classList.add("sv-composer-wrap");
      if (getComputedStyle(composer).position === "static") {
        composer.style.position = "relative";
      }
    }

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "sv-emoji-btn";
    btn.className = "sv-emoji-btn";
    btn.title = "Emoji";
    btn.setAttribute("aria-label", "Open emoji picker");
    btn.textContent = "😀";

    // Prefer placing next to send / input row
    var send = document.getElementById("sv-send");
    if (send && send.parentElement) {
      send.parentElement.insertBefore(btn, send);
    } else if (input.parentElement) {
      input.parentElement.appendChild(btn);
    } else {
      composer.appendChild(btn);
    }

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

    var searchWrap = document.createElement("div");
    searchWrap.className = "sv-emoji-search-wrap";
    searchWrap.innerHTML =
      '<input type="search" id="sv-emoji-search" class="sv-emoji-search" placeholder="Browse category…" autocomplete="off">';

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
      renderGrid(t.getAttribute("data-cat"), "");
    });

    grid.addEventListener("click", function (e) {
      var cell = e.target.closest ? e.target.closest("[data-emoji]") : null;
      if (!cell) return;
      var emoji = cell.getAttribute("data-emoji");
      if (!emoji) return;
      insertAtCursor(getInput(), emoji);
      // keep panel open for multi-select (Discord does this)
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
    console.log("[sv-emoji-picker] ready");
    return true;
  }

  function boot() {
    injectCss();
    ensureUi();
    setInterval(function () {
      var view = document.getElementById("server-view");
      if (view && !view.hidden) ensureUi();
    }, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
