/**
 * Server View management — create/delete channels & categories, @mentions
 */
(function () {
  "use strict";
  if (window.__svManageV1) return;
  window.__svManageV1 = true;

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

  async function refreshChannels() {
    var gid = guildId();
    if (!gid) return;
    try {
      var res = await fetch(
        "/api/channel-manage?guildId=" + encodeURIComponent(gid) + "&_=" + Date.now(),
        { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } }
      );
      var data = await res.json().catch(function () {
        return {};
      });
      if (res.ok && Array.isArray(data.channels)) {
        window.channelsCache = data.channels;
        try {
          if (typeof window.syncGlobals === "function") window.syncGlobals();
        } catch (_) {}
        // Re-render server-view channel list if available
        var list = document.getElementById("sv-channel-list");
        if (list) {
          // Trigger re-open path: call render via openServerView internals if exposed
          try {
            if (typeof window.openServerView === "function") {
              // Soft refresh: rebuild list manually
              rebuildChannelList();
            }
          } catch (_) {
            rebuildChannelList();
          }
        }
      }
    } catch (e) {
      console.warn("[sv-manage] refresh failed", e);
    }
  }

  function rebuildChannelList() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    var ch = channels();
    var categories = ch.filter(function (c) {
      return c.type === 4;
    });
    var texts = ch.filter(function (c) {
      return c.type === 0 || c.type === 5 || c.type === 2;
    });
    var byParent = {};
    texts.forEach(function (c) {
      var k = c.parentId || "_none";
      if (!byParent[k]) byParent[k] = [];
      byParent[k].push(c);
    });

    var html = "";
    html +=
      '<div class="sv-manage-bar">' +
      '<button type="button" class="sv-manage-btn" id="sv-create-text">+ Channel</button>' +
      '<button type="button" class="sv-manage-btn" id="sv-create-cat">+ Category</button>' +
      "</div>";

    categories.forEach(function (cat) {
      var kids = byParent[cat.id] || [];
      html +=
        '<div class="sv-cat-row">' +
        '<div class="sv-cat">' +
        esc(cat.name || "CATEGORY") +
        "</div>" +
        '<button type="button" class="sv-ch-action" data-del-ch="' +
        esc(cat.id) +
        '" data-del-name="' +
        esc(cat.name || "category") +
        '" title="Delete category">×</button></div>';
      kids.forEach(function (c) {
        html += channelBtn(c);
      });
    });
    (byParent["_none"] || []).forEach(function (c) {
      html += channelBtn(c);
    });

    // Empty categories with no children still show above; also list orphan cats already done

    list.innerHTML = html || '<p class="sv-empty">No channels</p>';

    list.querySelectorAll("[data-channel-id]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        if (e.target && e.target.getAttribute("data-del-ch")) return;
        var id = btn.getAttribute("data-channel-id");
        // Prefer existing selectChannel via clicking mimic
        try {
          var ev = new CustomEvent("sv-select-channel", { detail: { id: id } });
          window.dispatchEvent(ev);
        } catch (_) {}
        // Fallback: set active styles + load messages via refresh button path
        var title = document.getElementById("sv-channel-title");
        var chObj = ch.find(function (x) {
          return String(x.id) === String(id);
        });
        if (title && chObj) title.textContent = chObj.name || "channel";
        list.querySelectorAll("[data-channel-id]").forEach(function (el) {
          el.classList.toggle("active", el.getAttribute("data-channel-id") === id);
        });
        window.__svActiveChannelId = id;
        var input = document.getElementById("sv-input");
        var send = document.getElementById("sv-send");
        if (input) {
          input.disabled = false;
          input.placeholder = "Message #" + (chObj ? chObj.name : "channel");
        }
        if (send) send.disabled = false;
        // Hook into existing poller if server-view exposes load via refresh
        var refresh = document.getElementById("sv-refresh");
        if (refresh) refresh.click();
      });
    });

    list.querySelectorAll("[data-del-ch]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = btn.getAttribute("data-del-ch");
        var name = btn.getAttribute("data-del-name") || "this";
        if (!confirm("Delete #" + name + "? This cannot be undone.")) return;
        manage({ action: "delete", channelId: id })
          .then(function () {
            return refreshChannels();
          })
          .catch(function (err) {
            alert(err.message || "Delete failed");
          });
      });
    });

    var ct = document.getElementById("sv-create-text");
    var cc = document.getElementById("sv-create-cat");
    if (ct) ct.addEventListener("click", onCreateText);
    if (cc) cc.addEventListener("click", onCreateCat);
  }

  function channelBtn(c) {
    var icon = c.type === 2 ? "🔊" : c.type === 5 ? "📢" : "#";
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
      '" title="Delete channel">×</button></div>'
    );
  }

  function onCreateText() {
    var name = prompt("New text channel name:");
    if (!name) return;
    var cats = channels().filter(function (c) {
      return c.type === 4;
    });
    var parentId = null;
    if (cats.length) {
      var pick = prompt(
        "Category ID (optional). Leave blank for none.\n\n" +
          cats
            .map(function (c) {
              return c.name + " → " + c.id;
            })
            .join("\n")
      );
      if (pick && String(pick).trim()) parentId = String(pick).trim();
    }
    manage({ action: "create", kind: "text", name: name, parentId: parentId })
      .then(function () {
        return refreshChannels();
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
        return refreshChannels();
      })
      .catch(function (err) {
        alert(err.message || "Create failed");
      });
  }

  /* —— @mention autocomplete —— */
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
          (m.username && m.username !== name ? " <span>" + esc(m.username) + "</span>" : "") +
          "</button>"
        );
      })
      .join("");

    var rect = input.getBoundingClientRect();
    box.style.left = Math.max(8, rect.left) + "px";
    box.style.bottom = window.innerHeight - rect.top + 6 + "px";
    box.style.width = Math.min(320, rect.width) + "px";
    box.hidden = false;

    box.querySelectorAll("[data-mention-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        insertMention(input, btn.getAttribute("data-mention-id"), btn.getAttribute("data-mention-name"));
        hideMentions();
      });
    });
  }

  function insertMention(input, id, name) {
    var val = input.value || "";
    var pos = input.selectionStart != null ? input.selectionStart : val.length;
    var before = val.slice(0, pos);
    var after = val.slice(pos);
    var at = before.lastIndexOf("@");
    if (at < 0) return;
    // Discord ping token — messages API should pass through; display uses <@id>
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
    // Load members once if empty
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
      ".sv-manage-bar{display:flex;gap:6px;padding:8px;border-bottom:1px solid rgba(255,255,255,.06)}" +
      ".sv-manage-btn{flex:1;background:#2b2d31;color:#dbdee1;border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:6px 8px;font-size:12px;cursor:pointer}" +
      ".sv-manage-btn:hover{background:#35373c}" +
      ".sv-ch-row,.sv-cat-row{display:flex;align-items:center;gap:2px}" +
      ".sv-ch-row .sv-ch{flex:1;min-width:0}" +
      ".sv-ch-action{background:transparent;border:0;color:#a3a6aa;cursor:pointer;padding:4px 8px;font-size:14px;line-height:1;border-radius:4px}" +
      ".sv-ch-action:hover{background:#da373c;color:#fff}" +
      ".sv-mention-box{position:fixed;z-index:99999;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.4);max-height:240px;overflow:auto;padding:4px}" +
      ".sv-mention-item{display:block;width:100%;text-align:left;background:transparent;border:0;color:#dbdee1;padding:8px 10px;cursor:pointer;border-radius:4px;font-size:13px}" +
      ".sv-mention-item:hover{background:#404249}" +
      ".sv-mention-item span{opacity:.55;margin-left:6px;font-size:12px}";
    document.head.appendChild(s);
  }

  function patchChannelList() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    // Only inject manage bar if missing
    if (!document.getElementById("sv-create-text")) {
      rebuildChannelList();
    }
  }

  // When server view opens, refresh channels from Discord + inject UI
  var _open = window.openServerView;
  if (typeof _open === "function") {
    window.openServerView = function () {
      _open.apply(this, arguments);
      setTimeout(function () {
        refreshChannels().then(function () {
          rebuildChannelList();
        });
      }, 200);
    };
  }

  // Intercept composer for @mentions
  document.addEventListener("keyup", onInputKeyup, true);
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#sv-mention-box") && !e.target.closest("#sv-input")) hideMentions();
  });

  // Hook sendMessage path: nothing special needed — <@id> is already valid Discord content

  function boot() {
    injectStyles();
    setInterval(patchChannelList, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[sv-manage] channel create/delete + @mentions ready");
})();
