/* Discord-style Server View */

let svActiveChannelId = null;
let svPollTimer = null;
let svKnownIds = new Set();
let svLoading = false;
let svLastMessages = [];

function initServerView() {
  document.getElementById("open-server-view")?.addEventListener("click", openServerView);
  document.getElementById("close-server-view")?.addEventListener("click", closeServerView);
  document.getElementById("sv-refresh")?.addEventListener("click", () => loadSvMessages(true));
  document.getElementById("sv-composer")?.addEventListener("submit", sendSvMessage);
  document.getElementById("sv-settings-btn")?.addEventListener("click", toggleSvSettings);
  document.getElementById("sv-theme")?.addEventListener("change", applySvPrefs);
  document.getElementById("sv-density")?.addEventListener("change", applySvPrefs);
  document.getElementById("sv-font-size")?.addEventListener("change", applySvPrefs);
  document.getElementById("sv-lightbox")?.addEventListener("click", closeLightbox);

  const nameInput = document.getElementById("sv-display-name");
  if (nameInput) {
    nameInput.value = localStorage.getItem("svDisplayName") || "";
    nameInput.addEventListener("change", () => {
      localStorage.setItem("svDisplayName", nameInput.value.trim().slice(0, 80));
    });
    nameInput.addEventListener("blur", () => {
      localStorage.setItem("svDisplayName", nameInput.value.trim().slice(0, 80));
    });
  }

  loadSvPrefs();

  // Delegated clicks for messages area
  document.getElementById("sv-messages")?.addEventListener("click", onSvMessagesClick);
}

function loadSvPrefs() {
  const theme = localStorage.getItem("svTheme") || "discord";
  const density = localStorage.getItem("svDensity") || "default";
  const fontSize = localStorage.getItem("svFontSize") || "16";
  const themeEl = document.getElementById("sv-theme");
  const densEl = document.getElementById("sv-density");
  const fontEl = document.getElementById("sv-font-size");
  if (themeEl) themeEl.value = theme;
  if (densEl) densEl.value = density;
  if (fontEl) fontEl.value = fontSize;
  applySvPrefs();
}

function applySvPrefs() {
  const view = document.getElementById("server-view");
  if (!view) return;
  const theme = document.getElementById("sv-theme")?.value || "discord";
  const density = document.getElementById("sv-density")?.value || "default";
  const fontSize = document.getElementById("sv-font-size")?.value || "16";

  view.classList.remove("theme-darker", "theme-light", "density-compact", "density-cozy");
  if (theme === "darker") view.classList.add("theme-darker");
  if (theme === "light") view.classList.add("theme-light");
  if (density === "compact") view.classList.add("density-compact");
  if (density === "cozy") view.classList.add("density-cozy");
  view.style.setProperty("--sv-font-size", `${fontSize}px`);

  localStorage.setItem("svTheme", theme);
  localStorage.setItem("svDensity", density);
  localStorage.setItem("svFontSize", fontSize);
}

function toggleSvSettings() {
  const panel = document.getElementById("sv-settings-panel");
  if (!panel) return;
  panel.hidden = !panel.hidden;
}

function getSvDisplayName() {
  const el = document.getElementById("sv-display-name");
  const v = (el?.value || localStorage.getItem("svDisplayName") || "").trim().slice(0, 80);
  return v || null;
}

function openServerView() {
  if (!selectedServer?.id) {
    alert("Choose a server first.");
    return;
  }
  const app = document.getElementById("app");
  const view = document.getElementById("server-view");
  if (!view) return;
  app.hidden = true;
  view.hidden = false;
  document.body.classList.add("server-view-open");
  document.getElementById("sv-server-name").textContent = selectedServer.name || "Server";
  const nameInput = document.getElementById("sv-display-name");
  if (nameInput && !nameInput.value) {
    nameInput.value = localStorage.getItem("svDisplayName") || "";
  }
  applySvPrefs();
  renderSvChannels();
  if (svActiveChannelId) loadSvMessages(true);
  startSvPoll();
}

