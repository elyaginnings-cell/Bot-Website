(async function boot() {
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "login-extra.css";
  document.head.appendChild(css);

  await new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "login-auth.js";
    s.onload = resolve;
    s.onerror = resolve;
    document.head.appendChild(s);
  });

  const parts = ["app-1.js", "app-2.js", "app-3.js", "app-4.js"];
  const code = [];
  for (const name of parts) {
    const res = await fetch(name, { cache: "no-store" });
    if (!res.ok) {
      console.error("Missing", name);
      return;
    }
    code.push(await res.text());
  }
  const run = document.createElement("script");
  run.textContent = code.join("");
  document.body.appendChild(run);
})();
