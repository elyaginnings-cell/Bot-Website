/**
 * Emoji button guard — single open path, no global click capture.
 */
(function () {
  "use strict";
  if (window.__svEmojiForceV4) return;
  window.__svEmojiForceV4 = true;

  function injectCss() {
    if (document.getElementById("sv-emoji-force-css")) return;
    var s = document.createElement("style");
    s.id = "sv-emoji-force-css";
    s.textContent = [
      "#sv-emoji-btn, #server-view .sv-emoji-btn{",
      "  display:inline-flex!important;visibility:visible!important;opacity:1!important;",
      "  flex-shrink:0;width:44px;height:44px;min-width:44px;border:none;border-radius:8px;",
      "  background:#2b2d31;color:#fff;font-size:22px;line-height:1;cursor:pointer;",
      "  align-items:center;justify-content:center;margin:0 4px;z-index:6;",
      "  -webkit-tap-highlight-color:transparent;touch-action:manipulation;",
      "}",
      "#sv-emoji-btn:hover{background:#5865f2}",
      "#sv-emoji-fallback{",
      "  position:fixed;right:12px;bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:99990;",
      "  width:52px;height:52px;border-radius:50%;border:none;",
      "  background:#5865f2;color:#fff;font-size:24px;box-shadow:0 4px 16px rgba(0,0,0,.4);",
      "  display:none;align-items:center;justify-content:center;cursor:pointer;",
      "  -webkit-tap-highlight-color:transparent;touch-action:manipulation;",
      "}",
      "#sv-emoji-fallback.show{display:inline-flex!important}",
    ].join("\n");
    document.head.appendChild(s);
  }

  function findInput() {
    return (
      document.getElementById("sv-input") ||
      document.querySelector(
        "#server-view textarea, #server-view input[type=text], #sv-composer input, #sv-composer textarea"
      )
    );
  }

  function openPicker(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (typeof window.__svOpenEmojiPanel === "function") {
      window.__svOpenEmojiPanel();
      return;
    }
    if (typeof window.__svEnsureEmojiPicker === "function") {
      window.__svEnsureEmojiPicker(true);
    }
    if (typeof window.__svOpenEmojiPanel === "function") {
      window.__svOpenEmojiPanel();
      return;
    }
    if (typeof window.__svToggleEmojiPanel === "function") {
      window.__svToggleEmojiPanel();
      return;
    }
    var panel = document.getElementById("sv-emoji-panel");
    if (panel) panel.hidden = false;
  }

  function bindBtn(btn) {
    if (!btn || btn.dataset.svEmojiForceV4 === "1") return;
    btn.dataset.svEmojiForceV4 = "1";
    btn.addEventListener("click", function (e) {
      openPicker(e);
    });
  }

  function mountComposerBtn() {
    var input = findInput();
    if (!input) return false;

    var existing = document.getElementById("sv-emoji-btn");
    if (existing && existing.isConnected) {
      existing.style.display = "inline-flex";
      existing.style.visibility = "visible";
      bindBtn(existing);
      return true;
    }
    if (existing) existing.remove();

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "sv-emoji-btn";
    btn.className = "sv-emoji-btn";
    btn.title = "Emoji & GIFs";
    btn.setAttribute("aria-label", "Open emoji picker");
    btn.textContent = "\uD83D\uDE00";
    bindBtn(btn);

    var send = document.getElementById("sv-send");
    var composer = document.getElementById("sv-composer") || input.closest("form") || input.parentElement;

    if (send && send.parentElement) send.parentElement.insertBefore(btn, send);
    else if (input.parentElement) input.parentElement.appendChild(btn);
    else if (composer) composer.appendChild(btn);
    else return false;

    if (composer) {
      composer.classList.add("sv-composer-wrap");
      try {
        if (window.getComputedStyle(composer).position === "static") composer.style.position = "relative";
      } catch (err) {}
    }
    return true;
  }

  function mountFallback() {
    var view = document.getElementById("server-view");
    var fb = document.getElementById("sv-emoji-fallback");
    if (!fb) {
      fb = document.createElement("button");
      fb.type = "button";
      fb.id = "sv-emoji-fallback";
      fb.title = "Emoji & GIFs";
      fb.textContent = "\uD83D\uDE00";
      bindBtn(fb);
      document.body.appendChild(fb);
    } else {
      bindBtn(fb);
    }
    if (view && !view.hidden) {
      var main = document.getElementById("sv-emoji-btn");
      if (!main || !main.isConnected) fb.classList.add("show");
      else fb.classList.remove("show");
    } else {
      fb.classList.remove("show");
    }
  }

  function tick() {
    injectCss();
    var view = document.getElementById("server-view");
    if (!view || view.hidden) {
      mountFallback();
      return;
    }
    mountComposerBtn();
    mountFallback();
  }

  function boot() {
    injectCss();
    tick();
    setInterval(tick, 4000);
    console.log("[sv-emoji-force] v4 no-capture");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
