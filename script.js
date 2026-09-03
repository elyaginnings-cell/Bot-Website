(function bootLogin() {
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "login-extra.css";
  document.head.appendChild(css);

  const s = document.createElement("script");
  s.src = "login-auth.js?v=2";
  document.head.appendChild(s);
})();
