/**
 * Unread + mention channel indicators (Discord-style)
 * - Bold channel name when there are new messages since last visit
 * - Red mention badge when you were @mentioned / replied to
 * - Clears when you open the channel
 */
(function () {
  "use strict";
  if (window.__svUnreadV1) return;
  window.__svUnreadV1 = true;

  var STORE_KEY = "sv_channel_read_v1";

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

  function getMyId() {
    var c = [
      window.__svMe && window.__svMe.id,
      window.currentUser && window.currentUser.id,
      window.userCache && window.userCache.id,
      window.__discordUserId,
    ];
    for (var i = 0; i < c.length; i++) if (c[i]) return String(c[i]);
    try {
      var ls = localStorage.getItem("discordUserId") || localStorage.getItem("svUserId");
      if (ls) return String(ls);
    } catch (e) {}
    return "";
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) {}
  }

  function channelKey(gid, cid) {
    return String(gid) + ":" + String(cid);
  }

  function getRead(gid, cid) {
    var store = loadStore();
    return store[channelKey(gid, cid)] || null;
  }

  function setRead(gid, cid, messageId, ts) {
    if (!gid || !cid) return;
    var store = loadStore();
    store[channelKey(gid, cid)] = {
      messageId: messageId ? String(messageId) : null,
      ts: ts || Date.now(),
    };
    saveStore(store);
  }

  // In-memory channel state: { unread: bool, mentions: number, lastId, lastTs }
  var channelState = window.__svChannelState || {};
  window.__svChannelState = channelState;

  function mentionsMe(msg, me) {
    if (!msg || !me) return false;
    var content = String(msg.content || "");
    if (content.indexOf("@everyone") !== -1 || content.indexOf("@here") !== -1) return true;
    if (content.indexOf("<@" + me + ">") !== -1 || content.indexOf("<@!" + me + ">") !== -1) return true;
    var users = (msg.mentions && msg.mentions.users) || {};
    if (users[me]) return true;
    if (Array.isArray(users)) {
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var id = typeof u === "object" ? u && u.id : u;
        if (String(id) === me) return true;
      }
    }
    // reply to me
    if (msg.reference) {
      var refAuthor =
        msg.reference.authorId ||
        msg.reference.author_id ||
        (msg.reference.author && msg.reference.author.id) ||
        "";
      if (String(refAuthor) === me) return true;
    }
    return false;
  }

  function snowflakeToTs(id) {
    try {
      // Discord snowflake → approx ms
      var n = BigInt(String(id));
      return Number((n >> 22n) + 1420070400000n);
    } catch (e) {
      return 0;
    }
  }

  function processMessages(channelId, messages) {
    var gid = guildId();
    if (!gid || !channelId || !Array.isArray(messages) || !messages.length) return;

    var me = getMyId();
    var read = getRead(gid, channelId);
    var newest = messages[messages.length - 1] || messages[0];
    // API may return newest-first or oldest-first — find max id/ts
    var maxId = null;
    var maxTs = 0;
    var mentionCount = 0;

    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (!m || !m.id) continue;
      var id = String(m.id);
      var ts =
        Number(m.createdTimestamp) ||
        (m.createdAt ? Date.parse(m.createdAt) : 0) ||
        snowflakeToTs(id);
      if (!maxId || id > maxId) {
        maxId = id;
        maxTs = ts;
      }
    }

    var isUnread = false;
    if (read && read.messageId) {
      if (maxId && String(maxId) > String(read.messageId)) isUnread = true;
    } else if (read && read.ts) {
      if (maxTs > read.ts) isUnread = true;
    } else {
      // never opened — treat as unread if there is any message
      isUnread = !!maxId;
    }

    // Count mentions only among messages newer than last read
    if (me) {
      for (var j = 0; j < messages.length; j++) {
        var msg = messages[j];
        if (!msg || !msg.id) continue;
        var mid = String(msg.id);
        var newer = true;
        if (read && read.messageId) newer = mid > String(read.messageId);
        else if (read && read.ts) {
          var mts =
            Number(msg.createdTimestamp) ||
            (msg.createdAt ? Date.parse(msg.createdAt) : 0) ||
            snowflakeToTs(mid);
          newer = mts > read.ts;
        }
        if (newer && mentionsMe(msg, me)) mentionCount++;
      }
    }

    // If this is the currently active channel, auto-mark read
    var active =
      window.__svActiveChannelId ||
      (document.querySelector("#sv-channel-list .sv-ch.active") &&
        document.querySelector("#sv-channel-list .sv-ch.active").getAttribute("data-channel-id"));
    if (active && String(active) === String(channelId)) {
      setRead(gid, channelId, maxId, maxTs || Date.now());
      isUnread = false;
      mentionCount = 0;
    }

    channelState[String(channelId)] = {
      unread: isUnread,
      mentions: mentionCount,
      lastId: maxId,
      lastTs: maxTs,
    };
    paintChannels();
  }

  function markChannelRead(channelId) {
    var gid = guildId();
    if (!gid || !channelId) return;
    var st = channelState[String(channelId)];
    var mid = st && st.lastId;
    var ts = (st && st.lastTs) || Date.now();
    // Prefer latest from lastMessages if this is active channel
    var msgs = window.lastMessages || window.__svLastMessages || [];
    if (Array.isArray(msgs) && msgs.length) {
      for (var i = 0; i < msgs.length; i++) {
        if (msgs[i] && msgs[i].id) {
          var id = String(msgs[i].id);
          if (!mid || id > mid) mid = id;
        }
      }
    }
    setRead(gid, channelId, mid, ts);
    channelState[String(channelId)] = {
      unread: false,
      mentions: 0,
      lastId: mid,
      lastTs: ts,
    };
    paintChannels();
  }

  function paintChannels() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    list.querySelectorAll("[data-channel-id]").forEach(function (btn) {
      var cid = btn.getAttribute("data-channel-id");
      var st = channelState[String(cid)] || {};
      var isUnread = !!st.unread;
      var mentions = Number(st.mentions) || 0;

      btn.classList.toggle("unread", isUnread && mentions === 0);
      btn.classList.toggle("has-mention", mentions > 0);

      var label = btn.querySelector(".sv-ch-label");
      if (label) {
        if (mentions > 0 || isUnread) label.style.fontWeight = "600";
        else label.style.fontWeight = "";
        if (mentions > 0) label.style.color = "#fff";
        else if (isUnread) label.style.color = "#f2f3f5";
        else label.style.color = "";
      }

      // badge
      var badge = btn.querySelector(".sv-unread-badge");
      if (mentions > 0) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "sv-unread-badge";
          btn.appendChild(badge);
        }
        badge.textContent = mentions > 99 ? "99+" : String(mentions);
        badge.hidden = false;
      } else if (isUnread) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "sv-unread-badge sv-unread-dot-only";
          btn.appendChild(badge);
        }
        badge.textContent = "";
        badge.className = "sv-unread-badge sv-unread-dot-only";
        badge.hidden = false;
      } else if (badge) {
        badge.hidden = true;
      }
    });
  }

  function injectCss() {
    if (document.getElementById("sv-unread-css")) return;
    var s = document.createElement("style");
    s.id = "sv-unread-css";
    s.textContent = [
      "#server-view .sv-ch{",
      "  display:flex!important;align-items:center;gap:6px;position:relative;",
      "}",
      "#server-view .sv-ch .sv-ch-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      "#server-view .sv-ch.unread .sv-ch-label{color:#f2f3f5!important;font-weight:600!important}",
      "#server-view .sv-ch.has-mention .sv-ch-label{color:#fff!important;font-weight:700!important}",
      "#server-view .sv-unread-badge{",
      "  flex-shrink:0;min-width:16px;height:16px;padding:0 5px;border-radius:8px;",
      "  background:#f23f43;color:#fff;font-size:11px;font-weight:700;",
      "  display:inline-flex;align-items:center;justify-content:center;line-height:1;",
      "  margin-left:auto;",
      "}",
      "#server-view .sv-unread-badge.sv-unread-dot-only{",
      "  min-width:8px;width:8px;height:8px;padding:0;border-radius:50%;",
      "  background:#f2f3f5;",
      "}",
      "#server-view .sv-ch.has-mention .sv-unread-badge{background:#f23f43}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function extractChannelIdFromUrl(url) {
    try {
      var u = new URL(url, location.origin);
      return u.searchParams.get("channelId") || "";
    } catch (e) {
      var m = String(url).match(/channelId=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : "";
    }
  }

  function hookFetch() {
    if (window.__svUnreadFetchHooked) return;
    window.__svUnreadFetchHooked = true;
    var orig = window.fetch;
    if (typeof orig !== "function") return;
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var method = ((init && init.method) || "GET").toUpperCase();
      return orig.apply(this, arguments).then(function (res) {
        try {
          if (method === "GET" && String(url).indexOf("/api/messages") !== -1) {
            var cid = extractChannelIdFromUrl(url);
            res
              .clone()
              .json()
              .then(function (data) {
                var list = Array.isArray(data)
                  ? data
                  : Array.isArray(data.messages)
                    ? data.messages
                    : [];
                if (cid) processMessages(cid, list);
              })
              .catch(function () {});
          }
        } catch (e) {}
        return res;
      });
    };
  }

  function bindChannelClicks() {
    var list = document.getElementById("sv-channel-list");
    if (!list || list.dataset.unreadBound) return;
    list.dataset.unreadBound = "1";
    list.addEventListener(
      "click",
      function (e) {
        var btn = e.target.closest ? e.target.closest("[data-channel-id]") : null;
        if (!btn) return;
        var cid = btn.getAttribute("data-channel-id");
        window.__svActiveChannelId = cid;
        // mark read shortly after open (messages may still be loading)
        setTimeout(function () {
          markChannelRead(cid);
        }, 600);
        setTimeout(function () {
          markChannelRead(cid);
        }, 2000);
      },
      true
    );
  }

  /**
   * Background peek: for a few channels, fetch latest messages to compute unread.
   * Limited to avoid hammering the API.
   */
  var peekQueue = [];
  var peekBusy = false;

  function enqueuePeek(cid) {
    if (!cid) return;
    if (peekQueue.indexOf(cid) !== -1) return;
    if (channelState[String(cid)] && channelState[String(cid)].lastId) return;
    peekQueue.push(String(cid));
    runPeek();
  }

  function runPeek() {
    if (peekBusy) return;
    var cid = peekQueue.shift();
    if (!cid) return;
    var gid = guildId();
    if (!gid) return;
    peekBusy = true;
    fetch(
      "/api/messages?guildId=" +
        encodeURIComponent(gid) +
        "&channelId=" +
        encodeURIComponent(cid) +
        "&limit=15&_=" +
        Date.now(),
      { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } }
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : [];
        processMessages(cid, list);
      })
      .catch(function () {})
      .finally(function () {
        peekBusy = false;
        if (peekQueue.length) setTimeout(runPeek, 400);
      });
  }

  function schedulePeeks() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    var buttons = list.querySelectorAll("[data-channel-id]");
    var max = 8;
    var n = 0;
    buttons.forEach(function (btn) {
      if (n >= max) return;
      var cid = btn.getAttribute("data-channel-id");
      if (!cid) return;
      if (channelState[String(cid)]) return;
      enqueuePeek(cid);
      n++;
    });
  }

  function boot() {
    injectCss();
    hookFetch();
    bindChannelClicks();
    setInterval(function () {
      bindChannelClicks();
      paintChannels();
    }, 1500);
    setInterval(schedulePeeks, 12000);
    setTimeout(schedulePeeks, 3000);
    console.log("[sv-unread] v1 ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
