/**
 * Ensure every .sv-punish-btn has data-punish-user from the parent .sv-msg
 */
(function () {
  "use strict";

  function fixButtons(root) {
    root = root || document.getElementById("sv-messages");
    if (!root) return;
    root.querySelectorAll(".sv-msg").forEach(function (row) {
      var authorId = row.getAttribute("data-author-id") || "";
      var messageId = row.getAttribute("data-message-id") || "";
      var nameEl = row.querySelector(".sv-author");
      var name = nameEl ? nameEl.textContent.trim() : "user";
      row.querySelectorAll(".sv-punish-btn").forEach(function (btn) {
        var existing = btn.getAttribute("data-punish-user") || "";
        if (!existing && authorId) {
          btn.setAttribute("data-punish-user", authorId);
        }
        if (!btn.getAttribute("data-punish-name") && name) {
          btn.setAttribute("data-punish-name", name);
        }
        if (!btn.getAttribute("data-punish-msg") && messageId) {
          btn.setAttribute("data-punish-msg", messageId);
        }
        // Always mirror onto dataset for consistency
        if (btn.getAttribute("data-punish-user")) {
          btn.dataset.punishUser = btn.getAttribute("data-punish-user");
        }
      });
    });
  }

  var t = null;
  function schedule() {
    clearTimeout(t);
    t = setTimeout(function () {
      fixButtons();
    }, 30);
  }

  function bind() {
    var box = document.getElementById("sv-messages");
    if (!box) return;
    fixButtons(box);
    if (box.dataset.punishAttrObs) return;
    box.dataset.punishAttrObs = "1";
    new MutationObserver(schedule).observe(box, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
  setTimeout(bind, 500);
})();