function closeServerView() {
  stopSvPoll();
  document.getElementById("sv-settings-panel")?.setAttribute("hidden", "");
  const app = document.getElementById("app");
  const view = document.getElementById("server-view");
  if (view) view.hidden = true;
  if (app) app.hidden = false;
  document.body.classList.remove("server-view-open");
}

function renderSvChannels() {
  const list = document.getElementById("sv-channel-list");
  if (!list) return;
  const cats = channelsCache.filter((c) => c.type === 4);
  const texts = channelsCache.filter((c) => c.type === 0 || c.type === 5);
  if (!texts.length) {
    list.innerHTML = `<p class="sv-empty">No text channels found.</p>`;
    return;
  }

  const byParent = new Map();
  texts.forEach((ch) => {
    const key = ch.parentId || "_none";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(ch);
  });

  let html = "";
  const orderedParents = ["_none", ...cats.map((c) => c.id)];
  const seen = new Set();

  for (const pid of orderedParents) {
    const group = byParent.get(pid);
    if (!group?.length) continue;
    seen.add(pid);
    const cat = cats.find((c) => c.id === pid);
    if (cat) html += `<div class="sv-cat">${escapeHtml(cat.name)}</div>`;
    else if (pid === "_none") html += `<div class="sv-cat">Text channels</div>`;
    group
      .sort((a, b) => (a.position || 0) - (b.position || 0) || a.name.localeCompare(b.name))
      .forEach((ch) => {
        const active = ch.id === svActiveChannelId ? " active" : "";
        html += `<button type="button" class="sv-ch${active}" data-id="${ch.id}"><span class="sv-hash">#</span>${escapeHtml(ch.name)}</button>`;
      });
  }

  byParent.forEach((group, pid) => {
    if (seen.has(pid)) return;
    group.forEach((ch) => {
      const active = ch.id === svActiveChannelId ? " active" : "";
      html += `<button type="button" class="sv-ch${active}" data-id="${ch.id}"><span class="sv-hash">#</span>${escapeHtml(ch.name)}</button>`;
    });
  });

  list.innerHTML = html;
  list.querySelectorAll(".sv-ch").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectSvChannel(btn.getAttribute("data-id"), btn.textContent.replace(/^\s*#\s*/, "# "));
    });
  });
}

