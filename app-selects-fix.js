/**
 * app-selects-fix — fill application dropdowns once when empty (no thrash)
 */
(function () {
  "use strict";
  if (window.__appSelectsFixV3) return;
  window.__appSelectsFixV3 = true;

  function $(id) { return document.getElementById(id); }

  function channels() {
    try {
      if (typeof channelsCache !== "undefined" && channelsCache && channelsCache.length) return channelsCache;
    } catch (_) {}
    try { if (window.syncGlobals) window.syncGlobals(); } catch (_) {}
    return window.channelsCache || window.__channels || [];
  }
  function roles() {
    try {
      if (typeof rolesCache !== "undefined" && rolesCache && rolesCache.length) return rolesCache;
    } catch (_) {}
    return window.rolesCache || window.__roles || [];
  }

  function fillChannel(id) {
    var el = $(id);
    if (!el || el.tagName !== "SELECT") return;
    if (el.options.length > 1) return; // already has options — do not wipe
    var ch = channels();
    if (!ch.length) return;
    var cur = el.value;
    el.innerHTML = '<option value="">Select a channel…</option>';
    var list = ch.filter(function (x) {
      if (!x) return false;
      var t = x.type;
      return t === 0 || t === 5 || t == null || t === "GUILD_TEXT" || t === "GUILD_ANNOUNCEMENT" || String(t) === "0" || String(t) === "5";
    });
    if (!list.length) list = ch;
    list.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x.id;
      o.textContent = "#" + (x.name || x.id);
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }

  function fillRole(id) {
    var el = $(id);
    if (!el || el.tagName !== "SELECT") return;
    if (el.options.length > 1) return;
    var rl = roles();
    if (!rl.length) return;
    var cur = el.value;
    el.innerHTML = '<option value="">Select…</option>';
    rl.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x.id;
      o.textContent = x.name || x.id;
      el.appendChild(o);
    });
    if (cur) el.value = cur;
  }

  function fillAppSelects() {
    fillChannel("app-review-channel");
    fillChannel("app-announce-channel");
    fillRole("app-review-role");
    fillRole("app-pos-role");
  }

  function hook() {
    var orig = window.showSection;
    if (typeof orig === "function" && !orig.__appSelHookV3) {
      window.showSection = function (section) {
        var r = orig.apply(this, arguments);
        if (section === "applications") setTimeout(fillAppSelects, 100);
        return r;
      };
      window.showSection.__appSelHookV3 = true;
    }
  }

  function tryWhenReady(attempts) {
    attempts = attempts || 0;
    fillAppSelects();
    var el = $("app-review-channel");
    if (el && el.options.length > 1) return;
    if (attempts < 15) setTimeout(function () { tryWhenReady(attempts + 1); }, 600);
  }

  function boot() {
    hook();
    tryWhenReady(0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[app-selects-fix] v3 calm");
})();
