/**
 * Server View management — create/delete channels & categories, @mentions
 * Does NOT replace native channel buttons (those set activeChannelId for send).
 */
(function () {
  "use strict";
  if (window.__svManageV3) return;
  window.__svManageV3 = true;

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

  /** Re-open server view so native renderChannels + selectChannel stay intact */
  async function refreshNativeChannelList() {
    try {
      await pullChannelsFromDiscord();
    } catch (e) {
      console.warn("[sv-manage] refresh:", e.message || e);
    }
    if (typeof window.openServerView === "function") {
      try {
        window.openServerView();
      } catch (_) {}
    }
    setTimeout(injectManageBar, 100);
  }

  function injectManageBar() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;

    // Ensure native channel buttons still exist — if a previous broken
    // version wiped them into our custom rows only, rebuild via openServerView
    var nativeBtns = list.querySelectorAll("button.sv-ch[data-channel-id]");
    if (!nativeBtns.length && channels().length) {
      // leave list; openServerView should have filled it
    }

    if (document.getElementById("sv-manage-bar")) {
      wireManageButtons();
      wireDeleteButtons();
      return;
    }

    var bar = document.createElement("div");
    bar.id = "sv-manage-bar";
    bar.className = "sv-manage-bar";
    bar.innerHTML =
      '<button type="button" class="sv-manage-btn" id="sv-create-text">+ Channel</button>' +
      '<button type="button" class="sv-manage-btn" id="sv-create-cat">+ Category</button>' +
      '<button type="button" class="sv-manage-btn" id="sv-refresh-ch" title="Refresh">↻</button>';

    list.insertBefore(bar, list.firstChild);
    wireManageButtons();
    wireDeleteButtons();
  }

  function wireManageButtons() {
    var ct = document.getElementById("sv-create-text");
    var cc = document.getElementById("sv-create-cat");
    var rf = document.getElementById("sv-refresh-ch");
    if (ct && !ct.__bound) {
      ct.__bound = 1;
      ct.addEventListener("click", onCreateText);
    }
    if (cc && !cc.__bound) {
      cc.__bound = 1;
      cc.addEventListener("click", onCreateCat);
    }
    if (rf && !rf.__bound) {
      rf.__bound = 1;
      rf.addEventListener("click", function () {
        refreshNativeChannelList().catch(function (e) {
          alert(e.message || "Refresh failed");
        });
      });
    }
  }

  /** Add × delete next to each native channel button without removing listeners */
  function wireDeleteButtons() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;

    list.querySelectorAll("button.sv-ch[data-channel-id]").forEach(function (btn) {
      if (btn.parentElement && btn.parentElement.classList.contains("sv-ch-row")) return;
      if (btn.__svDelWrapped) return;
      btn.__svDelWrapped = 1;

      var id = btn.getAttribute("data-channel-id");
      var labelEl = btn.querySelector(".sv-ch-label");
      var name = labelEl ? labelEl.textContent : id;

      var wrap = document.createElement("div");
      wrap.className = "sv-ch-row";
      btn.parentNode.insertBefore(wrap, btn);
      wrap.appendChild(btn);

      var del = document.createElement("button");
      del.type = "button";
      del.className = "sv-ch-action";
      del.title = "Delete channel";
      del.textContent = "×";
      del.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
        manage({ action: "delete", channelId: id })
          .then(function () {
            return refreshNativeChannelList();
          })
          .catch(function (err) {
            alert(err.message || "Delete failed");
          });
      });
      wrap.appendChild(del);
    });

    // Category headers: add delete on .sv-cat elements
    list.querySelectorAll(".sv-cat").forEach(function (catEl) {
      if (catEl.__svDelWrapped) return;
      catEl.__svDelWrapped = 1;
      var catName = (catEl.textContent || "").trim();
      var match = channels().find(function (c) {
        return (
          Number(c.type) === 4 &&
          String(c.name || "")
            .toUpperCase() === catName.toUpperCase()
        );
      });
      if (!match) return;

      var row = document.createElement("div");
      row.className = "sv-cat-row";
      catEl.parentNode.insertBefore(row, catEl);
      row.appendChild(catEl);

      var del = document.createElement("button");
      del.type = "button";
      del.className = "sv-ch-action";
      del.title = "Delete category";
      del.textContent = "×";
      del.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Delete category "' + catName + '"?')) return;
        manage({ action: "delete", channelId: match.id })
          .then(function () {
            return refreshNativeChannelList();
          })
          .catch(function (err) {
            alert(err.message || "Delete failed");
          });
      });
      row.appendChild(del);
    });
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
        return refreshNativeChannelList();
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
        return refreshNativeChannelList();
      })
      .catch(function (err) {
        alert(err.message || "Create failed");
      });
  }

  /* @mention autocomplete — does not touch send path */
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
        insertMention(input, btn.getAttribute("data-mention-id"));
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

  function patchOpen() {
    if (window.__svManageOpenPatched) return;
    if (typeof window.openServerView !== "function") return;
    window.__svManageOpenPatched = true;
    var orig = window.openServerView;
    window.openServerView = function () {
      orig.apply(this, arguments);
      setTimeout(injectManageBar, 150);
      setTimeout(injectManageBar, 500);
    };
  }

  function boot() {
    injectStyles();
    patchOpen();
    document.addEventListener("keyup", onInputKeyup, true);
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#sv-mention-box") && !e.target.closest("#sv-input"))
        hideMentions();
    });
    setInterval(function () {
      patchOpen();
      injectManageBar();
    }, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[sv-manage] v3 — manage UI only; native send/select preserved");
})();
