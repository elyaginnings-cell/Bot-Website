/**
 * Server View core visual fixes (main dashboard untouched)
 * v3: replies + ping highlight only when YOU are mentioned/replied to
 */
(function () {
  "use strict";
  if (window.__svCoreFixV3) return;
  window.__svCoreFixV3 = true;

  function injectCss() {
    if (document.getElementById("sv-core-fix-css")) return;
    var s = document.createElement("style");
    s.id = "sv-core-fix-css";
    s.textContent = [
      "#server-view .sv-msg-body > .sv-reply-preview,",
      "#server-view .sv-msg-body > .sv-reply-ref{",
      "  display:flex!important;align-items:center;gap:4px;",
      "  margin:0 0 2px;max-width:100%;position:relative;min-height:16px",
      "}",
      "#server-view .sv-msg:not(.grouped) .sv-reply-preview,",
      "#server-view .sv-msg:not(.grouped) .sv-reply-ref{",
      "  margin-left:-52px;width:calc(100% + 52px)",
      "}",
      "#server-view .sv-reply-line,",
      "#server-view .sv-reply-ref-bar{",
      "  flex:0 0 auto;width:33px!important;height:12px!important;min-height:12px!important;",
      "  align-self:center;margin-left:20px;background:transparent!important;border:none!important;",
      "  border-left:2px solid #4e5058!important;border-top:2px solid #4e5058!important;",
      "  border-top-left-radius:6px;box-sizing:border-box",
      "}",
      "#server-view .sv-reply-line::before,",
      "#server-view .sv-reply-ref-bar::before{display:none!important}",
      "#server-view .sv-reply-text,",
      "#server-view .sv-reply-ref-body{",
      "  flex:1;min-width:0;font-size:12px!important;line-height:1.2;color:#b5bac1!important;",
      "  white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
      "}",
      "#server-view .sv-reply-text strong,",
      "#server-view .sv-reply-ref-body strong{color:#c4c9ce!important;font-weight:500;margin-right:4px}",
      "#server-view .sv-msg.mention-me{",
      "  background:rgba(240,178,50,.08)!important;box-shadow:inset 2px 0 0 #f0b232",
      "}",
      "#server-view #sv-member-list .sv-ml-group{",
      "  margin:14px 8px 4px;font-size:11px;font-weight:700;letter-spacing:.02em;",
      "  color:#949ba4;text-transform:uppercase",
      "}",
      "@media (max-width:768px){",
      "  #server-view .sv-msg:not(.grouped) .sv-reply-preview,",
      "  #server-view .sv-msg:not(.grouped) .sv-reply-ref{margin-left:-44px;width:calc(100% + 44px)}",
      "  #server-view #sv-input{font-size:16px!important;min-height:44px}",
      "}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function getMyId() {
    var candidates = [
      window.__svMe && window.__svMe.id,
      window.currentUser && window.currentUser.id,
      window.user && window.user.id,
      window.userCache && window.userCache.id,
      window.__discordUserId,
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i]) return String(candidates[i]);
    }
    try {
      var ls = localStorage.getItem("discordUserId") || localStorage.getItem("svUserId");
      if (ls) return String(ls);
    } catch (e) {}
    return "";
  }

  function ensureMe() {
    if (getMyId()) return;
    fetch("/api/user", { credentials: "include", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var u = (d && d.user) || d;
        if (u && (u.id || u.discord_id || u.discordId)) {
          window.__svMe = {
            id: String(u.id || u.discord_id || u.discordId),
            username: u.username || u.global_name || "",
          };
          window.currentUser = window.__svMe;
        }
      })
      .catch(function () {});
  }

  function messageMentionsMe(m, me) {
    if (!m || !me) return false;
    var content = String(m.content || "");
    if (content.indexOf("<@" + me + ">") !== -1 || content.indexOf("<@!" + me + ">") !== -1) return true;
    var users = (m.mentions && m.mentions.users) || m.mentions || {};
    if (users && typeof users === "object") {
      if (users[me]) return true;
      if (Array.isArray(users)) {
        for (var i = 0; i < users.length; i++) {
          var u = users[i];
          var id = typeof u === "object" ? u.id : u;
          if (String(id) === me) return true;
        }
      }
    }
    return false;
  }

  function messageRepliesToMe(m, me, byId) {
    if (!m || !me || !m.reference) return false;
    var ref = m.reference;
    var refAuthor = ref.authorId || ref.author_id || (ref.author && ref.author.id) || "";
    if (String(refAuthor) === me) return true;
    var refMsgId = ref.messageId || ref.message_id || "";
    if (refMsgId && byId[String(refMsgId)]) {
      var rm = byId[String(refMsgId)];
      var aid = (rm.author && rm.author.id) || rm.authorId || "";
      if (String(aid) === me) return true;
    }
    return false;
  }

  function markMentions() {
    var root = document.getElementById("sv-messages");
    if (!root) return;
    var me = getMyId();
    if (!me) {
      root.querySelectorAll("article.sv-msg.mention-me").forEach(function (el) {
        el.classList.remove("mention-me");
      });
      return;
    }
    var msgs = window.lastMessages || window.__svLastMessages || [];
    var byId = {};
    for (var i = 0; i < msgs.length; i++) {
      if (msgs[i] && msgs[i].id) byId[String(msgs[i].id)] = msgs[i];
    }
    root.querySelectorAll("article.sv-msg").forEach(function (el) {
      var mid = el.getAttribute("data-message-id");
      var m = byId[String(mid)];
      var hit = false;
      if (m) {
        hit = messageMentionsMe(m, me) || messageRepliesToMe(m, me, byId);
      }
      el.classList.toggle("mention-me", !!hit);
    });
  }

  function enrichReplies() {
    var root = document.getElementById("sv-messages");
    if (!root) return;
    var msgs = window.lastMessages || window.__svLastMessages || [];
    var byId = {};
    for (var i = 0; i < msgs.length; i++) {
      if (msgs[i] && msgs[i].id) byId[String(msgs[i].id)] = msgs[i];
    }
    root.querySelectorAll(".sv-reply-preview, .sv-reply-ref").forEach(function (el) {
      var textEl = el.querySelector(".sv-reply-text, .sv-reply-ref-body");
      if (!textEl) return;
      var full = (textEl.textContent || "").trim();
      if (full.length > 40) return;
      var article = el.closest("article.sv-msg");
      if (!article) return;
      var m = byId[String(article.getAttribute("data-message-id"))];
      if (!m || !m.reference) return;
      var ref = m.reference;
      var content = ref.content || "";
      if (!content && ref.messageId && byId[String(ref.messageId)]) {
        content = (byId[String(ref.messageId)].content || "").slice(0, 100);
      }
      if (!content) return;
      var name = ref.authorName || ref.username || "Reply";
      textEl.innerHTML =
        "<strong>" +
        String(name).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">") +
        "</strong> " +
        String(content).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/\n/g, " ");
    });
  }

  function hookMessages() {
    if (window.__svMsgHook) return;
    window.__svMsgHook = true;
    var orig = window.fetch;
    if (typeof orig !== "function") return;
    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : input && input.url;
      return orig.apply(this, arguments).then(function (res) {
        try {
          if (url && String(url).indexOf("/api/messages") !== -1) {
            res.clone().json().then(function (data) {
              var list = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : [];
              window.lastMessages = list;
              window.__svLastMessages = list;
            }).catch(function () {});
          }
        } catch (e) {}
        return res;
      });
    };
  }

  function boot() {
    injectCss();
    hookMessages();
    ensureMe();
    setInterval(function () {
      markMentions();
      enrichReplies();
    }, 800);
    console.log("[sv-core-fix] v3 online");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
