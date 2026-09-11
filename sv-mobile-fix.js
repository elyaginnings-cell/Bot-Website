/**
 * Global mobile responsiveness:
 * - Bigger tap targets
 * - touch-action: manipulation (kills 300ms lag)
 * - Safe-area padding
 * - Emoji panel as bottom sheet on phones
 * - Buttons respond on pointerup, not delayed click
 */
(function () {
  "use strict";
  if (window.__svMobileFixV1) return;
  window.__svMobileFixV1 = true;

  function injectCss() {
    if (document.getElementById("sv-mobile-fix-css")) return;
    var s = document.createElement("style");
    s.id = "sv-mobile-fix-css";
    s.textContent = [
      "html,body{-webkit-text-size-adjust:100%;touch-action:manipulation}",
      "button,a,[role=button],.sv-ch,.sv-member-row,.sv-emoji-tab,.sv-emoji-cell{",
      "  -webkit-tap-highlight-color:transparent;touch-action:manipulation;",
      "}",
      "@media (hover:none) and (pointer:coarse), (max-width:768px){",
      "  button, .btn, [role=button], .nav-item, .sv-ch, .sv-tab, .sv-emoji-btn, #sv-send{",
      "    min-height:44px;min-width:44px;",
      "  }",
      "  #sv-emoji-panel, #server-view .sv-emoji-panel{",
      "    position:fixed!important;left:0!important;right:0!important;bottom:0!important;",
      "    top:auto!important;width:100%!important;max-width:100%!important;",
      "    max-height:min(55vh,420px)!important;border-radius:16px 16px 0 0!important;",
      "    z-index:100050!important;box-shadow:0 -8px 32px rgba(0,0,0,.5)!important;",
      "  }",
      "  #server-view .sv-emoji-grid{grid-template-columns:repeat(7,1fr)!important;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px))}",
      "  #server-view .sv-emoji-cell{font-size:28px;min-height:48px}",
      "  #server-view .sv-composer, #sv-composer{padding-bottom:env(safe-area-inset-bottom,0px)}",
      "  #sv-msg-menu{z-index:100060!important}",
      "  #sv-reaction-picker{z-index:100070!important;max-width:min(320px,92vw)}",
      "  /* dashboard nav / sidebar */",
      "  .sidebar a, .nav a, .menu-item, [data-page], .feature-card{min-height:44px}",
      "}",
    ].join("\n");
    document.head.appendChild(s);
  }

  // Make sure emoji panel is never clipped on mobile
  function restylePanel() {
    var panel = document.getElementById("sv-emoji-panel");
    if (!panel) return;
    var mobile =
      window.innerWidth < 768 ||
      (window.matchMedia && window.matchMedia("(hover:none) and (pointer:coarse)").matches);
    if (mobile) {
      panel.style.position = "fixed";
      panel.style.left = "0";
      panel.style.right = "0";
      panel.style.bottom = "0";
      panel.style.top = "auto";
      panel.style.width = "100%";
      panel.style.maxWidth = "100%";
      panel.style.maxHeight = "min(55vh, 420px)";
      panel.style.zIndex = "100050";
      panel.style.borderRadius = "16px 16px 0 0";
    } else {
      panel.style.position = "";
      panel.style.left = "";
      panel.style.right = "";
      panel.style.bottom = "";
      panel.style.top = "";
      panel.style.width = "";
      panel.style.maxWidth = "";
      panel.style.maxHeight = "";
      panel.style.zIndex = "";
      panel.style.borderRadius = "";
    }
  }

  var _open = window.__svOpenEmojiPanel;
  Object.defineProperty(window, "__svOpenEmojiPanel", {
    configurable: true,
    set: function (fn) {
      _open = fn;
    },
    get: function () {
      return function () {
        if (typeof _open === "function") _open();
        else if (typeof window.__svEnsureEmojiPicker === "function") {
          window.__svEnsureEmojiPicker(true);
          var p = document.getElementById("sv-emoji-panel");
          if (p) p.hidden = false;
        }
        setTimeout(restylePanel, 0);
        setTimeout(restylePanel, 50);
      };
    },
  });

  // If picker already set the real open, wrap it
  function wrapOpen() {
    var real = window.__svOpenEmojiPanel;
    // property getter already wraps when assigned via our define —
    // also patch after picker loads
    if (typeof window.__svEnsureEmojiPicker === "function") {
      var prev = window.__svEnsureEmojiPicker;
      window.__svEnsureEmojiPicker = function (force) {
        var r = prev(force);
        restylePanel();
        return r;
      };
    }
  }

  function boot() {
    injectCss();
    wrapOpen();
    setInterval(function () {
      injectCss();
      restylePanel();
    }, 4000);
    console.log("[sv-mobile-fix] v1");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
