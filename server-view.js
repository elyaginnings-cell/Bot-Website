(function () {
  "use strict";

  var activeGuildId = null;
  var activeChannelId = null;
  var activeChannelName = null;
  var messages = [];
  var sending = false;
  var replyTo = null;
  var editingMessageId = null;
  var messagePollTimer = null;
  var channelPollTimer = null;

  function $(id) {
    return document.getElementById(id);
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getServer() {
    try {
      return JSON.parse(localStorage.getItem("svServer") || "null");
    } catch (_) {
      return null;
    }
  }

  function saveServer(server) {
    try {
      localStorage.setItem("svServer", JSON.stringify(server));
    } catch (_) {}
  }

  function getTheme() {
    return localStorage.getItem("svTheme") || "discord";
  }

  function getDensity() {
    return localStorage.getItem("svDensity") || "default";
  }

  function getFontSize() {
    return localStorage.getItem("svFontSize") || "16";
  }

  function applyAppearance() {
    var view = document.querySelector(".server-view");
    if (!view) return;

    var theme =
      (document.getElementById("sv-theme") || {}).value ||
      getTheme() ||
      "discord";

    var density =
      (document.getElementById("sv-density") || {}).value ||
      getDensity() ||
      "default";

    var fontSize =
      (document.getElementById("sv-font-size") || {}).value ||
      getFontSize() ||
      "16";

    view.classList.remove(
      "theme-darker",
      "theme-light",
      "theme-garden",
      "theme-midnight",
      "density-compact",
      "density-cozy"
    );

    if (theme === "darker") {
      view.classList.add("theme-darker");
    }

    if (theme === "light") {
      view.classList.add("theme-light");
    }

    if (theme === "garden") {
      view.classList.add("theme-garden");
    }

    if (theme === "midnight") {
      view.classList.add("theme-midnight");
    }

    if (density === "compact") {
      view.classList.add("density-compact");
    }

    if (density === "cozy") {
      view.classList.add("density-cozy");
    }

    view.style.setProperty("--sv-font-size", fontSize + "px");

    try {
      localStorage.setItem("svTheme", theme);
      localStorage.setItem("svDensity", density);
      localStorage.setItem("svFontSize", fontSize);
    } catch (_) {}
  }

  function setSelectValue(id, value) {
    var el = $(id);
    if (el) el.value = value;
  }

  function loadAppearanceSettings() {
    setSelectValue("sv-theme", getTheme());
    setSelectValue("sv-density", getDensity());
    setSelectValue("sv-font-size", getFontSize());
    applyAppearance();
  }

  function showToast(message, type) {
    var toast = document.createElement("div");
    toast.className = "sv-toast" + (type ? " " + type : "");
    toast.textContent = message;

    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("show");
    });

    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () {
        toast.remove();
      }, 220);
    }, 2800);
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";

    var date = new Date(
      typeof timestamp === "number"
        ? timestamp
        : String(timestamp)
    );

    if (isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function formatDate(timestamp) {
    if (!timestamp) return "";

    var date = new Date(
      typeof timestamp === "number"
        ? timestamp
        : String(timestamp)
    );

    if (isNaN(date.getTime())) return "";

    return date.toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatContent(content, mentions) {
    var text = String(content || "");
    var result = esc(text);

    result = result.replace(
      /```([\s\S]*?)```/g,
      '<pre class="sv-codeblock"><code>$1</code></pre>'
    );

    result = result.replace(
      /`([^`\n]+)`/g,
      '<code class="sv-code">$1</code>'
    );

    result = result.replace(
      /\*\*([^*]+)\*\*/g,
      "<strong>$1</strong>"
    );

    result = result.replace(
      /__([^_]+)__/g,
      "<u>$1</u>"
    );

    result = result.replace(
      /\*([^*\n]+)\*/g,
      "<em>$1</em>"
    );

    result = result.replace(
      /~~([^~]+)~~/g,
      "<s>$1</s>"
    );

    result = result.replace(
      /(^|\s)(https?:\/\/[^\s<]+)/g,
      '$1<a class="sv-link" href="$2" target="_blank" rel="noopener noreferrer">$2</a>'
    );

    result = result.replace(/\n/g, "<br>");

    if (mentions && typeof mentions === "object") {
      var users = mentions.users || [];

      users.forEach(function (user) {
        if (!user || !user.id) return;

        var name =
          user.displayName ||
          user.globalName ||
          user.username ||
          user.id;

        var patterns = [
          new RegExp("&lt;@" + user.id + "&gt;", "g"),
          new RegExp("&lt;@!" + user.id + "&gt;", "g")
        ];

        patterns.forEach(function (pattern) {
          result = result.replace(
            pattern,
            '<span class="sv-mention-user">@' +
              esc(name) +
              "</span>"
          );
        });
      });
    }

    return result;
  }

  function renderEmbed(embed) {
    if (!embed) return "";

    var html = '<div class="sv-embed">';

    if (embed.author && embed.author.name) {
      html +=
        '<div class="sv-embed-author">' +
        esc(embed.author.name) +
        "</div>";
    }

    if (embed.title) {
      html +=
        '<div class="sv-embed-title">' +
        (embed.url
          ? '<a href="' +
            esc(embed.url) +
            '" target="_blank" rel="noopener noreferrer">' +
            esc(embed.title) +
            "</a>"
          : esc(embed.title)) +
        "</div>";
    }

    if (embed.description) {
      html +=
        '<div class="sv-embed-description">' +
        formatContent(embed.description) +
        "</div>";
    }

    if (Array.isArray(embed.fields) && embed.fields.length) {
      html += '<div class="sv-embed-fields">';

      embed.fields.forEach(function (field) {
        html += '<div class="sv-embed-field">';

        if (field.name) {
          html +=
            '<div class="sv-embed-field-name">' +
            esc(field.name) +
            "</div>";
        }

        if (field.value) {
          html +=
            '<div class="sv-embed-field-value">' +
            formatContent(field.value) +
            "</div>";
        }

        html += "</div>";
      });

      html += "</div>";
    }

    if (embed.image && embed.image.url) {
      html +=
        '<img class="sv-embed-image" src="' +
        esc(embed.image.url) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer">';
    }

    if (embed.thumbnail && embed.thumbnail.url) {
      html +=
        '<img class="sv-embed-thumb" src="' +
        esc(embed.thumbnail.url) +
        '" alt="" loading="lazy" referrerpolicy="no-referrer">';
    }

    if (embed.footer && embed.footer.text) {
      html +=
        '<div class="sv-embed-footer">' +
        esc(embed.footer.text) +
        "</div>";
    }

    html += "</div>";

    return html;
  }

  function renderReply(reference) {
    if (!reference) return "";

    var author =
      reference.author ||
      reference.messageAuthor ||
      {};

    var name =
      author.displayName ||
      author.globalName ||
      author.username ||
      "Unknown";

    var content = reference.content || "";

    return (
      '<div class="sv-reply-preview">' +
      '<span class="sv-reply-arrow">↳</span>' +
      '<strong>' +
      esc(name) +
      "</strong>" +
      '<span class="sv-reply-text">' +
      esc(content.slice(0, 120)) +
      (content.length > 120 ? "…" : "") +
      "</span>" +
      "</div>"
    );
  }

  function getAuthorName(author) {
    author = author || {};

    return (
      author.displayName ||
      author.nickname ||
      author.globalName ||
      author.username ||
      "Unknown"
    );
  }

  function getAvatar(author) {
    author = author || {};

    /*
     * Discord normally gives us a CDN URL through displayAvatarURL().
     * The website serializer supplies it as author.avatar.
     *
     * Keep this renderer defensive because cached/older messages can
     * occasionally contain an empty avatar value.
     */
    var avatarUrl =
      typeof author.avatar === "string"
        ? author.avatar.trim()
        : "";

    var defaultAvatar =
      "https://cdn.discordapp.com/embed/avatars/0.png";

    if (!avatarUrl) {
      return (
        '<img class="sv-av" src="' +
        defaultAvatar +
        '" alt="" loading="lazy" referrerpolicy="no-referrer">'
      );
    }

    return (
      '<img class="sv-av" src="' +
      esc(avatarUrl) +
      '" alt="" loading="lazy" referrerpolicy="no-referrer" ' +
      'onerror="this.onerror=null;this.src=&quot;' +
      defaultAvatar +
      '&quot;">'
    );
  }

  function messageHtml(m, index) {
    m = m || {};

    var author = m.author || {};

    var authorName = getAuthorName(author);

    var avatar = getAvatar(author);

    var timestamp = formatTime(m.createdTimestamp);

    var dateLabel = formatDate(m.createdTimestamp);

    var body = formatContent(
      m.content || "",
      m.mentions
    );

    var embeds = Array.isArray(m.embeds)
      ? m.embeds
          .map(renderEmbed)
          .join("")
      : "";

    var reference = m.reference
      ? renderReply(m.reference)
      : "";

    var botBadge = author.bot
      ? '<span class="sv-bot">BOT</span>'
      : "";

    var edited = m.editedTimestamp
      ? '<span class="sv-edited">(edited)</span>'
      : "";

    var messageClasses = ["sv-msg"];

    var prev =
      index > 0
        ? messages[index - 1]
        : null;

    var grouped =
      prev &&
      prev.author &&
      m.author &&
      prev.author.id &&
      m.author.id &&
      prev.author.id === m.author.id &&
      !m.reference &&
      m.createdTimestamp -
        prev.createdTimestamp <
        7 * 60 * 1000;

    if (grouped) {
      messageClasses.push("grouped");
    }

    if (m.pinned) {
      messageClasses.push("pinned");
    }

    var contentHtml =
      body || embeds || reference
        ? '<div class="sv-content">' +
          reference +
          (body ? '<div class="sv-text">' + body + "</div>" : "") +
          embeds +
          "</div>"
        : "";

    return (
      '<article class="' +
      messageClasses.join(" ") +
      '" data-message-id="' +
      esc(m.id || "") +
      '">' +
      '<div class="sv-av-wrap">' +
      avatar +
      "</div>" +
      '<div class="sv-msg-main">' +
      (grouped
        ? ""
        : '<div class="sv-msg-meta">' +
          '<strong>' +
          esc(authorName) +
          "</strong>" +
          botBadge +
          '<span class="sv-time" title="' +
          esc(dateLabel) +
          '">' +
          esc(timestamp) +
          "</span>" +
          edited +
          "</div>") +
      contentHtml +
      "</div>" +
      "</article>"
    );
  }

  function scrollMessagesToBottom(force) {
    var container = $("sv-messages");
    if (!container) return;

    var distance =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    if (force || distance < 260) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function renderMessages(nextMessages) {
    messages = Array.isArray(nextMessages)
      ? nextMessages
      : [];

    var container = $("sv-messages");
    if (!container) return;

    if (!messages.length) {
      container.innerHTML =
        '<div class="sv-empty">' +
        '<div class="sv-empty-icon">✦</div>' +
        "<strong>No messages yet</strong>" +
        "<span>Be the first to say something.</span>" +
        "</div>";

      return;
    }

    var wasNearBottom =
      container.scrollHeight -
        container.scrollTop -
        container.clientHeight <
      260;

    container.innerHTML = messages
      .map(function (message, index) {
        return messageHtml(message, index);
      })
      .join("");

    if (wasNearBottom) {
      scrollMessagesToBottom(true);
    }
  }

  async function loadMessages(forceScroll) {
    if (!activeGuildId || !activeChannelId) return;

    try {
      var params = new URLSearchParams({
        guildId: activeGuildId,
        channelId: activeChannelId
      });

      var response = await fetch(
        "/api/messages?" + params.toString(),
        {
          credentials: "include",
          cache: "no-store"
        }
      );

      var result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to load messages."
        );
      }

      var nextMessages =
        (result.data &&
          result.data.messages) ||
        [];

      renderMessages(nextMessages);

      if (forceScroll) {
        setTimeout(function () {
          scrollMessagesToBottom(true);
        }, 20);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);

      if (!messages.length) {
        var container = $("sv-messages");

        if (container) {
          container.innerHTML =
            '<div class="sv-empty">' +
            "<strong>Unable to load messages</strong>" +
            "<span>" +
            esc(err.message || "Something went wrong.") +
            "</span>" +
            "</div>";
        }
      }
    }
  }

  async function loadChannels() {
    if (!activeGuildId) return;

    try {
      var response = await fetch(
        "/api/channels?guildId=" +
          encodeURIComponent(activeGuildId),
        {
          credentials: "include",
          cache: "no-store"
        }
      );

      var result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to load channels."
        );
      }

      var channels =
        (result.data &&
          result.data.channels) ||
        [];

      renderChannels(channels);
    } catch (err) {
      console.error("Failed to load channels:", err);
    }
  }

  function channelIcon(channel) {
    if (!channel) return "#";

    if (
      channel.type === "voice" ||
      channel.type === 2
    ) {
      return "🔊";
    }

    if (
      channel.type === "announcement" ||
      channel.type === 5
    ) {
      return "📢";
    }

    return "#";
  }

  function renderChannels(channels) {
    var container = $("sv-channel-list");
    if (!container) return;

    var visible = channels.filter(function (channel) {
      return (
        channel &&
        channel.id &&
        channel.type !== "category"
      );
    });

    var categories = channels.filter(function (channel) {
      return (
        channel &&
        (channel.type === "category" ||
          channel.type === 4)
      );
    });

    if (!visible.length) {
      container.innerHTML =
        '<div class="sv-empty-channel">No channels available.</div>';
      return;
    }

    var html = "";

    if (categories.length) {
      categories.forEach(function (category) {
        var categoryChannels = visible.filter(
          function (channel) {
            return (
              channel.parentId === category.id
            );
          }
        );

        if (!categoryChannels.length) return;

        html +=
          '<div class="sv-category">' +
          '<div class="sv-cat">' +
          esc(
            category.name || "CHANNELS"
          ) +
          "</div>";

        categoryChannels.forEach(function (channel) {
          html += channelButton(channel);
        });

        html += "</div>";
      });

      var uncategorized = visible.filter(
        function (channel) {
          return !channel.parentId;
        }
      );

      if (uncategorized.length) {
        html +=
          '<div class="sv-category">' +
          '<div class="sv-cat">CHANNELS</div>';

        uncategorized.forEach(function (channel) {
          html += channelButton(channel);
        });

        html += "</div>";
      }
    } else {
      html +=
        '<div class="sv-category">' +
        '<div class="sv-cat">CHANNELS</div>';

      visible.forEach(function (channel) {
        html += channelButton(channel);
      });

      html += "</div>";
    }

    container.innerHTML = html;
  }

  function channelButton(channel) {
    var active =
      String(channel.id) ===
      String(activeChannelId);

    return (
      '<button type="button" class="sv-ch' +
      (active ? " active" : "") +
      '" data-channel-id="' +
      esc(channel.id) +
      '" data-channel-name="' +
      esc(channel.name || "") +
      '">' +
      '<span class="sv-hash">' +
      channelIcon(channel) +
      "</span>" +
      '<span class="sv-channel-name">' +
      esc(channel.name || "unnamed") +
      "</span>" +
      "</button>"
    );
  }

  function selectChannel(id, name) {
    if (!id) return;

    activeChannelId = String(id);
    activeChannelName = name || "channel";

    try {
      localStorage.setItem(
        "svChannelId",
        activeChannelId
      );

      localStorage.setItem(
        "svChannelName",
        activeChannelName
      );
    } catch (_) {}

    var title = $("sv-channel-title");
    if (title) {
      title.textContent = activeChannelName;
    }

    var hash = $("sv-channel-hash");
    if (hash) {
      hash.textContent = "#";
    }

    document
      .querySelectorAll(".sv-ch")
      .forEach(function (button) {
        button.classList.toggle(
          "active",
          String(
            button.dataset.channelId
          ) === String(activeChannelId)
        );
      });

    replyTo = null;
    editingMessageId = null;

    hideReplyBar();
    hideEditBar();

    loadMessages(true);
  }

  function sendMessage(e) {
    if (e) e.preventDefault();

    if (sending) return;

    var server = getServer();

    var input = $("sv-input");
    var sendBtn = $("sv-send");

    var content =
      input && input.value
        ? input.value.trim()
        : "";

    if (
      !content ||
      !server ||
      !server.id ||
      !activeChannelId
    ) {
      return;
    }

    var username = (
      (
        ($("sv-display-name") || {}).value ||
        localStorage.getItem(
          "svDisplayName"
        ) ||
        ""
      )
    )
      .trim()
      .slice(0, 80);

    if (username) {
      localStorage.setItem(
        "svDisplayName",
        username
      );
    }

    sending = true;

    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    var params = new URLSearchParams({
      guildId: server.id,
      channelId: activeChannelId
    });

    var payload = {
      content: content
    };

    if (username) {
      payload.username = username;
    }

    if (replyTo && replyTo.id) {
      payload.replyTo = replyTo.id;
    }

    fetch("/api/messages?" + params.toString(), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return {
            ok: response.ok,
            data: data
          };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          throw new Error(
            result.data.error ||
              "Failed to send message."
          );
        }

        if (input) {
          input.value = "";
        }

        replyTo = null;
        hideReplyBar();

        loadMessages(true);
      })
      .catch(function (err) {
        console.error(
          "Failed to send message:",
          err
        );

        showToast(
          err.message ||
            "Failed to send message.",
          "error"
        );
      })
      .finally(function () {
        sending = false;

        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;

        if (input) input.focus();
      });
  }

  function beginReply(messageId) {
    var message = messages.find(function (item) {
      return String(item.id) === String(messageId);
    });

    if (!message) return;

    replyTo = message;

    var bar = $("sv-reply-bar");
    var name = $("sv-reply-name");
    var text = $("sv-reply-text");

    if (name) {
      name.textContent = getAuthorName(
        message.author
      );
    }

    if (text) {
      text.textContent =
        message.content || "";
    }

    if (bar) {
      bar.classList.add("show");
    }

    var input = $("sv-input");
    if (input) input.focus();
  }

  function hideReplyBar() {
    var bar = $("sv-reply-bar");

    if (bar) {
      bar.classList.remove("show");
    }
  }

  function hideEditBar() {
    var bar = $("sv-edit-bar");

    if (bar) {
      bar.classList.remove("show");
    }
  }

  function startPolling() {
    stopPolling();

    messagePollTimer = setInterval(
      function () {
        if (activeGuildId && activeChannelId) {
          loadMessages(false);
        }
      },
      3000
    );

    channelPollTimer = setInterval(
      function () {
        if (activeGuildId) {
          loadChannels();
        }
      },
      10000
    );
  }

  function stopPolling() {
    if (messagePollTimer) {
      clearInterval(messagePollTimer);
      messagePollTimer = null;
    }

    if (channelPollTimer) {
      clearInterval(channelPollTimer);
      channelPollTimer = null;
    }
  }

  function bindEvents() {
    var form = $("sv-form");

    if (form) {
      form.addEventListener(
        "submit",
        sendMessage
      );
    }

    var theme = $("sv-theme");

    if (theme) {
      theme.addEventListener(
        "change",
        applyAppearance
      );
    }

    var density = $("sv-density");

    if (density) {
      density.addEventListener(
        "change",
        applyAppearance
      );
    }

    var fontSize = $("sv-font-size");

    if (fontSize) {
      fontSize.addEventListener(
        "change",
        applyAppearance
      );
    }

    var channelList = $("sv-channel-list");

    if (channelList) {
      channelList.addEventListener(
        "click",
        function (event) {
          var button =
            event.target.closest(".sv-ch");

          if (!button) return;

          selectChannel(
            button.dataset.channelId,
            button.dataset.channelName
          );
        }
      );
    }

    var messagesContainer =
      $("sv-messages");

    if (messagesContainer) {
      messagesContainer.addEventListener(
        "contextmenu",
        function (event) {
          var messageEl =
            event.target.closest(".sv-msg");

          if (!messageEl) return;

          event.preventDefault();

          var messageId =
            messageEl.dataset.messageId;

          if (messageId) {
            beginReply(messageId);
          }
        }
      );
    }

    var replyClose = $("sv-reply-close");

    if (replyClose) {
      replyClose.addEventListener(
        "click",
        function () {
          replyTo = null;
          hideReplyBar();
        }
      );
    }

    var displayName =
      $("sv-display-name");

    if (displayName) {
      displayName.value =
        localStorage.getItem(
          "svDisplayName"
        ) || "";
    }

    var refresh = $("sv-refresh");

    if (refresh) {
      refresh.addEventListener(
        "click",
        function () {
          loadChannels();
          loadMessages(true);
        }
      );
    }

    var input = $("sv-input");

    if (input) {
      input.addEventListener(
        "keydown",
        function (event) {
          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();

            if (form) {
              form.requestSubmit();
            }
          }

          if (
            event.key === "Escape" &&
            replyTo
          ) {
            replyTo = null;
            hideReplyBar();
          }
        }
      );
    }
  }

  function initialize() {
    var server = getServer();

    if (!server || !server.id) {
      console.warn(
        "No Server View server selected."
      );
      return;
    }

    activeGuildId = String(server.id);

    try {
      activeChannelId =
        localStorage.getItem(
          "svChannelId"
        );

      activeChannelName =
        localStorage.getItem(
          "svChannelName"
        ) || null;
    } catch (_) {}

    bindEvents();
    loadAppearanceSettings();

    loadChannels().then(function () {
      var currentButton =
        document.querySelector(
          '.sv-ch[data-channel-id="' +
            CSS.escape(
              String(
                activeChannelId || ""
              )
            ) +
            '"]'
        );

      if (
        !currentButton &&
        !activeChannelId
      ) {
        var first =
          document.querySelector(".sv-ch");

        if (first) {
          selectChannel(
            first.dataset.channelId,
            first.dataset.channelName
          );
        }
      } else if (activeChannelId) {
        selectChannel(
          activeChannelId,
          activeChannelName
        );
      }
    });

    startPolling();
  }

  window.ServerView = {
    initialize: initialize,
    selectChannel: selectChannel,
    loadMessages: loadMessages,
    loadChannels: loadChannels,
    applyAppearance: applyAppearance
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }
})();