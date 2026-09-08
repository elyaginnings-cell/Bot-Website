/**
 * Server View management — create/delete channels & categories, @mentions
 * Injects controls without breaking existing channel click → message load.
 */
(function () {
  "use strict";
  if (window.__svManageV2) return;
  window.__svManageV2 = true;

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function guildId() {
    if (window.selectedServer && window.selectedServer.id) return String(window.selectedServer.id);
    if (window.__svGuildId) return String(window.__svGuildId);
    return "";
  }

  function channels() {
    return Array.isArray(window.channelsCache) ? window.channelsCache : [];
  }

  function members() {
    return Array.isArray(window.membersCache) ? window.membersCache : [];
  }

  async function manage(body) {
    var gid = guildId();
    if (!gid) throw new Error("No server selected");
    var res = await fetch("/api/channel-manage?guildId=" + encodeURIComponent(gid), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.assign({ guildId: gid }, body)),
    });
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
    return data;
  }

  async function pullChannelsFromDiscord() {
    var gid = guildId();
    if (!gid) return null;
    var res = await fetch(
      "/api/channel-manage?guildId=" + encodeURIComponent(gid) + "&_=" + Date.now(),
      { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } }
    );
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) throw new Error(data.error || "Failed to refresh channels");
    if (Array.isArray(data.channels)) {
      window.channelsCache = data.channels;
      try {
        if (typeof window.syncGlobals === "function") window.syncGlobals();
      } catch (_) {}
      return data.channels;
    }
    return null;
  }

  /** Re-run server-view's own renderer by toggling open if needed */
  function rererenderViaServerView() {
    try {
      // Force server-view to rebuild from channelsCache
      if (typeof window.openServerView === "function") {
        // openServerView already calls renderChannels internally when invoked
        // We call a lightweight custom event some builds listen for
        window.dispatchEvent(new Event("sv-channels-updated"));
      }
    } catch (_) {}

    // Always inject manage UI after whatever render happened
    setTimeout(injectManageUi, 50);
  }

  async function refreshAndRender() {
    try {
      await pullChannelsFromDiscord();
    } catch (e) {
      console.warn("[sv-manage] channel refresh:", e.message || e);
    }
    // Rebuild channel list using DOM from existing buttons when possible
    rebuildListKeepingHandlers();
  }

  function rebuildListKeepingHandlers() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;

    var ch = channels();
    var categories = ch.filter(function (c) {
      return Number(c.type) === 4;
    });
    var texts = ch.filter(function (c) {
      return Number(c.type) === 0 || Number(c.type) === 5 || Number(c.type) === 2;
    });
    var byParent = {};
    texts.forEach(function (c) {
      var k = c.parentId || "_none";
      if (!byParent[k]) byParent[k] = [];
      byParent[k].push(c);
    });

    var html =
      '<div class="sv-manage-bar">' +
      '<button type="button" class="sv-manage-btn" id="sv-create-text">+ Channel</button>' +
      '<button type="button" class="sv-manage-btn" id="sv-create-cat">+ Category</button>' +
      '<button type="button" class="sv-manage-btn" id="sv-refresh-ch" title="Refresh channel list">↻</button>' +
      "</div>";

    categories.forEach(function (cat) {
      html +=
        '<div class="sv-cat-row">' +
        '<div class="sv-cat">' +
        esc((cat.name || "CATEGORY").toUpperCase()) +
        "</div>" +
        '<button type="button" class="sv-ch-action" data-del-ch="' +
        esc(cat.id) +
        '" data-del-name="' +
        esc(cat.name || "category") +
        '" title="Delete category">×</button></div>';
      (byParent[cat.id] || []).forEach(function (c) {
        html += rowChannel(c);
      });
    });
    (byParent["_none"] || []).forEach(function (c) {
      html += rowChannel(c);
    });

    list.innerHTML = html;

    // Wire channel open → use same path as original server-view
    list.querySelectorAll("button.sv-ch[data-channel-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectChannelNative(btn.getAttribute("data-channel-id"));
      });
    });

    list.querySelectorAll("[data-del-ch]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute("data-del-ch");
        var name = btn.getAttribute("data-del-name") || "this";
        if (!confirm("Delete \"" + name + "\"? This cannot be undone.")) return;
        manage({ action: "delete", channelId: id })
          .then(function () {
            return refreshAndRender();
          })
          .catch(function (err) {
            alert(err.message || "Delete failed");
          });
      });
    });

    var ct = document.getElementById("sv-create-text");
    var cc = document.getElementById("sv-create-cat");
    var rf = document.getElementById("sv-refresh-ch");
    if (ct) ct.onclick = onCreateText;
    if (cc) cc.onclick = onCreateCat;
    if (rf)
      rf.onclick = function () {
        refreshAndRender().catch(function (e) {
          alert(e.message || "Refresh failed");
        });
      };
  }

  function rowChannel(c) {
    var icon = Number(c.type) === 2 ? "🔊" : Number(c.type) === 5 ? "📢" : "#";
    return (
      '<div class="sv-ch-row">' +
      '<button type="button" class="sv-ch" data-channel-id="' +
      esc(c.id) +
      '"><span class="sv-hash">' +
      icon +
      '</span><span class="sv-ch-label">' +
      esc(c.name || "channel") +
      "</span></button>" +
      '<button type="button" class="sv-ch-action" data-del-ch="' +
      esc(c.id) +
      '" data-del-name="' +
      esc(c.name || "channel") +
      '" title="Delete">×</button></div>'
    );
  }

  /**
   * Select a channel in a way that works with server-view.js internals:
   * - set title/placeholder
   * - trigger message load via the refresh control which uses activeChannelId
   * - also monkey-patch active channel onto a global the messages API uses
   */
  function selectChannelNative(channelId) {
    if (!channelId) return;
    window.__svActiveChannelId = channelId;

    var ch = channels().find(function (c) {
      return String(c.id) === String(channelId);
    });
    var title = document.getElementById("sv-channel-title");
    var icon = document.getElementById("sv-channel-icon");
    if (title) title.textContent = ch ? ch.name || "channel" : "channel";
    if (icon) icon.textContent = ch && Number(ch.type) === 5 ? "📢" : "#";

    var list = document.getElementById("sv-channel-list");
    if (list) {
      list.querySelectorAll("[data-channel-id]").forEach(function (el) {
        el.classList.toggle("active", el.getAttribute("data-channel-id") === channelId);
      });
    }

    var input = document.getElementById("sv-input");
    var send = document.getElementById("sv-send");
    if (input) {
      input.disabled = false;
      input.placeholder = "Message #" + (ch ? ch.name || "channel" : "channel");
      input.focus();
    }
    if (send) send.disabled = false;

    // Patch into server-view's private activeChannelId by temporarily
    // rewriting fetch URLs for messages to the selected channel.
    installMessageChannelPatch(channelId);

    // Force message reload
    loadMessagesFor(channelId, true);

    // Close mobile drawer
    var view = document.getElementById("server-view");
    if (view) view.classList.remove("drawer-open");
  }

  function installMessageChannelPatch(channelId) {
    if (window.__svFetchPatched) return;
    window.__svFetchPatched = true;
    var orig = window.fetch;
    window.fetch = function (input, init) {
      try {
        var url = typeof input === "string" ? input : input && input.url;
        if (url && url.indexOf("/api/messages") === 0 && window.__svActiveChannelId) {
          var u = new URL(url, window.location.origin);
          u.searchParams.set("channelId", window.__svActiveChannelId);
          if (typeof input === "string") input = u.pathname + u.search;
          else if (input && input.url) input = new Request(u.toString(), input);
        }
        // Also patch POST body channelId for sends
        if (
          url &&
          url.indexOf("/api/messages") === 0 &&
          init &&
          init.method &&
          String(init.method).toUpperCase() === "POST" &&
          window.__svActiveChannelId &&
          init.body
        ) {
          try {
            var body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
            if (body && typeof body === "object") {
              body.channelId = window.__svActiveChannelId;
              init = Object.assign({}, init, { body: JSON.stringify(body) });
            }
          } catch (_) {}
        }
      } catch (_) {}
      return orig.call(this, input, init);
    };
  }

  async function loadMessagesFor(channelId, force) {
    var server = window.selectedServer;
    var gid = guildId();
    if (!gid || !channelId) return;
    var container = document.getElementById("sv-messages");
    if (container && force) container.innerHTML = '<p class="sv-empty">Loading…</p>';
    try {
      var url =
        "/api/messages?guildId=" +
        encodeURIComponent(gid) +
        "&channelId=" +
        encodeURIComponent(channelId) +
        "&_=" +
        Date.now();
      var res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
      var messages = Array.isArray(data)
        ? data
        : Array.isArray(data.messages)
          ? data.messages
          : [];
      // Prefer native renderer if messages already on screen from server-view
      // Otherwise paint a simple list so chat still works
      if (typeof window.__svRenderMessages === "function") {
        window.__svRenderMessages(messages, true);
      } else {
        paintSimpleMessages(messages);
      }
    } catch (e) {
      if (container)
        container.innerHTML =
          '<p class="sv-empty sv-error">' + esc(e.message || "Failed to load messages") + "</p>";
    }
  }

  function paintSimpleMessages(messages) {
    var container = document.getElementById("sv-messages");
    if (!container) return;
    if (!messages.length) {
      container.innerHTML = '<p class="sv-empty">No messages yet.</p>';
      return;
    }
    var html = "";
    messages.forEach(function (m) {
      var a = m.author || {};
      var name = a.displayName || a.globalName || a.username || "User";
      var content = esc(m.content || "").replace(/\n/g, "<br>");
      // Show mentions as @name when we can
      content = content.replace(/&lt;@!?(\d+)&gt;/g, function (_, id) {
        var mem = members().find(function (x) {
          return String(x.id) === String(id);
        });
        return (
          '<span class="sv-mention sv-mention-user">@' +
          esc(mem ? mem.displayName || mem.username : id) +
          "</span>"
        );
      });
      html +=
        '<article class="sv-msg"><div class="sv-msg-body"><div class="sv-msg-meta"><span class="sv-author">' +
        esc(name) +
        '</span></div><div class="sv-msg-content">' +
        content +
        "</div></div></article>";
    });
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  function onCreateText() {
    var name = prompt("New text channel name:");
    if (!name) return;
    var cats = channels().filter(function (c) {
      return Number(c.type) === 4;
    });
    var parentId = null;
    if (cats.length) {
      var lines = cats
        .map(function (c, i) {
          return i + 1 + ". " + c.name;
        })
        .join("\n");
      var pick = prompt(
        "Put under which category?\nEnter number, or leave blank for none.\n\n" + lines
      );
      if (pick && String(pick).trim()) {
        var idx = parseInt(pick, 10) - 1;
        if (cats[idx]) parentId = cats[idx].id;
      }
    }
    manage({ action: "create", kind: "text", name: name, parentId: parentId })
      .then(function () {
        return refreshAndRender();
      })
      .catch(function (err) {
        alert(err.message || "Create failed");
      });
  }

  function onCreateCat() {
    var name = prompt("New category name:");
    if (!name) return;
    manage({ action: "create", kind: "category", name: name })
      .then(function () {
        return refreshAndRender();
      })
      .catch(function (err) {
        alert(err.message || "Create failed");
      });
  }

  /* @mention autocomplete */
  var mentionBox = null;
  function ensureMentionBox() {
    if (mentionBox) return mentionBox;
    mentionBox = document.createElement("div");
    mentionBox.id = "sv-mention-box";
    mentionBox.className = "sv-mention-box";
    mentionBox.hidden = true;
    document.body.appendChild(mentionBox);
    return mentionBox;
  }
  function hideMentions() {
    var box = ensureMentionBox();
    box.hidden = true;
    box.innerHTML = "";
  }
  function showMentions(input, query) {
    var box = ensureMentionBox();
    var q = String(query || "").toLowerCase();
    var list = members().filter(function (m) {
      if (!m || !m.id || m.bot) return false;
      if (!q) return true;
      return (
        String(m.displayName || "")
          .toLowerCase()
          .indexOf(q) >= 0 ||
        String(m.username || "")
          .toLowerCase()
          .indexOf(q) >= 0
      );
    });
    list = list.slice(0, 8);
    if (!list.length) {
      hideMentions();
      return;
    }
    box.innerHTML = list
      .map(function (m) {
        var name = m.displayName || m.username || m.id;
        return (
          '<button type="button" class="sv-mention-item" data-mention-id="' +
          esc(m.id) +
          '" data-mention-name="' +
          esc(name) +
          '">@' +
          esc(name) +
          (m.username && m.username !== name
            ? " <span>" + esc(m.username) + "</span>"
            : "") +
          "</button>"
        );
      })
      .join("");
    var rect = input.getBoundingClientRect();
    box.style.left = Math.max(8, rect.left) + "px";
    box.style.bottom = window.innerHeight - rect.top + 6 + "px";
    box.style.width = Math.min(320, Math.max(220, rect.width)) + "px";
    box.hidden = false;
    box.querySelectorAll("[data-mention-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        insertMention(
          input,
          btn.getAttribute("data-mention-id"),
          btn.getAttribute("data-mention-name")
        );
        hideMentions();
      });
    });
  }
  function insertMention(input, id) {
    var val = input.value || "";
    var pos = input.selectionStart != null ? input.selectionStart : val.length;
    var before = val.slice(0, pos);
    var after = val.slice(pos);
    var at = before.lastIndexOf("@");
    if (at < 0) return;
    var token = "<@" + id + "> ";
    input.value = before.slice(0, at) + token + after;
    var newPos = at + token.length;
    input.focus();
    try {
      input.setSelectionRange(newPos, newPos);
    } catch (_) {}
  }
  function onInputKeyup(e) {
    var input = e.target;
    if (!input || input.id !== "sv-input") return;
    var val = input.value || "";
    var pos = input.selectionStart != null ? input.selectionStart : val.length;
    var before = val.slice(0, pos);
    var m = before.match(/@([A-Za-z0-9_.]*)$/);
    if (!m) {
      hideMentions();
      return;
    }
    if (!members().length && typeof window.__svLoadMembers === "function") {
      try {
        window.__svLoadMembers("");
      } catch (_) {}
    }
    showMentions(input, m[1] || "");
  }

  function injectStyles() {
    if (document.getElementById("sv-manage-css")) return;
    var s = document.createElement("style");
    s.id = "sv-manage-css";
    s.textContent =
      ".sv-manage-bar{display:flex;gap:6px;padding:8px;border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;background:#2b2d31;z-index:2}" +
      ".sv-manage-btn{flex:1;background:#1e1f22;color:#dbdee1;border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer}" +
      ".sv-manage-btn:hover{background:#35373c}" +
      ".sv-ch-row,.sv-cat-row{display:flex;align-items:center;gap:2px}" +
      ".sv-ch-row .sv-ch{flex:1;min-width:0}" +
      ".sv-ch-action{background:transparent;border:0;color:#a3a6aa;cursor:pointer;padding:4px 8px;font-size:14px;line-height:1;border-radius:4px;flex-shrink:0}" +
      ".sv-ch-action:hover{background:#da373c;color:#fff}" +
      ".sv-mention-box{position:fixed;z-index:99999;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.45);max-height:240px;overflow:auto;padding:4px}" +
      ".sv-mention-item{display:block;width:100%;text-align:left;background:transparent;border:0;color:#dbdee1;padding:8px 10px;cursor:pointer;border-radius:4px;font-size:13px}" +
      ".sv-mention-item:hover{background:#404249}" +
      ".sv-mention-item span{opacity:.55;margin-left:6px;font-size:12px}";
    document.head.appendChild(s);
  }

  function injectManageUi() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    if (!document.getElementById("sv-create-text")) {
      rebuildListKeepingHandlers();
    }
  }

  // Wrap openServerView so we refresh channels when entering server view
  function patchOpen() {
    if (window.__svManageOpenPatched) return;
    if (typeof window.openServerView !== "function") return;
    window.__svManageOpenPatched = true;
    var orig = window.openServerView;
    window.openServerView = function () {
      orig.apply(this, arguments);
      setTimeout(function () {
        refreshAndRender();
      }, 300);
    };
  }

  // Patch composer send to always use __svActiveChannelId when set
  function patchComposer() {
    var form = document.getElementById("sv-composer");
    if (!form || form.__svManageSend) return;
    form.__svManageSend = true;
    form.addEventListener(
      "submit",
      function (e) {
        if (!window.__svActiveChannelId) return; // let native handler run
        // Native handler still runs; fetch patch rewrites channelId
        installMessageChannelPatch(window.__svActiveChannelId);
      },
      true
    );
  }

  function boot() {
    injectStyles();
    patchOpen();
    patchComposer();
    document.addEventListener("keyup", onInputKeyup, true);
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#sv-mention-box") && !e.target.closest("#sv-input"))
        hideMentions();
    });
    setInterval(function () {
      patchOpen();
      patchComposer();
      injectManageUi();
    }, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[sv-manage] v2 ready — create/delete channels + @mentions");
})();
