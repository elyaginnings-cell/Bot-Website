/**
 * click-rescue v1 — unstick overlays so login / dashboard buttons work
 */
(function () {
  "use strict";
  if (window.__clickRescueV1) return;
  window.__clickRescueV1 = true;

  function injectCss() {
    if (document.getElementById("click-rescue-css")) return;
    var style = document.createElement("style");
    style.id = "click-rescue-css";
    style.textContent = [
      "[hidden]{display:none!important;pointer-events:none!important;}",
      "#app[hidden],#login-screen[hidden],#server-view[hidden],#server-list[hidden]{",
      "  display:none!important;pointer-events:none!important;visibility:hidden!important;",
      "}",
      "body:not(.nav-drawer-open) #nav-drawer-backdrop{",
      "  pointer-events:none!important;opacity:0!important;visibility:hidden!important;",
      "}",
      "#login-screen:not([hidden]){position:relative;z-index:20;pointer-events:auto;}",
      "#login-screen:not([hidden]) .login-card,",
      "#login-screen:not([hidden]) .login-card button,",
      "#login-screen:not([hidden]) .login-card input{",
      "  pointer-events:auto!important;position:relative;z-index:21;",
      "}"
    ].join("");
    (document.head || document.documentElement).appendChild(style);
  }

  function loginVisible() {
    var el = document.getElementById("login-screen");
    return !!(el && !el.hidden);
  }

  function rescue() {
    injectCss();
    var app = document.getElementById("app");
    var login = document.getElementById("login-screen");
    if (login && !login.hidden && app && app.getAttribute("hidden") !== null) {
      app.setAttribute("hidden", "");
    }
    if (loginVisible()) {
      document.body.classList.remove("nav-drawer-open");
    }
    var backdrop = document.getElementById("nav-drawer-backdrop");
    if (backdrop && !document.body.classList.contains("nav-drawer-open")) {
      backdrop.style.pointerEvents = "none";
    }
  }

  function bindLoginFallback() {
    var loginBtn = document.getElementById("password-login-button");
    if (loginBtn && loginBtn.dataset.rescue !== "1") {
      loginBtn.dataset.rescue = "1";
      loginBtn.addEventListener("click", function () {
        var email = (document.getElementById("login-email") || {}).value || "";
        var password = (document.getElementById("login-password") || {}).value || "";
        if (!String(email).trim() || !password) {
          var err = document.getElementById("login-error");
          if (err) {
            err.hidden = false;
            err.textContent = "Enter an email and password.";
          }
        }
      });
    }
  }

  function boot() {
    rescue();
    bindLoginFallback();
  }

  [0, 400, 1200, 3000].forEach(function (ms) {
    setTimeout(boot, ms);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
