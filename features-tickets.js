/**
 * Tickets v6 loader — fetch panel parts, fix broken esc(), boot
 */
(function () {
  if (window.__featuresTicketsV6Load) return;
  window.__featuresTicketsV6Load = true;

  var FIXED_ESC =
    "function esc(s) {\n" +
    "    return String(s == null ? \"\" : s)\n" +
    "      .split(\"&\").join(\"&\" + \"amp;\")\n" +
    "      .split('\"').join(\"&\" + \"quot;\")\n" +
    "      .split(\"<\").join(\"&\" + \"lt;\")\n" +
    "      .split(\">\").join(\"&\" + \"gt;\");\n" +
    "  }";

  var urls = ["/tickets-ui-a.js?v=10", "/tickets-ui-b.js?v=10", "/tickets-ui-c.js?v=10"];

  Promise.all(
    urls.map(function (u) {
      return fetch(u).then(function (r) {
        if (!r.ok) throw new Error(u + " " + r.status);
        return r.text();
      });
    })
  )
    .then(function (parts) {
      var code = parts.join("\n");
      code = code.replace(/function esc\(s\)\s*\{[\s\S]*?\n\s*\}/, FIXED_ESC);
      if (code.indexOf('"""') >= 0) {
        code = code.replace(/function esc\(s\)\s*\{[\s\S]*?\n\s*\}/, FIXED_ESC);
      }
      var s = document.createElement("script");
      s.textContent = code;
      document.head.appendChild(s);
      try {
        var g = document.createElement("script");
        g.src = "/features-tickets-guard.js?v=2";
        document.body.appendChild(g);
      } catch (e) {}
      console.log("[features-tickets] v10 panel loaded (esc patched)");
    })
    .catch(function (e) {
      console.error("[features-tickets]", e);
    });
})();
