(function loadEmailLogin() {
  if (document.querySelector('script[src="login-auth.js"]')) return;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "login-extra.css";
  document.head.appendChild(css);
  const s = document.createElement("script");
  s.src = "login-auth.js";
  document.head.appendChild(s);
})();

let currentUser = null;