function selectSvChannel(id, title) {
  svActiveChannelId = id;
  svKnownIds = new Set();
  const clean = (title || "# channel").replace(/^\s*#\s*/, "");
  document.getElementById("sv-channel-title").textContent = clean;
  document.getElementById("sv-input").disabled = false;
  document.getElementById("sv-send").disabled = false;
  const input = document.getElementById("sv-input");
  if (input) input.placeholder = `Message #${clean}`;
  renderSvChannels();
  loadSvMessages(true);
}

async function loadSvMessages(full) {
  if (!selectedServer?.id || !svActiveChannelId || svLoading) return;
  svLoading = true;
  try {
    const params = new URLSearchParams({
      guildId: selectedServer.id,
      channelId: svActiveChannelId,
      limit: "50",
    });
    const res = await fetch(`/api/messages?${params}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      document.getElementById("sv-messages").innerHTML =
        `<p class="sv-empty">❌ ${escapeHtml(data.error || "Failed to load")}</p>`;
      return;
    }
    const messages = data.messages || [];
    if (full) {
      svKnownIds = new Set(messages.map((m) => m.id));
      svLastMessages = messages;
      renderSvMessages(messages);
    } else {
      const box = document.getElementById("sv-messages");
      const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      const fresh = messages.filter((m) => !svKnownIds.has(m.id));
      if (fresh.length) {
        fresh.forEach((m) => {
          svKnownIds.add(m.id);
          svLastMessages.push(m);
        });
        // re-render last few for grouping accuracy
        renderSvMessages(svLastMessages.slice(-60));
        if (atBottom) box.scrollTop = box.scrollHeight;
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    svLoading = false;
  }
}

function renderSvMessages(messages) {
  const box = document.getElementById("sv-messages");
  if (!messages.length) {
    box.innerHTML = `<p class="sv-empty">No messages in this channel yet.<br>Say something!</p>`;
    return;
  }
  box.innerHTML = messages
    .map((m, i) => {
      const prev = i > 0 ? messages[i - 1] : null;
      const grouped =
        prev &&
        prev.author?.id === m.author?.id &&
        m.createdTimestamp - prev.createdTimestamp < 7 * 60 * 1000;
      return messageHtml(m, grouped);
    })
    .join("");
  box.scrollTop = box.scrollHeight;
}

function formatMessageContent(content, mentions) {
  if (!content) return "";

  // Code blocks first (protect content)
  const blocks = [];
  let text = content.replace(/```([\s\S]*?)```/g, (_, code) => {
    const i = blocks.length;
    blocks.push(`<pre class="sv-codeblock">${escapeHtml(code.replace(/^\n|\n$/g, ""))}</pre>`);
    return `\0BLOCK${i}\0`;
  });

  text = escapeHtml(text);

  const users = mentions?.users || {};
  const roles = mentions?.roles || {};
  const channels = mentions?.channels || {};

  text = text.replace(/&lt;@!?(\d+)&gt;/g, (_, id) => {
    const u = users[id];
    const label = u
      ? `@${u.displayName || u.nickname || u.globalName || u.username}`
      : `@user`;
    return `<span class="sv-mention sv-mention-user" data-user-id="${id}" title="${escapeHtml(u?.username || id)}">${escapeHtml(label)}</span>`;
  });

  text = text.replace(/&lt;@&amp;(\d+)&gt;/g, (_, id) => {
    const r = roles[id];
    const label = r ? `@${r.name}` : `@role`;
    const style = r?.color && r.color !== "#000000" ? ` style="color:${escapeHtml(r.color)}"` : "";
    return `<span class="sv-mention sv-mention-role" data-role-id="${id}"${style}>${escapeHtml(label)}</span>`;
  });
  text = text.replace(/&lt;@&(\d+)&gt;/g, (_, id) => {
    const r = roles[id];
    const label = r ? `@${r.name}` : `@role`;
    return `<span class="sv-mention sv-mention-role" data-role-id="${id}">${escapeHtml(label)}</span>`;
  });

  text = text.replace(/&lt;#(\d+)&gt;/g, (_, id) => {
    const c = channels[id];
    const label = c ? `#${c.name}` : `#channel`;
    return `<span class="sv-mention sv-mention-channel" data-channel-id="${id}" role="button">${escapeHtml(label)}</span>`;
  });

  text = text.replace(/@everyone/g, `<span class="sv-mention sv-mention-everyone">@everyone</span>`);
  text = text.replace(/@here/g, `<span class="sv-mention sv-mention-everyone">@here</span>`);

  // URLs
  text = text.replace(
    /(https?:\/\/[^\s&lt;]+)/g,
    `<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>`
  );

  // Spoilers ||text||
  text = text.replace(/\|\|(.+?)\|\|/g, `<span class="sv-spoiler" title="Click to reveal">$1</span>`);

  // Bold / italic / underline / strike / inline code
  text = text.replace(/`([^`]+)`/g, `<code class="sv-code">$1</code>`);
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<u>$1</u>");
  text = text.replace(/~~(.+?)~~/g, "<s>$1</s>");
  text = text.replace(/(?<![*\\])\*(?!\*)(.+?)(?<![*\\])\*(?!\*)/g, "<em>$1</em>");
  text = text.replace(/(?<![_\\])_(?!_)(.+?)(?<![_\\])_(?!_)/g, "<em>$1</em>");

  // Restore code blocks
  text = text.replace(/\0BLOCK(\d+)\0/g, (_, i) => blocks[Number(i)] || "");

  return text;
}

function embedHtml(e) {
  if (!e) return "";
  const color =
    e.color != null && e.color !== 0
      ? `#${Number(e.color).toString(16).padStart(6, "0")}`
      : "#202225";

  let main = "";
  if (e.author?.name) {
    const icon = e.author.iconURL
      ? `<img class="sv-embed-author-icon" src="${escapeHtml(e.author.iconURL)}" alt="">`
      : "";
    main += `<div class="sv-embed-author">${icon}<span>${escapeHtml(e.author.name)}</span></div>`;
  }
  if (e.title) {
    const title = e.url
      ? `<a href="${escapeHtml(e.url)}" target="_blank" rel="noopener">${escapeHtml(e.title)}</a>`
      : escapeHtml(e.title);
    main += `<div class="sv-embed-title">${title}</div>`;
  }
  if (e.description) {
    main += `<div class="sv-embed-desc">${formatMessageContent(e.description, null)}</div>`;
  }
  if (e.fields?.length) {
    main += `<div class="sv-embed-fields">`;
    e.fields.forEach((f) => {
      main += `<div class="sv-embed-field${f.inline ? " inline" : ""}">
        <div class="sv-embed-field-name">${formatMessageContent(f.name, null)}</div>
        <div class="sv-embed-field-value">${formatMessageContent(f.value, null)}</div>
      </div>`;
    });
    main += `</div>`;
  }
  if (e.image) {
    main += `<img class="sv-embed-image" src="${escapeHtml(e.image)}" alt="" data-full="${escapeHtml(e.image)}">`;
  }
  if (e.footer?.text || e.timestamp) {
    const ficon = e.footer?.iconURL
      ? `<img class="sv-embed-footer-icon" src="${escapeHtml(e.footer.iconURL)}" alt="">`
      : "";
    const parts = [];
    if (e.footer?.text) parts.push(escapeHtml(e.footer.text));
    if (e.timestamp) parts.push(escapeHtml(new Date(e.timestamp).toLocaleString()));
    main += `<div class="sv-embed-footer">${ficon}<span>${parts.join(" · ")}</span></div>`;
  }

  const thumb = e.thumbnail
    ? `<img class="sv-embed-thumb" src="${escapeHtml(e.thumbnail)}" alt="" data-full="${escapeHtml(e.thumbnail)}">`
    : "";

  return `<div class="sv-embed${e.thumbnail ? " has-thumb" : ""}" style="border-left-color:${color}">
    <div class="sv-embed-inner">${main}</div>${thumb}
  </div>`;
}

