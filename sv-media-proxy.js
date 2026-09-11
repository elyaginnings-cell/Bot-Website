/**
 * School-filter bypass + reliable post-send message refresh.
 */
(function () {
  "use strict";
  if (window.__svMediaProxyV3) return;
  window.__svMediaProxyV3 = true;

  function isExternalMedia(url) {
    if (!url) return false;
    if (url.indexOf("data:") === 0 || url.indexOf("blob:") === 0) return false;
    if (url.indexOf("/api/messages?resource=media") !== -1) return false;
    if (url.charAt(0) === "/" && url.indexOf("//") !== 0) return false;
    try {
      var u = new URL(url, location.origin);
      return u.origin !== location.origin;
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

  /** Reliable reload: hit the built-in refresh control (calls loadMessages(true)). */
  function forceReloadMessages() {
    try {
      var refresh = document.getElementById("sv-refresh");
      if (refresh) {
        refresh.click();
        return true;
      }
    } catch (e) {}
    try {
      // fallback: re-click active channel after toggling class
      var btn = document.querySelector("#sv-channel-list .sv-ch.active");
      if (btn) {
        btn.classList.remove("active");
        setTimeout(function () {
          btn.click();
        }, 30);
        return true;
      }
    } catch (e2) {}
    return false;
  }

  window.__svForceReloadMessages = forceReloadMessages;

  function reloadBurst() {
    // Discord/Railway can lag a bit after POST — try several times
    forceReloadMessages();
    setTimeout(forceReloadMessages, 400);
    setTimeout(forceReloadMessages, 1200);
    setTimeout(forceReloadMessages, 2800);
  }

  function killFastPolls() {
    if (window.__svKillPollHooked) return;
    window.__svKillPollHooked = true;
    var native = window.setInterval;
    window.setInterval = function (fn, ms) {
      try {
        var src = Function.prototype.toString.call(fn);
        // stretch the original 5s message poll so it doesn't race loading=true
        if (src && src.indexOf("loadMessages") !== -1 && ms && ms < 15000) {
          ms = 25000;
        }
      } catch (e) {}
      return native.call(window, fn, ms);
    };
  }

  function hookSendRefresh() {
    if (window.__svSendRefreshHooked) return;
    window.__svSendRefreshHooked = true;
    var orig = window.fetch;
    if (typeof orig !== "function") return;

    window.fetch = function (input, init) {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      var method = ((init && init.method) || "GET").toUpperCase();
      var urlStr = String(url);
      var isPost = method === "POST" && urlStr.indexOf("/api/messages") !== -1;
      var isSpecial =
        urlStr.indexOf("resource=media") !== -1 || urlStr.indexOf("resource=gifs") !== -1;
      var bodyStr = (init && init.body) || "";
      var isContentSend = false;

      if (isPost && !isSpecial) {
        if (bodyStr) {
          try {
            var b = typeof bodyStr === "string" ? JSON.parse(bodyStr) : bodyStr;
            // normal chat send has content; punish/react have action
            if (b && b.content && !b.action) isContentSend = true;
            if (b && !b.action && (b.content || b.replyTo)) isContentSend = true;
          } catch (e) {
            // URL may include guildId/channelId for classic sendMessage path
            isContentSend = true;
          }
        } else if (urlStr.indexOf("guildId=") !== -1 && urlStr.indexOf("channelId=") !== -1) {
          isContentSend = true;
        }
      }

      return orig.apply(this, arguments).then(function (res) {
        if (isContentSend && res.ok) {
          reloadBurst();
        }
        return res;
      });
    };

    // Also catch composer submit as a belt-and-suspenders path
    document.addEventListener(
      "submit",
      function (e) {
        var form = e.target;
        if (!form || form.id !== "sv-composer") return;
        // after the page's handler runs, refresh again
        setTimeout(reloadBurst, 600);
      },
      true
    );
  }

  function softBackgroundPoll() {
    if (window.__svSoftPoll) return;
    window.__svSoftPoll = setInterval(function () {
      var view = document.getElementById("server-view");
      if (!view || view.hidden) return;
      if (document.hidden) return;
      forceReloadMessages();
    }, 20000);
  }

  function boot() {
    killFastPolls();
    hookSendRefresh();
    softBackgroundPoll();
    observe();
    setInterval(rewriteAll, 2500);
    console.log("[sv-media-proxy] v3 — proxy + send refresh burst");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
