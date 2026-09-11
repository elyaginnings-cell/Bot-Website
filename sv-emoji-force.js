/**
 * Guarantees the emoji button exists and opens the picker.
 */
(function () {
  "use strict";
  if (window.__svEmojiForceV2) return;
  window.__svEmojiForceV2 = true;

  function injectCss() {
    if (document.getElementById("sv-emoji-force-css")) return;
    var s = document.createElement("style");
    s.id = "sv-emoji-force-css";
    s.textContent = [
      "#sv-emoji-btn, #server-view .sv-emoji-btn{",
      "  display:inline-flex!important;visibility:visible!important;opacity:1!important;",
      "  flex-shrink:0;width:40px;height:40px;min-width:40px;border:none;border-radius:8px;",
      "  background:#2b2d31;color:#fff;font-size:22px;line-height:1;cursor:pointer;",
      "  align-items:center;justify-content:center;margin:0 4px;z-index:5;",
      "}",
      "#sv-emoji-btn:hover, #server-view .sv-emoji-btn:hover{background:#5865f2}",
      "#sv-emoji-fallback{",
      "  position:fixed;right:12px;bottom:72px;z-index:99990;",
      "  width:48px;height:48px;border-radius:50%;border:none;",
      "  background:#5865f2;color:#fff;font-size:24px;box-shadow:0 4px 16px rgba(0,0,0,.4);",
      "  display:none;align-items:center;justify-content:center;cursor:pointer;",
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

  function openPicker() {
    if (typeof window.__svToggleEmojiPanel === "function") {
      window.__svToggleEmojiPanel();
      return;
    }
    if (typeof window.__svEnsureEmojiPicker === "function") {
      window.__svEnsureEmojiPicker(true);
    }
    if (typeof window.__svToggleEmojiPanel === "function") {
      window.__svToggleEmojiPanel();
      return;
    }
    var panel = document.getElementById("sv-emoji-panel");
    var btn = document.getElementById("sv-emoji-btn");
    if (panel) {
      panel.hidden = !panel.hidden;
      if (btn) btn.classList.toggle("active", !panel.hidden);
    }
  }

  function mountComposerBtn() {
    var input = findInput();
    if (!input) return false;

    var existing = document.getElementById("sv-emoji-btn");
    if (existing && existing.isConnected) {
      existing.style.display = "inline-flex";
      existing.style.visibility = "visible";
      if (existing.dataset.svForceBound !== "1") {
        existing.dataset.svForceBound = "1";
        existing.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          openPicker();
        });
      }
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
    btn.dataset.svForceBound = "1";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      openPicker();
    });

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
      } catch (e) {}
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
      fb.addEventListener("click", function (e) {
        e.preventDefault();
        mountComposerBtn();
        openPicker();
      });
      document.body.appendChild(fb);
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
    setInterval(tick, 1500);
    console.log("[sv-emoji-force] v2");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
