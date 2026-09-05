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
    if (!server || !server.id) { alert("Choose a server first (Choose Server button)."); return; }
    var app = document.getElementById("app");
    var view = document.getElementById("server-view");
    if (!view) { alert("Server View HTML is missing."); return; }
    if (app) app.hidden = true;
    view.hidden = false;
    document.body.classList.add("server-view-open");
    var nameElement = document.getElementById("sv-server-name");
    if (nameElement) nameElement.textContent = server.name || "Server";
    var pill = document.getElementById("sv-server-pill");
    if (pill) pill.textContent = server.name || "Server";
    var nameInput = document.getElementById("sv-display-name");
    if (nameInput && !nameInput.value) nameInput.value = localStorage.getItem("svDisplayName") || "";
    applyPrefs(); closeDrawer(); clearReply(); renderChannels();
    if (activeChannelId) loadMessages(true);
    else if (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) openDrawer();
    startPoll();
  }
  function closeServerView() {
    stopPoll(); closeDrawer(); clearReply();
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
    if (!texts.length) { list.innerHTML = '<p class="sv-empty">No text channels.<br>Pick a server and wait for channels to load.</p>'; return; }
    var byParent = {};
    texts.forEach(function (channel) { var key = channel.parentId || "_none"; if (!byParent[key]) byParent[key] = []; byParent[key].push(channel); });
    var html = "";
    categories.forEach(function (category) { var children = byParent[category.id] || []; if (!children.length) return; html += '<div class="sv-cat">' + esc(category.name || "CATEGORY") + '</div>'; children.forEach(function (channel) { html += renderChannel(channel); }); });
    (byParent["_none"] || []).forEach(function (channel) { html += renderChannel(channel); });
    list.innerHTML = html;
    list.querySelectorAll("[data-channel-id]").forEach(function (button) { button.addEventListener("click", function () { selectChannel(button.getAttribute("data-channel-id")); }); });
    updateChannelSelection();
  }
  function renderChannel(channel) {
    var icon = channel.type === 5 ? "\uD83D\uDD0A" : "#";
    var active = channel.id === activeChannelId ? " active" : "";
    return '<button type="button" class="sv-ch' + active + '" data-channel-id="' + esc(channel.id) + '"><span class="sv-hash">' + icon + '</span><span class="sv-ch-label">' + esc(channel.name || "channel") + '</span></button>';
  }
  function updateChannelSelection() {
    var list = document.getElementById("sv-channel-list");
    if (!list) return;
    list.querySelectorAll("[data-channel-id]").forEach(function (el) { el.classList.toggle("active", el.getAttribute("data-channel-id") === activeChannelId); });
  }
  function selectChannel(channelId) {
    if (!channelId) return;
    activeChannelId = channelId;
    var channel = getChannels().find(function (item) { return item.id === channelId; });
    var channelName = document.getElementById("sv-channel-title");
    var channelIcon = document.getElementById("sv-channel-icon");
    if (channelName) channelName.textContent = channel ? channel.name || "channel" : "channel";
    if (channelIcon) channelIcon.textContent = channel && channel.type === 5 ? "\uD83D\uDD0A" : "#";
    updateChannelSelection();
    var input = document.getElementById("sv-input");
    var send = document.getElementById("sv-send");
    if (input) { input.disabled = false; input.placeholder = "Message #" + (channel ? channel.name || "channel" : "channel"); input.focus(); }
    if (send) send.disabled = false;
    closeDrawer(); knownIds = {}; lastMessages = []; loadMessages(true);
  }
  async function loadMessages(force) {
    if (loading || !activeChannelId) return;
    var server = getServer();
    if (!server || !server.id) return;
    loading = true;
    try {
      var url = "/api/messages?guildId=" + encodeURIComponent(server.id) + "&channelId=" + encodeURIComponent(activeChannelId);
      var response = await fetch(url, { method: "GET", credentials: "include", cache: "no-store", headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error("Messages request failed: " + response.status);
      var data = await response.json();
      var messages = Array.isArray(data) ? data : Array.isArray(data.messages) ? data.messages : [];
      renderMessages(messages, !!force);
    } catch (error) {
      console.error("Server View message loading failed:", error);
      if (force) showMessageError("Unable to load messages.");
    } finally { loading = false; }
  }
  function showMessageError(message) {
    var container = document.getElementById("sv-messages");
    if (!container) return;
    container.innerHTML = '<p class="sv-empty sv-error">' + esc(message) + '</p>';
  }
  function renderMessages(messages, force) {
    var container = document.getElementById("sv-messages");
    if (!container) return;
    if (!messages.length) { container.innerHTML = '<p class="sv-empty">No messages in this channel yet.</p>'; return; }
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
    messages.forEach(function (message) { if (message && message.id) knownIds[message.id] = true; });
    if (shouldScroll) container.scrollTop = container.scrollHeight;
  }
  function renderMessage(message, grouped) {
    var author = message.author || {};
    var authorName = author.displayName || author.globalName || author.username || "Unknown";
    var avatarUrl = typeof author.avatar === "string" ? author.avatar.trim() : "";
    var defaultAvatar = "https://cdn.discordapp.com/embed/avatars/0.png";
    var avatar = avatarUrl
      ? '<img class="sv-av" src="' + esc(avatarUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' + defaultAvatar + '\'">'
      : '<img class="sv-av" src="' + defaultAvatar + '" alt="" loading="lazy" referrerpolicy="no-referrer">';
    var timestamp = formatTime(message.createdTimestamp || message.createdAt || Date.now());
    var botBadge = author.bot ? '<span class="sv-bot-badge">BOT</span>' : "";
    var content = renderContent(message.content || "", message.mentions);
    var attachments = renderAttachments(message.attachments);
    var embeds = renderEmbeds(message.embeds, message.mentions);
    var reply = renderReply(message);
    var components = renderComponents(message.components);
    var authorId = author.id || "";
    var replyBtn = message.id ? '<button type="button" class="sv-reply-btn" data-reply-id="' + esc(message.id) + '" title="Reply">Reply</button>' : "";
    var punishBtn = authorId && !author.bot ? '<button type="button" class="sv-punish-btn" data-punish-user="' + esc(authorId) + '" data-punish-name="' + esc(authorName) + '" data-punish-msg="' + esc(message.id || "") + '" title="Warn, mute, or ban">Punish</button>' : "";
    var actions = (replyBtn || punishBtn) ? '<div class="sv-msg-actions">' + replyBtn + punishBtn + "</div>" : "";
    return '<article class="sv-msg' + (grouped ? " grouped" : "") + '" data-message-id="' + esc(message.id || "") + '" data-author-id="' + esc(authorId) + '"><div class="sv-av-wrap">' + avatar + '</div><div class="sv-msg-body"><div class="sv-msg-meta"><span class="sv-author">' + esc(authorName) + '</span>' + botBadge + '<time class="sv-time">' + esc(timestamp) + '</time>' + actions + '</div>' + reply + '<div class="sv-msg-content">' + content + '</div>' + attachments + embeds + components + '</div></article>';
  }
  function renderComponents(rows) {
    if (!Array.isArray(rows) || !rows.length) return "";
    var html = '<div class="sv-components">';
    rows.forEach(function (row) {
      var items = (row && row.components) || [];
      if (!items.length) return;
      html += '<div class="sv-component-row">';
      items.forEach(function (c) {
        if (!c) return;
        if (c.type === "button" || c.type === 2) {
          var label = c.label || (c.emoji && c.emoji.name) || "Button";
          if (c.url) html += '<a class="sv-component-btn" href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>';
          else html += '<button type="button" class="sv-component-btn disabled" disabled title="Bot-only button">' + esc(label) + '</button>';
        } else if (c.type === "select" || c.type === 3) {
          html += '<div class="sv-component-select">' + esc(c.placeholder || "Select\u2026") + '</div>';
        }
      });
      html += '</div>';
    });
    html += '</div>';
    return html;
  }
  function renderReply(message) {
    if (!message.reference) return "";
    var reference = message.reference;
    var replyName = reference.authorName || reference.username || "Reply";
    var replyContent = reference.content || "";
    return '<div class="sv-reply-preview"><span class="sv-reply-line"></span><span class="sv-reply-text"><strong>' + esc(replyName) + '</strong>' + (replyContent ? " " + esc(truncate(replyContent, 100)) : "") + '</span></div>';
  }
  function formatRichText(content, mentions) {
    if (!content) return "";
    mentions = mentions || {};
    var users = mentions.users || {};
    var roles = mentions.roles || {};
    var channels = mentions.channels || {};
    var escaped = esc(content).replace(/\n/g, "<br>");
    escaped = escaped.replace(/<(a?):([A-Za-z0-9_]+):(\d+)>/g, function (_, anim, name, id) {
      var ext = anim ? "gif" : "png";
      var src = "https://cdn.discordapp.com/emojis/" + id + "." + ext + "?size=48&quality=lossless";
      return '<img class="sv-emoji" src="' + src + '" alt=":' + esc(name) + ':" title=":' + esc(name) + ':" loading="lazy" referrerpolicy="no-referrer">';
    });
    escaped = escaped.replace(/<@!?(\d+)>/g, function (_, id) {
      var u = users[id]; var label = u ? (u.displayName || u.globalName || u.username || id) : id;
      return '<span class="sv-mention sv-mention-user">@' + esc(label) + "</span>";
    });
    escaped = escaped.replace(/<@&(\d+)>/g, function (_, id) {
      var r = roles[id]; var label = r ? r.name : "role";
      var style = r && r.color && r.color !== "#000000" ? ' style="color:' + esc(r.color) + '"' : "";
      return '<span class="sv-mention sv-mention-role"' + style + ">@" + esc(label) + "</span>";
    });
    escaped = escaped.replace(/<#(\d+)>/g, function (_, id) {
      var c = channels[id]; var label = c ? c.name : "channel";
      return '<span class="sv-mention sv-mention-channel">#' + esc(label) + "</span>";
    });
    escaped = escaped.replace(/(https?:\/\/[^\s<]+)/g, function (url) { return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + "</a>"; });
    return escaped;
  }
  function renderContent(content, mentions) { return formatRichText(content, mentions); }
  function renderAttachments(attachments) {
    if (!Array.isArray(attachments)) return "";
    var html = "";
    attachments.forEach(function (attachment) {
      if (!attachment) return;
      var url = attachment.url || attachment.proxyURL || ""; if (!url) return;
      var contentType = attachment.contentType || ""; var name = attachment.name || "";
      var isGif = contentType.indexOf("image/gif") === 0 || /\.gif($|\?)/i.test(url) || /\.gif($|\?)/i.test(name);
      var isImage = contentType.indexOf("image/") === 0 || /\.(png|jpe?g|gif|webp|avif)($|\?)/i.test(url) || /\.(png|jpe?g|gif|webp|avif)$/i.test(name);
      var isVideo = contentType.indexOf("video/") === 0 || /\.(mp4|webm|mov)($|\?)/i.test(url);
      if (isImage || isGif) html += '<button class="sv-attachment-image-btn" type="button" data-lightbox="' + esc(url) + '"><img class="sv-attachment-image' + (isGif ? " sv-gif" : "") + '" src="' + esc(url) + '" alt="' + esc(name || "Image") + '" loading="lazy" referrerpolicy="no-referrer"></button>';
      else if (isVideo) html += '<video class="sv-attachment-video" src="' + esc(url) + '" controls playsinline preload="metadata"></video>';
      else html += '<a class="sv-attachment" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">\uD83D\uDCCE ' + esc(name || "Attachment") + '</a>';
    });
    return html;
  }
  function embedMediaUrl(media) { if (!media) return ""; if (typeof media === "string") return media; return media.url || media.proxyURL || media.proxy_url || ""; }
  function renderEmbeds(embeds, mentions) {
    if (!Array.isArray(embeds)) return "";
    var html = "";
    embeds.forEach(function (embed) {
      if (!embed) return;
      var title = embed.title || ""; var description = embed.description || ""; var url = embed.url || "";
      var image = embedMediaUrl(embed.image); var thumbnail = embedMediaUrl(embed.thumbnail);
      var author = embed.author || null; var footer = embed.footer || null;
      var fields = Array.isArray(embed.fields) ? embed.fields : [];
      var color = embed.color != null ? Number(embed.color) : null;
      if (!title && !description && !image && !thumbnail && !author && !fields.length && !footer) return;
      var bar = color != null && !isNaN(color) ? "border-left:4px solid #" + ("000000" + (color >>> 0).toString(16)).slice(-6) + ";" : "";
      html += '<div class="sv-embed" style="' + bar + '">';
      if (author && author.name) {
        html += '<div class="sv-embed-author">';
        if (author.iconURL || author.icon_url) html += '<img class="sv-embed-author-icon" src="' + esc(author.iconURL || author.icon_url) + '" alt="" loading="lazy">';
        if (author.url) html += '<a href="' + esc(author.url) + '" target="_blank" rel="noopener noreferrer">' + esc(author.name) + '</a>';
        else html += '<span>' + esc(author.name) + '</span>';
        html += '</div>';
      }
      if (title) html += url ? '<a class="sv-embed-title" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(title) + '</a>' : '<div class="sv-embed-title">' + esc(title) + '</div>';
      if (description) html += '<div class="sv-embed-desc">' + formatRichText(description, mentions) + '</div>';
      if (fields.length) {
        html += '<div class="sv-embed-fields">';
        fields.forEach(function (f) { if (!f) return; html += '<div class="sv-embed-field' + (f.inline ? " inline" : "") + '"><div class="sv-embed-field-name">' + formatRichText(f.name || "", mentions) + '</div><div class="sv-embed-field-value">' + formatRichText(f.value || "", mentions) + '</div></div>'; });
        html += '</div>';
      }
      if (image) html += '<button class="sv-attachment-image-btn" type="button" data-lightbox="' + esc(image) + '"><img class="sv-embed-image" src="' + esc(image) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>';
      else if (thumbnail) html += '<button class="sv-attachment-image-btn" type="button" data-lightbox="' + esc(thumbnail) + '"><img class="sv-embed-thumb" src="' + esc(thumbnail) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>';
      if (footer && footer.text) html += '<div class="sv-embed-footer">' + esc(footer.text) + '</div>';
      html += '</div>';
    });
    return html;
  }
  function formatTime(value) { try { var date = new Date(value); if (isNaN(date.getTime())) return ""; return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
  function truncate(str, max) { str = String(str || ""); return str.length <= max ? str : str.slice(0, max - 1) + "\u2026"; }
  function isNearBottom(el) { if (!el) return true; return el.scrollHeight - el.scrollTop - el.clientHeight < 120; }
  function startPoll() { stopPoll(); pollTimer = setInterval(function () { if (activeChannelId && !loading && !sending) loadMessages(false); }, 4000); }
  function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
  function clearReply() { replyTo = null; var bar = document.getElementById("sv-reply-bar"); if (bar) bar.hidden = true; var label = document.getElementById("sv-reply-label"); if (label) label.textContent = "Replying\u2026"; }
  function setReply(message) {
    if (!message || !message.id) return;
    replyTo = message;
    var bar = document.getElementById("sv-reply-bar");
    var label = document.getElementById("sv-reply-label");
    var author = (message.author && (message.author.displayName || message.author.globalName || message.author.username)) || "message";
    if (label) label.textContent = "Replying to " + author + (message.content ? ": " + truncate(message.content, 60) : "");
    if (bar) bar.hidden = false;
    var input = document.getElementById("sv-input"); if (input) input.focus();
  }
  async function sendMessage(e) {
    if (e) e.preventDefault();
    if (sending || !activeChannelId) return;
    var input = document.getElementById("sv-input"); if (!input) return;
    var content = (input.value || "").trim(); if (!content) return;
    var server = getServer(); if (!server || !server.id) return;
    sending = true; input.disabled = true;
    try {
      var body = { content: content };
      var nameInput = document.getElementById("sv-display-name");
      if (nameInput && nameInput.value.trim()) body.displayName = nameInput.value.trim().slice(0, 80);
      if (replyTo && replyTo.id) body.replyTo = replyTo.id;
      var postUrl = "/api/messages?guildId=" + encodeURIComponent(server.id) + "&channelId=" + encodeURIComponent(activeChannelId);
      var response = await fetch(postUrl, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) { var errData = await response.json().catch(function () { return {}; }); throw new Error(errData.error || ("Send failed: " + response.status)); }
      input.value = ""; clearReply(); await loadMessages(true);
    } catch (error) { console.error("Send failed:", error); alert(error.message || "Failed to send message."); }
    finally { sending = false; if (input) { input.disabled = false; input.focus(); } }
  }
  function openLightbox(url) { var box = document.getElementById("sv-lightbox"); var img = document.getElementById("sv-lightbox-img"); if (!box || !img || !url) return; img.src = url; box.hidden = false; }
  function closeLightbox() { var box = document.getElementById("sv-lightbox"); var img = document.getElementById("sv-lightbox-img"); if (img) img.src = ""; if (box) box.hidden = true; }
  function onMessagesClick(e) {
    var target = e.target; if (!target) return;
    var lightboxBtn = target.closest("[data-lightbox]");
    if (lightboxBtn) { e.preventDefault(); openLightbox(lightboxBtn.getAttribute("data-lightbox")); return; }
    var punishBtn = target.closest("[data-punish-user]");
    if (punishBtn) {
      e.preventDefault(); e.stopPropagation();
      if (typeof window.openPunishModal === "function") {
        window.openPunishModal({ userId: punishBtn.getAttribute("data-punish-user"), userName: punishBtn.getAttribute("data-punish-name") || "user", messageId: punishBtn.getAttribute("data-punish-msg") || "", channelId: activeChannelId });
      }
      return;
    }
    var replyBtn = target.closest("[data-reply-id]");
    if (replyBtn) {
      e.preventDefault(); e.stopPropagation();
      var rid = replyBtn.getAttribute("data-reply-id");
      var found = lastMessages.find(function (m) { return m && m.id === rid; });
      if (found) setReply(found);
      return;
    }
    var msg = target.closest("[data-message-id]");
    if (msg && (e.altKey || e.metaKey)) {
      var id = msg.getAttribute("data-message-id");
      var found2 = lastMessages.find(function (m) { return m && m.id === id; });
      if (found2) setReply(found2);
    }
  }
  function bindOnce() {
    if (bound) return; bound = true;
    var back = document.getElementById("sv-back"); if (back) back.addEventListener("click", closeServerView);
    var closeBtn = document.getElementById("close-server-view"); if (closeBtn) closeBtn.addEventListener("click", closeServerView);
    var settingsBtn = document.getElementById("sv-settings-btn");
    if (settingsBtn) settingsBtn.addEventListener("click", function () { var panel = document.getElementById("sv-settings-panel"); if (panel) panel.hidden = !panel.hidden; });
    var refresh = document.getElementById("sv-refresh"); if (refresh) refresh.addEventListener("click", function () { loadMessages(true); });
    var form = document.getElementById("sv-composer"); if (form) form.addEventListener("submit", sendMessage);
    ["sv-theme", "sv-density", "sv-font-size"].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener("change", applyPrefs); });
    var lightbox = document.getElementById("sv-lightbox"); if (lightbox) lightbox.addEventListener("click", closeLightbox);
    var menu = document.getElementById("sv-menu-btn"); if (menu) menu.addEventListener("click", openDrawer);
    var channelClose = document.getElementById("sv-channels-close"); if (channelClose) channelClose.addEventListener("click", closeDrawer);
    var backdrop = document.getElementById("sv-drawer-backdrop"); if (backdrop) backdrop.addEventListener("click", closeDrawer);
    var messages = document.getElementById("sv-messages"); if (messages) messages.addEventListener("click", onMessagesClick);
    var cancelReply = document.getElementById("sv-reply-cancel"); if (cancelReply) cancelReply.addEventListener("click", clearReply);
    var nameInput = document.getElementById("sv-display-name");
    if (nameInput) { nameInput.value = localStorage.getItem("svDisplayName") || ""; nameInput.addEventListener("change", function () { localStorage.setItem("svDisplayName", nameInput.value.trim().slice(0, 80)); }); }
    loadPrefs();
  }
  window.openServerView = openServerView;
  window.closeServerView = closeServerView;
  if (!document.querySelector('script[data-sv-punish]')) {
    var s = document.createElement("script"); s.src = "server-view-punish.js?v=1"; s.dataset.svPunish = "1"; document.head.appendChild(s);
  }
  function boot() { bindOnce(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
