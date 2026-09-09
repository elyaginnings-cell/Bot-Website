/**
 * Server View core visual fixes (main dashboard untouched)
 */
(function () {
  "use strict";
  if (window.__svCoreFixV2) return;
  window.__svCoreFixV2 = true;

  function injectCss() {
    if (document.getElementById("sv-core-fix-css")) return;
    var s = document.createElement("style");
    s.id = "sv-core-fix-css";
    s.textContent = [
      "#server-view .sv-msg-body > .sv-reply-preview,",
      "#server-view .sv-msg-body > .sv-reply-ref{",
      "  display:flex!important;align-items:center;gap:4px;",
      "  margin:0 0 2px;max-width:100%;position:relative;",
      "  padding-left:0;min-height:16px;",
      "}",
      "#server-view .sv-msg:not(.grouped) .sv-reply-preview,",
      "#server-view .sv-msg:not(.grouped) .sv-reply-ref{",
      "  margin-left:-52px;padding-left:0;width:calc(100% + 52px);",
      "}",
      "#server-view .sv-reply-line,",
      "#server-view .sv-reply-ref-bar{",
      "  flex:0 0 auto;width:33px!important;height:12px!important;",
      "  min-height:12px!important;align-self:center;",
      "  margin-left:20px;margin-right:0;background:transparent!important;",
      "  border:none!important;border-left:2px solid #4e5058!important;",
      "  border-top:2px solid #4e5058!important;border-top-left-radius:6px;",
      "  position:relative;box-sizing:border-box;",
      "}",
      "#server-view .sv-reply-line::before,",
      "#server-view .sv-reply-ref-bar::before{display:none!important}",
      "#server-view .sv-reply-text,",
      "#server-view .sv-reply-ref-body{",
      "  flex:1;min-width:0;font-size:12px!important;line-height:1.2;",
      "  color:#b5bac1!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;",
      "}",
      "#server-view .sv-reply-text strong,",
      "#server-view .sv-reply-ref-body strong{color:#c4c9ce!important;font-weight:500;margin-right:4px}",
      "#server-view .sv-reply-ref-text{color:#b5bac1}",
      "#server-view .sv-msg.mention-me,",
      "#server-view .sv-msg:has(.sv-mention-user){",
      "  background:rgba(240,178,50,.08)!important;box-shadow:inset 2px 0 0 #f0b232",
      "}",
      "#server-view #sv-member-list .sv-ml-group{",
      "  margin:14px 8px 4px;font-size:11px;font-weight:700;",
      "  letter-spacing:.02em;color:#949ba4;text-transform:uppercase",
      "}",
      "#server-view #sv-member-list .sv-ml-group:first-child{margin-top:6px}",
      "@media (max-width:768px){",
      "  #server-view .sv-msg:not(.grouped) .sv-reply-preview,",
      "  #server-view .sv-msg:not(.grouped) .sv-reply-ref{margin-left:-44px;width:calc(100% + 44px)}",
      "  #server-view #sv-input{font-size:16px!important;min-height:44px}",
      "  #server-view .sv-channels{width:min(320px,86vw)!important}",
      "}"
    ].join("\n");
    document.head.appendChild(s);
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
      var mid = article.getAttribute("data-message-id");
      var m = byId[String(mid)];
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
        String(name)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;") +
        "</strong> " +
        String(content)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, " ");
    });
  }

  function markMentions() {
    var root = document.getElementById("sv-messages");
    if (!root) return;
    root.querySelectorAll("article.sv-msg").forEach(function (el) {
      if (el.querySelector(".sv-mention-user, .sv-mention-role")) el.classList.add("mention-me");
    });
  }

  function boot() {
    injectCss();
    setInterval(function () {
      markMentions();
      enrichReplies();
    }, 1000);
    console.log("[sv-core-fix] v2 online");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
