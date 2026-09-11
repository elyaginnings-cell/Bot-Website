/**
 * School-filter bypass: rewrite external media URLs through /api/messages?resource=media
 * Refresh chat when YOU send a message (not on a timer).
 */
(function () {
  "use strict";
  if (window.__svMediaProxyV1) return;
  window.__svMediaProxyV1 = true;

  function needsProxy(url) {
    if (!url) return false;
    if (url.indexOf("/api/messages?resource=media") !== -1) return false;
    try {
      var u = new URL(url, location.origin);
      var h = u.hostname;
      return (
        h.indexOf("giphy.com") !== -1 ||
        h.indexOf("tenor.com") !== -1 ||
        h.indexOf("discordapp.com") !== -1 ||
        h.indexOf("discordapp.net") !== -1 ||
        h.indexOf("imgur.com") !== -1
      );
    } catch (e) {
      return false;
    }
  }

  function proxied(url) {
    if (!url || !needsProxy(url)) return url;
    return "/api/messages?resource=media&url=" + encodeURIComponent(url);
  }

  window.__svProxyMedia = proxied;

  function rewriteImg(img) {
    if (!img || !img.src) return;
    if (img.dataset.proxied === "1") return;
    var src = img.currentSrc || img.src;
    if (!needsProxy(src)) return;
    img.dataset.proxied = "1";
    img.src = proxied(src);
  }

  function rewriteAll() {
    document.querySelectorAll(
      "#server-view img.sv-attachment-image, #server-view .sv-gif-cell img, #server-view .sv-embed-image, #sv-emoji-grid img, #sv-lightbox img"
    ).forEach(rewriteImg);
  }

  function observe() {
    var root = document.getElementById("server-view") || document.body;
    if (!root || root.dataset.mediaObs) return;
    root.dataset.mediaObs = "1";
    var obs = new MutationObserver(function () {
      rewriteAll();
    });
    obs.observe(root, { childList: true, subtree: true });
    rewriteAll();
  }

  /** Stop timed message polls — only refresh on send / channel switch */
  function killTimedPoll() {
    if (window.__svKillPollHooked) return;
    window.__svKillPollHooked = true;
    var native = window.setInterval;
    window.setInterval = function (fn, ms) {
      try {
        var src = Function.prototype.toString.call(fn);
        if (src && src.indexOf("loadMessages") !== -1) {
          // effectively disable: run once far in the future if ever
          return native.call(window, function () {}, 2147483647);
        }
      } catch (e) {}
      return native.call(window, fn, ms);
    };
  }

  function forceReloadMessages() {
    // click active channel to force reload path, or call load if exposed
    try {
      var btn = document.querySelector("#sv-channel-list .sv-ch.active");
      if (btn) {
        // soft: dispatch a custom event server-view might ignore — use fetch+reclick
        btn.click();
        return;
      }
    } catch (e) {}
  }

  function hookSendRefresh() {
    if (window.__svSendRefreshHooked) return;
    window.__svSendRefreshHooked = true;
    var orig = window.fetch;
    if (typeof orig !== "function") return;

    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var method = ((init && init.method) || "GET").toUpperCase();
      var isSend =
        method === "POST" &&
        String(url).indexOf("/api/messages") !== -1 &&
        String(url).indexOf("resource=") === -1;

      // detect body action
      var bodyStr = (init && init.body) || "";
      var isContentSend = false;
      if (isSend && bodyStr) {
        try {
          var b = typeof bodyStr === "string" ? JSON.parse(bodyStr) : bodyStr;
          if (b && b.content && !b.action) isContentSend = true;
          if (b && b.action === "react") isContentSend = false;
        } catch (e) {
          isContentSend = true;
        }
      }

      return orig.apply(this, arguments).then(function (res) {
        if (isContentSend && res.ok) {
          setTimeout(function () {
            forceReloadMessages();
          }, 350);
          setTimeout(function () {
            forceReloadMessages();
          }, 1200);
        }
        return res;
      });
    };
  }

  function boot() {
    killTimedPoll();
    hookSendRefresh();
    observe();
    setInterval(rewriteAll, 3000);
    console.log("[sv-media-proxy] school proxy + refresh-on-send");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
