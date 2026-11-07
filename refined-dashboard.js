(function () {
  "use strict";
  if (window.__coffeeShopDesignSystem) return;
  window.__coffeeShopDesignSystem = true;

  /* Search is the only navigation enhancement. The sidebar stays visible
     and fixed in place; there is no drawer, collapse, or expandable menu. */
  function setup() {
    var nav = document.querySelector(".navigation");
    if (!nav || nav.querySelector(".ds-nav-search")) return;

    var wrap = document.createElement("div");
    wrap.className = "ds-nav-search";
    wrap.innerHTML = '<input type="search" id="ds-nav-search" aria-label="Search dashboard sections" placeholder="Search sections…">';
    nav.insertBefore(wrap, nav.firstChild);

    var search = wrap.querySelector("input");
    search.addEventListener("input", function () {
      var query = search.value.trim().toLowerCase();
      var shown = 0;
      nav.querySelectorAll(".nav-item").forEach(function (item) {
        var value = (item.textContent || "") + " " +
          (item.getAttribute("title") || "") + " " +
          (item.dataset.tab || "");
        var match = !query || value.toLowerCase().indexOf(query) !== -1;
        item.hidden = !match;
        if (match) shown++;
      });
      var empty = nav.querySelector(".ds-nav-empty");
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "ds-nav-empty";
        empty.textContent = "No matching sections";
        nav.appendChild(empty);
      }
      empty.hidden = !query || shown > 0;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
