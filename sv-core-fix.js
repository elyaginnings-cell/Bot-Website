/**
 * Server View core visual fixes (main dashboard untouched)
 * - Discord-style reply bar
 * - Mention highlight  
 * - Member role groups (backup if members loader already did it)
 */
(function () {
  "use strict";
  if (window.__svCoreFixV1) return;
  window.__svCoreFixV1 = true;

  function injectCss() {
    if (document.getElementById("sv-core-fix-css")) return;
    var s = document.createElement("style");
    s.id = "sv-core-fix-css";
    s.textContent = [
      "#server-view .sv-reply-preview{display:flex!important;align-items:center;gap:6px;margin:0 0 4px;max-width:100%;position:relative;padding-left:0}",
      "#server-view .sv-reply-line{width:2px!important;min-height:16px;align-self:stretch;background:#4e5058!important;border-radius:1px;margin-left:18px;position:relative;flex-shrink:0}",
      "#server-view .sv-reply-line::before{content:'';position:absolute;left:0;top:-6px;width:12px;height:8px;border-left:2px solid #4e5058;border-top:2px solid #4e5058;border-top-left-radius:4px}",
      "#server-view .sv-reply-text{font-size:12px!important;color:#b5bac1!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#server-view .sv-reply-text strong{color:#c4c9ce!important;font-weight:500}",
      "#server-view .sv-reply-ref{display:flex;align-items:center;gap:6px;margin:0 0 4px}",
      "#server-view .sv-reply-ref-bar{width:2px;min-height:16px;align-self:stretch;background:#4e5058;border-radius:1px;margin-left:18px;position:relative}",
      "#server-view .sv-reply-ref-bar::before{content:'';position:absolute;left:0;top:-6px;width:12px;height:8px;border-left:2px solid #4e5058;border-top:2px solid #4e5058;border-top-left-radius:4px}",
      "#server-view .sv-reply-ref-body{font-size:12px;color:#b5bac1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#server-view .sv-reply-ref-body strong{color:#c4c9ce;font-weight:500}",
      "#server-view .sv-msg.mention-me,#server-view .sv-msg:has(.sv-mention-user){background:rgba(240,178,50,.08)!important;box-shadow:inset 2px 0 0 #f0b232}",
      "#server-view .sv-reactions{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}",
      "#server-view .sv-reaction{display:inline-flex;align-items:center;gap:4px;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;padding:2px 6px;font-size:12px;color:#dbdee1}",
      "#server-view .sv-reaction img{width:16px;height:16px}",
      "#server-view #sv-member-list .sv-ml-group{margin:12px 8px 4px;font-size:11px;font-weight:700;letter-spacing:.02em;color:#949ba4;text-transform:uppercase}",
      "@media (max-width:768px){",
      "#server-view .sv-msg{padding:8px 10px!important}",
      "#server-view #sv-input{font-size:16px!important;min-height:44px}",
      "#server-view .sv-channels{width:min(320px,86vw)!important;max-width:86vw}",
      "#server-view .sv-composer{padding:8px!important}",
      "}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function markMentions() {
    var root = document.getElementById("sv-messages");
    if (!root) return;
    root.querySelectorAll("article.sv-msg").forEach(function (el) {
      if (el.querySelector(".sv-mention-user, .sv-mention-role")) {
        el.classList.add("mention-me");
      }
    });
  }

  function boot() {
    injectCss();
    setInterval(markMentions, 1200);
    console.log("[sv-core-fix] online");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
