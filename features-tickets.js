/**
 * Tickets panel loader v12
 * - Patches broken esc() (single-line or multi-line)
 * - Loads a/b/c panel parts
 * - Mobile-safe add-type via click + touchend
 */
(function () {
  if (window.__featuresTicketsV6Load) return;
  window.__featuresTicketsV6Load = true;

  var FIXED_ESC =
    "function esc(s) {" +
    " return String(s == null ? \"\" : s)" +
    ".split(\"&\").join(\"&\" + \"amp;\")" +
    ".split('\"').join(\"&\" + \"quot;\")" +
    ".split(\"<\").join(\"&\" + \"lt;\")" +
    ".split(\">\").join(\"&\" + \"gt;\"); }";

  function patchEsc(code) {
    // Match single-line OR multi-line esc()
    var re = /function\s+esc\s*\(\s*s\s*\)\s*\{[\s\S]*?\}/;
    if (re.test(code)) {
      return code.replace(re, FIXED_ESC);
    }
    // If somehow missing, inject near top of IIFE body
    return code.replace(
      /(window\.__featuresTicketsV6\s*=\s*true;)/,
      "$1\n  " + FIXED_ESC + "\n"
    );
  }

  function bindMobileAddType() {
    if (window.__ticketsMobileAddBound) return;
    window.__ticketsMobileAddBound = true;

    function fire(e) {
      var t = e.target && e.target.closest && e.target.closest("#ticket-add-cat, [data-tickets-add-cat]");
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.__ticketsAddType === "function") {
        window.__ticketsAddType();
        return;
      }
      // Fallback if panel closed over addTicketType differently
      try {
        var btn = document.getElementById("ticket-add-cat");
        if (btn && typeof btn.onclick === "function") btn.onclick(e);
      } catch (_) {}
    }

    document.addEventListener("click", fire, true);
    document.addEventListener("touchend", fire, { capture: true, passive: false });
    document.addEventListener("pointerup", fire, true);

    // Ensure tappable on mobile
    if (!document.getElementById("tickets-mobile-css")) {
      var st = document.createElement("style");
      st.id = "tickets-mobile-css";
      st.textContent =
        "#ticket-add-cat, [data-tickets-add-cat]{" +
        "pointer-events:auto!important;position:relative;z-index:5;" +
        "min-height:48px!important;min-width:44px!important;" +
        "touch-action:manipulation;cursor:pointer;" +
        "-webkit-tap-highlight-color:rgba(255,120,200,.25);}" +
        "#tickets .button{pointer-events:auto!important;}" +
        "#tickets-panel-host, #tickets [data-tickets-panel]{pointer-events:auto!important;}";
      (document.head || document.documentElement).appendChild(st);
    }
  }

  bindMobileAddType();

  var urls = ["/tickets-ui-a.js?v=12", "/tickets-ui-b.js?v=12", "/tickets-ui-c.js?v=12"];

  Promise.all(
    urls.map(function (u) {
      return fetch(u, { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error(u + " " + r.status);
        return r.text();
      });
    })
  )
    .then(function (parts) {
      var code = patchEsc(parts.join("\n"));
      // Expose addTicketType globally after panel defines it
      code +=
        "\ntry{if(typeof addTicketType===\"function\"){window.__ticketsAddType=addTicketType;}}catch(e){}";
      var s = document.createElement("script");
      s.textContent = code;
      document.head.appendChild(s);
      try {
        if (typeof addTicketType === "function") window.__ticketsAddType = addTicketType;
      } catch (e) {}
      // Re-bind after panel HTML appears
      [0, 300, 1000, 2500].forEach(function (ms) {
        setTimeout(function () {
          try {
            if (typeof window.__featuresTicketsV6Boot === "function") {
              window.__featuresTicketsV6Boot(false);
            }
            var btn = document.getElementById("ticket-add-cat");
            if (btn) {
              btn.setAttribute("data-tickets-add-cat", "1");
              btn.style.pointerEvents = "auto";
              btn.style.minHeight = "48px";
            }
          } catch (e) {}
        }, ms);
      });
      console.log("[features-tickets] v12 loaded (mobile add-type)");
    })
    .catch(function (e) {
      console.error("[features-tickets]", e);
    });
})();
