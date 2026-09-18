/**
 * Loader: fetch full server-view from known-good commit.
 */
(function () {
  var URLS = [
    "https://cdn.jsdelivr.net/gh/elyaginnings-cell/Bot-Website@01fa7a9af3e82395a3fb447ded908c8695cd9b1b/server-view.js",
    "https://raw.githubusercontent.com/elyaginnings-cell/Bot-Website/01fa7a9af3e82395a3fb447ded908c8695cd9b1b/server-view.js"
  ];
  function tryLoad(i) {
    if (i >= URLS.length) {
      console.error("[server-view] failed to load full script");
      return;
    }
    var s = document.createElement("script");
    s.src = URLS[i] + (URLS[i].indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now();
    s.onload = function () {
      console.log("[server-view] loaded full script from", URLS[i]);
    };
    s.onerror = function () { tryLoad(i + 1); };
    document.head.appendChild(s);
  }
  tryLoad(0);
})();