function messageHtml(m, grouped) {
  const name =
    m.author?.displayName ||
    m.author?.nickname ||
    m.author?.globalName ||
    m.author?.username ||
    "Unknown";
  const bot = m.author?.bot ? `<span class="sv-bot">BOT</span>` : "";
  const time = m.createdTimestamp
    ? new Date(m.createdTimestamp).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const av = m.author?.avatar
    ? `<img class="sv-av" src="${escapeHtml(m.author.avatar)}" alt="">`
    : `<div class="sv-av fallback">☕</div>`;

  let body = formatMessageContent(m.content || "", m.mentions);
  if (!body && !(m.embeds && m.embeds.length) && !(m.attachments && m.attachments.length)) {
    body = "<em style=\"opacity:.6\">(empty message)</em>";
  }

  const atts = (m.attachments || [])
    .map((a) => {
      if (a.contentType && a.contentType.startsWith("image/")) {
        return `<img class="sv-img" src="${escapeHtml(a.url)}" alt="" data-full="${escapeHtml(a.url)}">`;
      }
      return `<a class="sv-file" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(a.name || "file")}</a>`;
    })
    .join("");

  const embeds = (m.embeds || []).map(embedHtml).join("");
  const jump =
    selectedServer?.id && svActiveChannelId
      ? `https://discord.com/channels/${selectedServer.id}/${svActiveChannelId}/${m.id}`
      : "";

  return `<div class="sv-msg${grouped ? " grouped" : ""}" data-id="${m.id}" data-author="${escapeHtml(m.author?.id || "")}">
    <div class="sv-av-wrap">${av}</div>
    <div class="sv-msg-body">
      <div class="sv-msg-meta"><strong>${escapeHtml(name)}</strong>${bot}<span class="sv-time">${escapeHtml(time)}</span></div>
      ${body ? `<div class="sv-msg-text">${body}</div>` : ""}
      ${atts}
      ${embeds}
    </div>
    <div class="sv-msg-actions">
      <button type="button" data-action="reply" data-id="${m.id}" data-name="${escapeHtml(name)}">Reply</button>
      <button type="button" data-action="copy-id" data-id="${m.id}">Copy ID</button>
      ${jump ? `<button type="button" data-action="jump" data-url="${escapeHtml(jump)}">Open in Discord</button>` : ""}
    </div>
  </div>`;
}

