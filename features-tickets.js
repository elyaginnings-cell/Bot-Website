(function () {
  if (window.__featuresTicketsV6Load) return;
  window.__featuresTicketsV6Load = true;
  Promise.all(
    ["/tickets-ui-a.js?v=6", "/tickets-ui-b.js?v=6", "/tickets-ui-c.js?v=7"].map(function (u) {
      return fetch(u).then(function (r) {
        if (!r.ok) throw new Error(u + " " + r.status);
        return r.text();
      });
    })
  )
    .then(function (parts) {
      var s = document.createElement("script");
      s.textContent = parts.join("") + "\nwindow.__ticketSaveNow = window.__ticketSaveNow || null;";
      document.head.appendChild(s);
      var g = document.createElement("script");
      g.src = "/features-tickets-guard.js?v=1";
      document.body.appendChild(g);
      console.log("[features-tickets] v6 loaded");
    })
    .catch(function (e) {
      console.error("[features-tickets]", e);
    });
})();
