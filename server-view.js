/**
 * Server View
 * Discord-style server chat interface.
 */
(function () {
  "use strict";
  var activeChannelId = null;
  var pollTimer = null;
  var knownIds = {};
  var lastMessages = [];
  var loading = false;
  var sending = false;
  var bound = false;
  var replyTo = null;
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/\x26/g, "\x26amp;")
      .replace(/\x3c/g, "\x26lt;")
      .replace(/\x3e/g, "\x26gt;")
      .replace(/\x22/g, "\x26quot;");
  }
  function getServer() { return window.selectedServer || null; }
  function getChannels() { var list = window.channelsCache; return Array.isArray(list) ? list : []; }
  function openDrawer() { var view = document.getElementById("server-view"); if (view) view.classList.add("drawer-open"); }
  function closeDrawer() { var view = document.getElementById("server-view"); if (view) view.classList.remove("drawer-open"); }
  function loadPrefs() {
    var theme = localStorage.getItem("svTheme") || "discord";
    var density = localStorage.getItem("svDensity") || "default";
    var fontSize = localStorage.getItem("svFontSize") || "16";
    var themeElement = document.getElementById("sv-theme");
    var densityElement = document.getElementById("sv-density");
    var fontElement = document.getElementById("sv-font-size");
    if (themeElement) themeElement.value = theme;
    if (densityElement) densityElement.value = density;
    if (fontElement) fontElement.value = fontSize;
    applyPrefs();
  }
  function applyPrefs() {
    var view = document.getElementById("server-view");
    if (!view) return;
    var themeElement = document.getElementById("sv-theme");
    var densityElement = document.getElementById("sv-density");
    var fontElement = document.getElementById("sv-font-size");
    var theme = themeElement ? themeElement.value || "discord" : "discord";
    var density = densityElement ? densityElement.value || "default" : "default";
    var fontSize = fontElement ? fontElement.value || "16" : "16";
    var rm = [];
    view.classList.forEach(function (c) {
      if (c.indexOf("theme-") === 0 || c.indexOf("density-") === 0) rm.push(c);
    });
    rm.forEach(function (c) { view.classList.remove(c); });
    if (theme && theme !== "discord") view.classList.add("theme-" + theme);
    if (density === "compact") view.classList.add("density-compact");
    if (density === "cozy") view.classList.add("density-cozy");
    view.style.setProperty("--sv-font-size", fontSize + "px");
    localStorage.setItem("svTheme", theme);
    localStorage.setItem("svDensity", density);
    localStorage.setItem("svFontSize", fontSize);
  }
