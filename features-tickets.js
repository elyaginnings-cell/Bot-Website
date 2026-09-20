/**
 * Tickets panel loader v13 — desktop + mobile
 * Fixes broken esc(), loads panel, and guarantees Add ticket type works on touch.
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
    var re = /function\s+esc\s*\(\s*s\s*\)\s*\{[\s\S]*?\}/;
    if (re.test(code)) return code.replace(re, FIXED_ESC);
    return code;
  }

  function setStatus(msg, ok) {
    var el = document.getElementById("ticket-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = ok === false ? "#f87171" : ok ? "#4ade80" : "";
  }

  /** Works even if the big panel script never evaluated. */
  function fallbackAddType() {
    var list = document.getElementById("ticket-cats-list");
    if (!list) {
      setStatus("Open the Tickets tab fully, then try again.", false);
      return;
    }
    var n = list.querySelectorAll("[data-cat-i]").length + 1;
    var idx = n - 1;
    var card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-cat-i", String(idx));
    card.setAttribute("data-esc-roles", "");
    card.setAttribute("data-esc-users", "");
    card.style.cssText = "margin:0 0 12px;padding:12px;border:1px solid rgba(128,128,128,.28);border-radius:12px";
    card.innerHTML =
      '<div class="config-grid">' +
      '<div class="input-group"><label>Emoji</label><input data-cat-emoji type="text" maxlength="16" value="🎫"></div>' +
      '<div class="input-group"><label>Name</label><input data-cat-label type="text" maxlength="80" value="New type ' + n + '"></div>' +
      '<div class="input-group"><label>ID ({category})</label><input data-cat-id type="text" maxlength="40" value="type' + n + '"></div>' +
      '<div class="input-group" style="grid-column:1/-1"><label>Description</label><input data-cat-desc type="text" maxlength="100" value=""></div>' +
      '<label class="toggle"><input data-cat-ai type="checkbox" checked> <span>AI can handle this type</span></label>' +
      '<div class="input-group" style="grid-column:1/-1"><label>AI notes</label><textarea data-cat-ai-notes rows="2" maxlength="800"></textarea></div>' +
      '<div data-q-wrap style="grid-column:1/-1"><p class="form-hint">No questions yet.</p></div>' +
      '<button type="button" class="button" data-add-q>Add question</button>' +
      '<button type="button" class="button" data-rm-cat style="margin-left:8px">Remove type</button>' +
      "</div>";
    list.appendChild(card);
    card.querySelector("[data-rm-cat]").addEventListener("click", function () {
      card.remove();
      setStatus("Removed type. Remember to Save.", true);
    });
    try { card.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (_) {}
    setStatus("Added ticket type (" + n + " total). Remember to Save.", true);
  }

  function doAddType(e) {
    if (e) {
      try { e.preventDefault(); } catch (_) {}
      try { e.stopPropagation(); } catch (_) {}
    }
    if (typeof window.__ticketsAddType === "function") {
      try {
        window.__ticketsAddType();
        return;
      } catch (err) {
        console.warn("[tickets] __ticketsAddType failed, using fallback", err);
      }
    }
    fallbackAddType();
  }

  window.__ticketsAddType = window.__ticketsAddType || fallbackAddType;

  function isAddBtn(el) {
    if (!el || !el.closest) return null;
    return el.closest("#ticket-add-cat, [data-tickets-add-cat]");
  }

  function onPointer(e) {
    if (!isAddBtn(e.target)) return;
    doAddType(e);
  }

  document.addEventListener("click", onPointer, true);
  document.addEventListener("touchend", onPointer, { capture: true, passive: false });
  document.addEventListener("pointerup", onPointer, true);

  // Mobile tappable styles
  if (!document.getElementById("tickets-mobile-css")) {
    var st = document.createElement("style");
    st.id = "tickets-mobile-css";
    st.textContent =
      "#ticket-add-cat,[data-tickets-add-cat]{" +
      "pointer-events:auto!important;position:relative;z-index:20;" +
      "min-height:48px!important;touch-action:manipulation;cursor:pointer;" +
      "-webkit-tap-highlight-color:rgba(255,120,200,.3);display:inline-flex!important;" +
      "align-items:center;justify-content:center;}" +
      "#tickets .button,#tickets button{pointer-events:auto!important;}" +
      "#tickets-panel-host,#tickets [data-tickets-panel]{pointer-events:auto!important;}";
    (document.head || document.documentElement).appendChild(st);
  }

  var urls = ["/tickets-ui-a.js?v=13", "/tickets-ui-b.js?v=13", "/tickets-ui-c.js?v=13"];

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
      code +=
        "\ntry{if(typeof addTicketType===\"function\"){window.__ticketsAddType=addTicketType;}}catch(e){}";
      var s = document.createElement("script");
      s.textContent = code;
      document.head.appendChild(s);
      try {
        if (typeof addTicketType === "function") window.__ticketsAddType = addTicketType;
      } catch (e) {}
      [0, 200, 800, 2000].forEach(function (ms) {
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
              // Direct mobile handlers on the live button
              btn.ontouchend = function (ev) { doAddType(ev); };
              btn.onclick = function (ev) { doAddType(ev); };
            }
          } catch (e) {}
        }, ms);
      });
      console.log("[features-tickets] v13 loaded (mobile-safe add type)");
    })
    .catch(function (e) {
      console.error("[features-tickets]", e);
      // Even if panel fails, keep fallback working
      window.__ticketsAddType = fallbackAddType;
    });
})();
