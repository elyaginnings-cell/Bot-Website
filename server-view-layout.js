/**
 * Server View layout / interaction fixes
 * Loaded after server-view.js
 */
(function () {
  "use strict";

  function view() {
    return document.getElementById("server-view");
  }

  function openDrawer() {
    var v = view();
    if (v) v.classList.add("drawer-open");
  }

  function closeDrawer() {
    var v = view();
    if (v) v.classList.remove("drawer-open");
  }

  function toggleDrawer() {
    var v = view();
    if (!v) return;
    if (v.classList.contains("drawer-open")) closeDrawer();
    else openDrawer();
  }

  function enableComposer(channelName) {
    var input = document.getElementById("sv-input");
    var send = document.getElementById("sv-send");
    if (input) {
      input.disabled = false;
      input.removeAttribute("disabled");
      input.readOnly = false;
      if (channelName) input.placeholder = "Message #" + channelName;
    }
    if (send) {
      send.disabled = false;
      send.removeAttribute("disabled");
    }
    setTimeout(function () {
      if (input) {
        try {
          input.focus({ preventScroll: false });
        } catch (_) {
          input.focus();
        }
      }
    }, 60);
  }

  function onChannelClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-channel-id]") : null;
    if (!btn) return;
    var id = btn.getAttribute("data-channel-id");
    if (!id) return;
    // Let original selectChannel run first, then force UI state
    setTimeout(function () {
      closeDrawer();
      var label = btn.querySelector(".sv-ch-label");
      enableComposer(label ? label.textContent.trim() : "channel");
    }, 0);
  }

  function bind() {
    var menu = document.getElementById("sv-menu-btn");
    if (menu && !menu.dataset.layoutBound) {
      menu.dataset.layoutBound = "1";
      menu.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          toggleDrawer();
        },
        true
      );
    }

    var list = document.getElementById("sv-channel-list");
    if (list && !list.dataset.layoutBound) {
      list.dataset.layoutBound = "1";
      list.addEventListener("click", onChannelClick);
    }

    var channelClose = document.getElementById("sv-channels-close");
    if (channelClose && !channelClose.dataset.layoutBound) {
      channelClose.dataset.layoutBound = "1";
      channelClose.addEventListener("click", closeDrawer);
    }

    var backdrop = document.getElementById("sv-drawer-backdrop");
    if (backdrop && !backdrop.dataset.layoutBound) {
      backdrop.dataset.layoutBound = "1";
      backdrop.addEventListener("click", closeDrawer);
    }

    // When opening server view, show channels so user can scroll/pick
    var openBtn = document.getElementById("open-server-view");
    var navBtn = document.getElementById("nav-server-view");
    function afterOpen() {
      setTimeout(function () {
        openDrawer();
        // Re-bind list in case it was re-rendered
        var list2 = document.getElementById("sv-channel-list");
        if (list2 && !list2.dataset.layoutBound) {
          list2.dataset.layoutBound = "1";
          list2.addEventListener("click", onChannelClick);
        }
      }, 50);
    }
    if (openBtn && !openBtn.dataset.layoutBound) {
      openBtn.dataset.layoutBound = "1";
      openBtn.addEventListener("click", afterOpen);
    }
    if (navBtn && !navBtn.dataset.layoutBound) {
      navBtn.dataset.layoutBound = "1";
      navBtn.addEventListener("click", afterOpen);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  // Re-bind after channel list re-renders
  var observer = new MutationObserver(function () {
    var list = document.getElementById("sv-channel-list");
    if (list && !list.dataset.layoutBound) {
      list.dataset.layoutBound = "1";
      list.addEventListener("click", onChannelClick);
    }
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
