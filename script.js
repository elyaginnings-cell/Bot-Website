(function loadEmailLogin() {
  if (!document.querySelector('link[href="login-extra.css"]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "login-extra.css";
    document.head.appendChild(css);
  }
  if (!document.querySelector('script[src*="login-auth.js"]')) {
    const s = document.createElement("script");
    s.src = "login-auth.js?v=4";
    document.head.appendChild(s);
  }
  if (!document.querySelector('script[src*="theme-boot.js"]')) {
    const t = document.createElement("script");
    t.src = "theme-boot.js";
    document.head.appendChild(t);
  }
})();

// NOTE: full file is large — if this truncates, use push_files instead
