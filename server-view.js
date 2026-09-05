/**
 * Server View
 * Discord-style server chat interface.
 *
 * Website-only.
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
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getServer() {
    return window.selectedServer || null;
  }

  function getChannels() {
    var list = window.channelsCache;
    return Array.isArray(list) ? list : [];
  }

  function openDrawer() {
    var view = document.getElementById("server-view");
    if (view) view.classList.add("drawer-open");
  }

  function closeDrawer() {
    var view = document.getElementById("server-view");
    if (view) view.classList.remove("drawer-open");
  }

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
    view.classList.remove("theme-darker", "theme-light", "theme-garden", "theme-midnight", "density-compact", "density-cozy");
    if (theme === "darker") view.classList.add("theme-darker");
    else if (theme === "light") view.classList.add("theme-light");
    else if (theme === "garden") view.classList.add("theme-garden");
    else if (theme === "midnight") view.classList.add("theme-midnight");
    if (density === "compact") view.classList.add("density-compact");
    if (density === "cozy") view.classList.add("density-cozy");
    view.style.setProperty("--sv-font-size", fontSize + "px");
    localStorage.setItem("svTheme", theme);
    localStorage.setItem("svDensity", density);
    localStorage.setItem("svFontSize", fontSize);
  }

  function openServerView() {
    var server = getServer();
    if (!server || !server.id) {
      alert("Choose a server first (Choose Server button).");
      return;
    }
    var app = document.getElementById("app");
    var view = document.getElementById("server-view");
    if (!view) {
      alert("Server View HTML is missing.");
      return;
    }
    if (app) app.hidden = true;
    view.hidden = false;
    document.body.classList.add("server-view-open");
    var nameElement = document.getElementById("sv-server-name");
    if (nameElement) nameElement.textContent = server.name || "Server";
    var pill = document.getElementById("sv-server-pill");
    if (pill) pill.textContent = server.name || "Server";
    var nameInput = document.getElementById("sv-display-name");
    if (nameInput && !nameInput.value) nameInput.value = localStorage.getItem("svDisplayName") || "";
    applyPrefs();
    closeDrawer();
    clearReply();
    renderChannels();
    if (activeChannelId) loadMessages(true);
    else if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) openDrawer();
    startPoll();
  }

  function closeServerView() {
    stopPoll();
    closeDrawer();
    clearReply();
    var panel = document.getElementById("sv-settings-panel");
    if (panel) panel.hidden = true;
    var app = document.getElementById("app");
    var view = document.getElementById("server-view");
    if (view) view.hidden = true;
    if (app) app.hidden = false;
    document.body.classList.remove("server-view-open");
  }

  function renderChannels() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    var channels = getChannels();
    var categories = channels.filter(function (c) { return c.type === 4; });
    var texts = channels.filter(function (c) { return c.type === 0 || c.type === 5; });
    if (!texts.length) {
      list.innerHTML = '<p class="sv-empty">No text channels.<br>Pick a server and wait for channels to load.</p>';
      return;
    }
    var byParent = {};
    texts.forEach(function (channel) {
      var key = channel.parentId || "_none";
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(channel);
    });
    var html = "";
    categories.forEach(function (category) {
      var children = byParent[category.id] || [];
      if (!children.length) return;
      html += '<div class="sv-cat">' + esc(category.name || "CATEGORY") + '</div>';
      children.forEach(function (channel) { html += renderChannel(channel); });
    });
    var uncategorized = byParent["_none"] || [];
    uncategorized.forEach(function (channel) { html += renderChannel(channel); });
    list.innerHTML = html;
    list.querySelectorAll("[data-channel-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectChannel(button.getAttribute("data-channel-id"));
      });
    });
    updateChannelSelection();
  }

  function renderChannel(channel) {
    var icon = channel.type === 5 ? "🔊" : "#";
    var active = channel.id === activeChannelId ? " active" : "";
    return '<button type="button" class="sv-ch' + active + '" data-channel-id="' + esc(channel.id) + '"><span class="sv-hash">' + icon + '</span><span class="sv-ch-label">' + esc(channel.name || "channel") + '</span></button>';
  }

  function updateChannelSelection() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    list.querySelectorAll("[data-channel-id]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-channel-id") === activeChannelId);
    });
  }

  function selectChannel(channelId) {
    if (!channelId) return;
    activeChannelId = channelId;
    var channel = getChannels().find(function (item) { return item.id === channelId; });
    var channelName = document.getElementById("sv-channel-title");
    var channelIcon = document.getElementById("sv-channel-icon");
    if (channelName) channelName.textContent = channel ? channel.name || "channel" : "channel";
    if (channelIcon) channelIcon.textContent = channel && channel.type === 5 ? "🔊" : "#";
    updateChannelSelection();
    var input = document.getElementById("sv-input");
    var send = document.getElementById("sv-send");
    if (input) {
      input.disabled = false;
      input.placeholder = "Message #" + (channel ? channel.name || "channel" : "channel");
      input.focus();
    }
    if (send) send.disabled = false;
    closeDrawer();
    knownIds = {};
    lastMessages = [];
    loadMessages(true);
  }

  async function loadMessages(force) {
    if (loading || !activeChannelId) return;
    var server = getServer();
    if (!server || !server.id) return;
    loading = true;
    try {
      var url = "/api/messages?guildId=" + encodeURIComponent(server.id) + "&channelId=" + encodeURIComponent(activeChannelId);
      var response = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) {
        throw new Error("Messages request failed: " + response.status);
      }
      var data = await response.json();
      var messages = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : [];
      renderMessages(messages, !!force);
    } catch (error) {
      console.error("Server View message loading failed:", error);
      if (force) showMessageError("Unable to load messages.");
    } finally {
      loading = false;
    }
  }

  function showMessageError(message) {
    var container = document.getElementById("sv-messages");
    if (!container) return;
    container.innerHTML = '<p class="sv-empty sv-error">' + esc(message) + '</p>';
  }

  function renderMessages(messages, force) {
    var container = document.getElementById("sv-messages");
    if (!container) return;
    if (!messages.length) {
      container.innerHTML = '<p class="sv-empty">No messages in this channel yet.</p>';
      return;
    }
    var shouldScroll = force || isNearBottom(container);
    var html = "";
    messages.forEach(function (message, index) {
      var previous = index > 0 ? messages[index - 1] : null;
      var grouped = previous && previous.author && message.author && previous.author.id && message.author.id && previous.author.id === message.author.id && !message.reference && message.createdTimestamp - previous.createdTimestamp < 7 * 60 * 1000;
      html += renderMessage(message, grouped);
    });
    container.innerHTML = html;
    lastMessages = messages.slice();
    knownIds = {};
    messages.forEach(function (message) {
      if (message && message.id) knownIds[message.id] = true;
    });
    if (shouldScroll) container.scrollTop = container.scrollHeight;
  }

  function renderMessage(message, grouped) {
    var author = message.author || {};
    var authorName = author.displayName || author.globalName || author.username || "Unknown";
    var avatarUrl = typeof author.avatar === "string" ? author.avatar.trim() : "";
    var defaultAvatar = "https://cdn.discordapp.com/embed/avatars/0.png";
    var avatar;
    if (avatarUrl) {
      avatar = '<img class="sv-av" src="' + esc(avatarUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' + defaultAvatar + '\'">';
    } else {
      avatar = '<img class="sv-av" src="' + defaultAvatar + '" alt="" loading="lazy" referrerpolicy="no-referrer">';
    }
    var timestamp = formatTime(message.createdTimestamp || message.createdAt || Date.now());
    var botBadge = author.bot ? '<span class="sv-bot-badge">BOT</span>' : "";
    var content = renderContent(message.content || "");
    var attachments = renderAttachments(message.attachments);
    var embeds = renderEmbeds(message.embeds);
    var reply = renderReply(message);
    return '<article class="sv-msg' + (grouped ? " grouped" : "") + '" data-message-id="' + esc(message.id || "") + '"><div class="sv-av-wrap">' + avatar + '</div><div class="sv-msg-body"><div class="sv-msg-meta"><span class="sv-author">' + esc(authorName) + '</span>' + botBadge + '<time class="sv-time">' + esc(timestamp) + '</time></div>' + reply + '<div class="sv-msg-content">' + content + '</div>' + attachments + embeds + '</div></article>';
  }

  function renderReply(message) {
    if (!message.reference) return "";
    var reference = message.reference;
    var replyName = reference.authorName || reference.username || "Reply";
    var replyContent = reference.content || "";
    return '<div class="sv-reply-preview"><span class="sv-reply-line"></span><span class="sv-reply-text"><strong>' + esc(replyName) + '</strong>' + (replyContent ? " " + esc(truncate(replyContent, 100)) : "") + '</span></div>';
  }

  function renderContent(content) {
    if (!content) return "";
    var escaped = esc(content);
    escaped = escaped.replace(/\n/g, "<br>");
    escaped = escaped.replace(/<@!?(\d+)>/g, '<span class="sv-mention">@user</span>');
    escaped = escaped.replace(/<@&(\d+)>/g, '<span class="sv-mention">@role</span>');
    escaped = escaped.replace(/<#(\d+)>/g, '<span class="sv-mention">#channel</span>');
    escaped = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return escaped;
  }

  function renderAttachments(attachments) {
    if (!Array.isArray(attachments)) return "";
    var html = "";
    attachments.forEach(function (attachment) {
      if (!attachment) return;
      var url = attachment.url || attachment.proxyURL || "";
      if (!url) return;
      var contentType = attachment.contentType || "";
      var isImage = contentType.indexOf("image/") === 0 || /\.(png|jpe?g|gif|webp|avif)$/i.test(url);
      if (isImage) {
        html += '<button class="sv-attachment-image-btn" type="button" data-lightbox="' + esc(url) + '"><img class="sv-attachment-image" src="' + esc(url) + '" alt="' + esc(attachment.name || "Image") + '" loading="lazy"></button>';
      } else {
        html += '<a class="sv-attachment" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">📎 ' + esc(attachment.name || "Attachment") + '</a>';
      }
    });
    return html;
  }

  function renderEmbeds(embeds) {
    if (!Array.isArray(embeds)) return "";
    var html = "";
    embeds.forEach(function (embed) {
      if (!embed) return;
      var title = embed.title || "";
      var description = embed.description || "";
      var url = embed.url || "";
      var image = embed.image && embed.image.url ? embed.image.url : "";
      var thumbnail = embed.thumbnail && embed.thumbnail.url ? embed.thumbnail.url : "";
      if (!title && !description && !image && !thumbnail) return;
      html += '<div class="sv-embed">';
      if (title) {
        if (url) html += '<a class="sv-embed-title" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(title) + '</a>';
        else html += '<div class="sv-embed-title">' + esc(title) + '</div>';
      }
      if (description) html += '<div class="sv-embed-desc">' + esc(description).replace(/\n/g, "<br>") + '</div>';
      if (image) html += '<button class="sv-attachment-image-btn" type="button" data-lightbox="' + esc(image) + '"><img class="sv-embed-image" src="' + esc(image) + '" alt="" loading="lazy"></button>';
      else if (thumbnail) html += '<button class="sv-attachment-image-btn" type="button" data-lightbox="' + esc(thumbnail) + '"><img class="sv-embed-thumb" src="' + esc(thumbnail) + '" alt="" loading="lazy"></button>';
      html += '</div>';
    });
    return html;
  }

  function formatTime(value) {
    try {
      var date = new Date(value);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  }

  function truncate(str, max) {
    str = String(str || "");
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + "…";
  }

  function isNearBottom(el) {
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function startPoll() {
    stopPoll();
    pollTimer = setInterval(function () {
      if (activeChannelId && !loading && !sending) loadMessages(false);
    }, 4000);
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function clearReply() {
    replyTo = null;
    var bar = document.getElementById("sv-reply-bar");
    if (bar) bar.hidden = true;
    var label = document.getElementById("sv-reply-label");
    if (label) label.textContent = "Replying…";
  }

  function setReply(message) {
    if (!message || !message.id) return;
    replyTo = message;
    var bar = document.getElementById("sv-reply-bar");
    var label = document.getElementById("sv-reply-label");
    var author = (message.author && (message.author.displayName || message.author.globalName || message.author.username)) || "message";
    if (label) label.textContent = "Replying to " + author + (message.content ? ": " + truncate(message.content, 60) : "");
    if (bar) bar.hidden = false;
    var input = document.getElementById("sv-input");
    if (input) input.focus();
  }

  async function sendMessage(e) {
    if (e) e.preventDefault();
    if (sending || !activeChannelId) return;
    var input = document.getElementById("sv-input");
    if (!input) return;
    var content = (input.value || "").trim();
    if (!content) return;
    var server = getServer();
    if (!server || !server.id) return;
    sending = true;
    input.disabled = true;
    try {
      var body = { guildId: server.id, channelId: activeChannelId, content: content };
      var nameInput = document.getElementById("sv-display-name");
      if (nameInput && nameInput.value.trim()) body.displayName = nameInput.value.trim().slice(0, 80);
      if (replyTo && replyTo.id) body.replyTo = replyTo.id;
      var response = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        var errData = await response.json().catch(function () { return {}; });
        throw new Error(errData.error || ("Send failed: " + response.status));
      }
      input.value = "";
      clearReply();
      await loadMessages(true);
    } catch (error) {
      console.error("Send failed:", error);
      alert(error.message || "Failed to send message.");
    } finally {
      sending = false;
      if (input) {
        input.disabled = false;
        input.focus();
      }
    }
  }

  function openLightbox(url) {
    var box = document.getElementById("sv-lightbox");
    var img = document.getElementById("sv-lightbox-img");
    if (!box || !img || !url) return;
    img.src = url;
    box.hidden = false;
  }

  function closeLightbox() {
    var box = document.getElementById("sv-lightbox");
    var img = document.getElementById("sv-lightbox-img");
    if (box) box.hidden = true;
    if (img) img.src = "";
  }

  function onMessagesClick(e) {
    var target = e.target;
    if (!target) return;
    var btn = target.closest("[data-lightbox]");
    if (btn) {
      e.preventDefault();
      openLightbox(btn.getAttribute("data-lightbox"));
      return;
    }
    var msg = target.closest("[data-message-id]");
    if (msg && (e.altKey || e.metaKey || target.classList.contains("sv-author"))) {
      var id = msg.getAttribute("data-message-id");
      var found = lastMessages.find(function (m) { return m && m.id === id; });
      if (found) setReply(found);
    }
  }

  function bindOnce() {
    if (bound) return;
    bound = true;
    var back = document.getElementById("sv-back");
    if (back) back.addEventListener("click", closeServerView);
    var closeBtn = document.getElementById("close-server-view");
    if (closeBtn) closeBtn.addEventListener("click", closeServerView);
    var settingsBtn = document.getElementById("sv-settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", function () {
        var panel = document.getElementById("sv-settings-panel");
        if (panel) panel.hidden = !panel.hidden;
      });
    }
    var refresh = document.getElementById("sv-refresh");
    if (refresh) refresh.addEventListener("click", function () { loadMessages(true); });
    var form = document.getElementById("sv-composer");
    if (form) form.addEventListener("submit", sendMessage);
    ["sv-theme", "sv-density", "sv-font-size"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", applyPrefs);
    });
    var lightbox = document.getElementById("sv-lightbox");
    if (lightbox) lightbox.addEventListener("click", closeLightbox);
    var menu = document.getElementById("sv-menu-btn");
    if (menu) menu.addEventListener("click", openDrawer);
    var channelClose = document.getElementById("sv-channels-close");
    if (channelClose) channelClose.addEventListener("click", closeDrawer);
    var backdrop = document.getElementById("sv-drawer-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeDrawer);
    var messages = document.getElementById("sv-messages");
    if (messages) messages.addEventListener("click", onMessagesClick);
    var cancelReply = document.getElementById("sv-reply-cancel");
    if (cancelReply) cancelReply.addEventListener("click", clearReply);
    var nameInput = document.getElementById("sv-display-name");
    if (nameInput) {
      nameInput.value = localStorage.getItem("svDisplayName") || "";
      nameInput.addEventListener("change", function () {
        localStorage.setItem("svDisplayName", nameInput.value.trim().slice(0, 80));
      });
    }
    loadPrefs();
  }

  window.openServerView = openServerView;
  window.closeServerView = closeServerView;

  function boot() {
    bindOnce();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
