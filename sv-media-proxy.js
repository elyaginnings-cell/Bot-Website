/**
 * School-filter bypass:
 * Rewrite EVERY external image (PFPs, attachments, GIFs, custom emoji)
 * through /api/messages?resource=media so the laptop only hits our domain.
 * Also: refresh on send, kill timed message poll.
 */
(function () {
  "use strict";
  if (window.__svMediaProxyV2) return;
  window.__svMediaProxyV2 = true;

  function isExternalMedia(url) {
    if (!url) return false;
    if (url.indexOf("data:") === 0) return false;
    if (url.indexOf("blob:") === 0) return false;
    if (url.indexOf("/api/messages?resource=media") !== -1) return false;
    // already same-origin relative without protocol
    if (url.charAt(0) === "/" && url.indexOf("//") !== 0) return false;
    try {
      var u = new URL(url, location.origin);
      if (u.origin === location.origin) return false;
      var h = u.hostname;
      // proxy anything off-site (school blocks discord + giphy + etc)
      return true;
    } catch (e) {
      return false;
    }
  }

  function proxied(url) {
    if (!url || !isExternalMedia(url)) return url;
    return "/api/messages?resource=media&url=" + encodeURIComponent(url);
  }

  window.__svProxyMedia = proxied;

  function rewriteImg(img) {
    if (!img) return;
    // prefer attribute to avoid browser already-failed currentSrc
    var attr = img.getAttribute("src") || "";
    var src = attr || img.src || "";
    if (!src || src.indexOf("/api/messages?resource=media") !== -1) {
      img.dataset.proxied = "1";
      return;
    }
    if (!isExternalMedia(src)) return;
    if (img.dataset.proxied === src) return;
    img.dataset.proxied = src;
    img.setAttribute("src", proxied(src));
  }

  function rewriteAll() {
    var root = document.getElementById("server-view");
    if (!root || root.hidden) return;
    root.querySelectorAll("img").forEach(rewriteImg);
    // lightbox lives on body
    var lb = document.getElementById("sv-lightbox");
    if (lb) lb.querySelectorAll("img").forEach(rewriteImg);
  }

  function observe() {
    if (window.__svMediaObs) return;
    window.__svMediaObs = true;
    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === "attributes" && m.target && m.target.tagName === "IMG") {
          rewriteImg(m.target);
        }
        if (m.addedNodes) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1) return;
            if (n.tagName === "IMG") rewriteImg(n);
            else if (n.querySelectorAll) n.querySelectorAll("img").forEach(rewriteImg);
          });
        }
      }
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
    rewriteAll();
  }

  function killTimedPoll() {
    if (window.__svKillPollHooked) return;
    window.__svKillPollHooked = true;
    var native = window.setInterval;
    window.setInterval = function (fn, ms) {
      try {
        var src = Function.prototype.toString.call(fn);
        if (src && src.indexOf("loadMessages") !== -1) {
          return native.call(window, function () {}, 2147483647);
        }
      } catch (e) {}
      return native.call(window, fn, ms);
    };
  }

  function forceReloadMessages() {
    try {
      var btn = document.querySelector("#sv-channel-list .sv-ch.active");
      if (btn) btn.click();
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
      var isPost = method === "POST" && String(url).indexOf("/api/messages") !== -1;
      var isMedia = String(url).indexOf("resource=media") !== -1;
      var isGifs = String(url).indexOf("resource=gifs") !== -1;
      var bodyStr = (init && init.body) || "";
      var isContentSend = false;
      if (isPost && !isMedia && !isGifs && bodyStr) {
        try {
          var b = typeof bodyStr === "string" ? JSON.parse(bodyStr) : bodyStr;
          if (b && b.content && !b.action) isContentSend = true;
        } catch (e) {
          isContentSend = true;
        }
      }
      return orig.apply(this, arguments).then(function (res) {
        if (isContentSend && res.ok) {
          setTimeout(forceReloadMessages, 400);
          setTimeout(forceReloadMessages, 1400);
        }
        return res;
      });
    };
  }

  function boot() {
    killTimedPoll();
    hookSendRefresh();
    observe();
    setInterval(rewriteAll, 2000);
    console.log("[sv-media-proxy] v2 — proxy all images/PFPs");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
