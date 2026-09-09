/**
 * Discord-exact Server View polish loader
 * Server View ONLY — does not change main dashboard UI.
 */
(function () {
  "use strict";
  if (window.__svDiscordExactV2) return;
  var n = 5;
  var parts = [];
  var done = 0;
  function tryRun() {
    if (done < n) return;
    try {
      var b64 = parts.join("");
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var code = (typeof TextDecoder !== "undefined")
        ? new TextDecoder("utf-8").decode(bytes)
        : bin;
      (0, eval)(code);
    } catch (e) {
      console.error("[sv-discord-exact] load failed", e);
    }
  }
  for (var i = 0; i < n; i++) {
    (function (idx) {
      fetch("/sv-exact-chunk-" + idx + ".b64?v=2", { cache: "no-store" })
        .then(function (r) { return r.text(); })
        .then(function (t) { parts[idx] = t.trim(); done++; tryRun(); })
        .catch(function (e) { console.error(e); done++; tryRun(); });
    })(i);
  }
})();