function onSvMessagesClick(e) {
  const t = e.target;

  // Spoiler reveal
  if (t.classList?.contains("sv-spoiler")) {
    t.classList.toggle("revealed");
    return;
  }

  // Lightbox for images
  if (t.matches?.("img.sv-img, img.sv-embed-image, img.sv-embed-thumb")) {
    openLightbox(t.getAttribute("data-full") || t.src);
    return;
  }

  // Channel mention → switch channel
  const chMention = t.closest?.(".sv-mention-channel");
  if (chMention) {
    const id = chMention.getAttribute("data-channel-id");
    if (id) {
      const ch = channelsCache.find((c) => c.id === id);
      selectSvChannel(id, ch ? `# ${ch.name}` : "# channel");
    }
    return;
  }

  // User mention → insert into composer
  const uMention = t.closest?.(".sv-mention-user");
  if (uMention) {
    const id = uMention.getAttribute("data-user-id");
    if (id) insertIntoComposer(`<@${id}> `);
    return;
  }

  // Role mention → insert
  const rMention = t.closest?.(".sv-mention-role");
  if (rMention) {
    const id = rMention.getAttribute("data-role-id");
    if (id) insertIntoComposer(`<@&${id}> `);
    return;
  }

  // Message actions
  const btn = t.closest?.("[data-action]");
  if (btn) {
    const action = btn.getAttribute("data-action");
    if (action === "reply") {
      const name = btn.getAttribute("data-name") || "user";
      const id = btn.closest(".sv-msg")?.getAttribute("data-author");
      if (id) insertIntoComposer(`<@${id}> `);
      else insertIntoComposer(`@${name} `);
      showToast(`Replying to ${name}`);
    } else if (action === "copy-id") {
      const id = btn.getAttribute("data-id");
      navigator.clipboard?.writeText(id).then(
        () => showToast("Message ID copied"),
        () => showToast(id)
      );
    } else if (action === "jump") {
      window.open(btn.getAttribute("data-url"), "_blank", "noopener");
    }
  }
}

function insertIntoComposer(text) {
  const input = document.getElementById("sv-input");
  if (!input || input.disabled) return;
  input.value = (input.value || "") + text;
  input.focus();
}

function openLightbox(url) {
  const lb = document.getElementById("sv-lightbox");
  const img = document.getElementById("sv-lightbox-img");
  if (!lb || !img) return;
  img.src = url;
  lb.hidden = false;
}

function closeLightbox() {
  const lb = document.getElementById("sv-lightbox");
  if (lb) lb.hidden = true;
}

function showToast(msg) {
  let t = document.getElementById("sv-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "sv-toast";
    t.className = "sv-toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 1800);
}

async function sendSvMessage(e) {
  e.preventDefault();
  const input = document.getElementById("sv-input");
  const content = input?.value?.trim();
  if (!content || !selectedServer?.id || !svActiveChannelId) return;

  const username = getSvDisplayName();
  if (!username) {
    alert("Set a display name in the top bar first.");
    document.getElementById("sv-display-name")?.focus();
    return;
  }

  localStorage.setItem("svDisplayName", username);
  input.disabled = true;
  try {
    const params = new URLSearchParams({
      guildId: selectedServer.id,
      channelId: svActiveChannelId,
    });
    const res = await fetch(`/api/messages?${params}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, username }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Send failed");
      return;
    }
    input.value = "";
    if (data.message) {
      svKnownIds.add(data.message.id);
      svLastMessages.push(data.message);
      renderSvMessages(svLastMessages.slice(-60));
    } else {
      await loadSvMessages(true);
    }
  } catch (err) {
    alert(err.message || "Send failed");
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function startSvPoll() {
  stopSvPoll();
  svPollTimer = setInterval(() => {
    if (!document.getElementById("server-view")?.hidden) loadSvMessages(false);
  }, 3500);
}

function stopSvPoll() {
  if (svPollTimer) clearInterval(svPollTimer);
  svPollTimer = null;
}

document.addEventListener("DOMContentLoaded", initServerView);
