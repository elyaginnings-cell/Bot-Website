/**
 * Tickets v6 loader — loads panel parts then boots
 */
(function () {
  if (window.__featuresTicketsV6Load) return;
  window.__featuresTicketsV6Load = true;
  var urls = ["/tickets-ui-a.js?v=8", "/tickets-ui-b.js?v=8", "/tickets-ui-c.js?v=8"];
  Promise.all(
    urls.map(function (u) {
      return fetch(u).then(function (r) {
        if (!r.ok) throw new Error(u + " " + r.status);
        return r.text();
      });
    })
  )
    .then(function (parts) {
      var s = document.createElement("script");
      s.textContent = parts.join("\n");
      document.head.appendChild(s);
      var g = document.createElement("script");
      g.src = "/features-tickets-guard.js?v=2";
      document.body.appendChild(g);
      console.log("[features-tickets] v6 loaded (fixed)");
    })
    .catch(function (e) {
      console.error("[features-tickets]", e);
    });
})();
