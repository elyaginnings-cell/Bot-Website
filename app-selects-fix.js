/**
 * app-selects-fix — fills application channel/role dropdowns
 */
(function () {
  "use strict";
  if (window.__appSelectsFix) return;
  window.__appSelectsFix = true;

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
    var ch = channels();
    var cur = el.value;
    el.innerHTML = '<option value="">Select a channel…</option>';
    var list = ch.filter(function (x) {
      if (!x) return false;
      var t = x.type;
      return t === 0 || t === 5 || t == null || t === "GUILD_TEXT" || t === "GUILD_ANNOUNCEMENT" || String(t) === "0" || String(t) === "5";
    });
    if (!list.length && ch.length) list = ch;
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
    var rl = roles();
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
    fillRole("app-pos-role");
  }

  function hook() {
    var orig = window.showSection;
    if (typeof orig === "function" && !orig.__appSelHook) {
      window.showSection = function (section) {
        var r = orig.apply(this, arguments);
        setTimeout(fillAppSelects, 50);
        setTimeout(fillAppSelects, 250);
        return r;
      };
      window.showSection.__appSelHook = true;
    }
  }

  var n = 0;
  function boot() {
    n++;
    hook();
    fillAppSelects();
    if (n < 100) setTimeout(boot, 300);
  }

  setInterval(function () {
    try { if (window.syncGlobals) window.syncGlobals(); } catch (_) {}
    var el = $("app-review-channel");
    var ch = channels();
    if (el && el.options.length <= 1 && ch.length > 0) fillAppSelects();
    else if (el && ch.length > 0 && el.options.length < Math.min(ch.length + 1, 50)) fillAppSelects();
    var roleEl = $("app-pos-role");
    var rl = roles();
    if (roleEl && roleEl.options.length <= 1 && rl.length > 0) fillAppSelects();
  }, 1000);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  console.log("[app-selects-fix] loaded");
})();
