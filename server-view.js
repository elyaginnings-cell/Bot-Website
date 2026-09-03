/* Discord-style Server View (+ mobile drawer) */

let svActiveChannelId = null;
let svPollTimer = null;
let svKnownIds = new Set();
let svLoading = false;
let svLastMessages = [];
let svSending = false;

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
  document.getElementById("sv-menu-btn")?.addEventListener("click", openSvDrawer);
  document.getElementById("sv-channels-close")?.addEventListener("click", closeSvDrawer);
  document.getElementById("sv-drawer-backdrop")?.addEventListener("click", closeSvDrawer);

  const nameInput = document.getElementById("sv-display-name");
  if (nameInput) {
    nameInput.value = localStorage.getItem("svDisplayName") || "";
    const saveName = () => localStorage.setItem("svDisplayName", nameInput.value.trim().slice(0, 80));
    nameInput.addEventListener("change", saveName);
    nameInput.addEventListener("blur", saveName);
  }
  loadSvPrefs();
  document.getElementById("sv-messages")?.addEventListener("click", onSvMessagesClick);
}

function openSvDrawer() {
  document.getElementById("server-view")?.classList.add("drawer-open");
}
function closeSvDrawer() {
  document.getElementById("server-view")?.classList.remove("drawer-open");
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
  return v || "";
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
  if (nameInput && !nameInput.value) nameInput.value = localStorage.getItem("svDisplayName") || "";
  applySvPrefs();
  closeSvDrawer();
  renderSvChannels();
  if (svActiveChannelId) loadSvMessages(true);
  else if (window.matchMedia("(max-width: 768px)").matches) openSvDrawer();
  startSvPoll();
}

function closeServerView() {
  stopSvPoll();
  closeSvDrawer();
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
  closeSvDrawer();
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
      const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
      const fresh = messages.filter((m) => !svKnownIds.has(m.id));
      if (fresh.length) {
        fresh.forEach((m) => {
          svKnownIds.add(m.id);
          svLastMessages.push(m);
        });
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
    box.innerHTML = `<p class="sv-empty">No messages yet.<br>Say something!</p>`;
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
  // After escapeHtml, Discord tokens look like <@id>
  text = text.replace(/<@!?(\d+)>/g, (_, id) => {
    const u = users[id];
    const label = u ? `@${u.displayName || u.nickname || u.globalName || u.username}` : `@user`;
    return `<span class="sv-mention sv-mention-user" data-user-id="${id}">${escapeHtml(label)}</span>`;
  });
  text = text.replace(/<@&(\d+)>/g, (_, id) => {
    const r = roles[id];
    return `<span class="sv-mention sv-mention-role" data-role-id="${id}">${escapeHtml(r ? `@${r.name}` : `@role`)}</span>`;
  });
  text = text.replace(/<#(\d+)>/g, (_, id) => {
    const c = channels[id];
    return `<span class="sv-mention sv-mention-channel" data-channel-id="${id}">${escapeHtml(c ? `#${c.name}` : `#channel`)}</span>`;
  });
  text = text.replace(/@everyone/g, `<span class="sv-mention sv-mention-everyone">@everyone</span>`);
  text = text.replace(/@here/g, `<span class="sv-mention sv-mention-everyone">@here</span>`);
  text = text.replace(/(https?:\/\/[^\s<]+)/g, `<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>`);
  text = text.replace(/\|\|(.+?)\|\|/g, `<span class="sv-spoiler">$1</span>`);
  text = text.replace(/`([^`]+)`/g, `<code class="sv-code">$1</code>`);
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<u>$1</u>");
  text = text.replace(/~~(.+?)~~/g, "<s>$1</s>");
  text = text.replace(/(?<![*\\])\*(?!\*)(.+?)(?<![*\\])\*(?!\*)/g, "<em>$1</em>");
  text = text.replace(/\0BLOCK(\d+)\0/g, (_, i) => blocks[Number(i)] || "");
  return text;
}

function embedHtml(e, mentions) {
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
    main += `<div class="sv-embed-author">${icon}<span>${formatMessageContent(e.author.name, mentions)}</span></div>`;
  }
  if (e.title) {
    const titleInner = formatMessageContent(e.title, mentions);
    const title = e.url
      ? `<a href="${escapeHtml(e.url)}" target="_blank" rel="noopener">${titleInner}</a>`
      : titleInner;
    main += `<div class="sv-embed-title">${title}</div>`;
  }
  if (e.description) {
    main += `<div class="sv-embed-desc">${formatMessageContent(e.description, mentions)}</div>`;
  }
  if (e.fields?.length) {
    main += `<div class="sv-embed-fields">`;
    e.fields.forEach((f) => {
      main += `<div class="sv-embed-field${f.inline ? " inline" : ""}">
        <div class="sv-embed-field-name">${formatMessageContent(f.name, mentions)}</div>
        <div class="sv-embed-field-value">${formatMessageContent(f.value, mentions)}</div>
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
    if (e.footer?.text) parts.push(formatMessageContent(e.footer.text, mentions));
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

function buttonStyleClass(style) {
  switch (Number(style)) {
    case 1: return "primary";
    case 3: return "success";
    case 4: return "danger";
    case 5: return "link";
    default: return "secondary";
  }
}

function emojiHtml(emoji) {
  if (!emoji) return "";
  if (emoji.id) {
    const ext = emoji.animated ? "gif" : "png";
    const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=32`;
    return `<span class="sv-btn-emoji"><img src="${escapeHtml(url)}" alt=""></span>`;
  }
  if (emoji.name) return `<span class="sv-btn-emoji">${escapeHtml(emoji.name)}</span>`;
  return "";
}

function componentsHtml(rows) {
  if (!rows?.length) return "";
  let html = `<div class="sv-components">`;
  for (const row of rows) {
    html += `<div class="sv-comp-row">`;
    for (const c of row.components || []) {
      if (c.type === "button") {
        const cls = buttonStyleClass(c.style);
        const disabled = c.disabled ? " disabled" : "";
        const label = escapeHtml(c.label || "");
        const em = emojiHtml(c.emoji);
        if (c.url) {
          html += `<a class="sv-btn ${cls}${disabled}" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${em}${label || "Link"}</a>`;
        } else {
          html += `<button type="button" class="sv-btn ${cls}${disabled}" disabled title="View only — interact in Discord">${em}${label || "Button"}</button>`;
        }
      } else if (c.type === "select") {
        const opts = (c.options || [])
          .map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
          .join("");
        html += `<select class="sv-select" disabled title="View only — interact in Discord">
          <option>${escapeHtml(c.placeholder || "Select…")}</option>${opts}
        </select>`;
      }
    }
    html += `</div>`;
  }
  html += `<div class="sv-comp-hint">Buttons are view-only here — click them in Discord to use.</div>`;
  html += `</div>`;
  return html;
}

const REPLY_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 8.22V4.97a.5.5 0 0 0-.83-.35l-6.8 6.28a.5.5 0 0 0 0 .74l6.8 6.28a.5.5 0 0 0 .83-.35v-3.2c5.18.12 8.7 1.63 10.5 4.83.2.35.64.4.85.08C23.1 15.6 19.55 8.5 10 8.22Z"/></svg>`;

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
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const av = m.author?.avatar
    ? `<img class="sv-av" src="${escapeHtml(m.author.avatar)}" alt="">`
    : `<div class="sv-av fallback">☕</div>`;

  let body = formatMessageContent(m.content || "", m.mentions);
  const hasMedia =
    (m.embeds && m.embeds.length) ||
    (m.attachments && m.attachments.length) ||
    (m.components && m.components.length);
  if (!body && !hasMedia) body = "<em style=\"opacity:.6\">(empty)</em>";

  const atts = (m.attachments || [])
    .map((a) => {
      if (a.contentType && a.contentType.startsWith("image/")) {
        return `<img class="sv-img" src="${escapeHtml(a.url)}" alt="" data-full="${escapeHtml(a.url)}">`;
      }
      return `<a class="sv-file" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(a.name || "file")}</a>`;
    })
    .join("");

  const embeds = (m.embeds || []).map((e) => embedHtml(e, m.mentions)).join("");
  const comps = componentsHtml(m.components);

  return `<div class="sv-msg${grouped ? " grouped" : ""}" data-id="${m.id}" data-author="${escapeHtml(m.author?.id || "")}">
    <div class="sv-av-wrap">${av}</div>
    <div class="sv-msg-body">
      <div class="sv-msg-meta"><strong>${escapeHtml(name)}</strong>${bot}<span class="sv-time">${escapeHtml(time)}</span></div>
      ${body ? `<div class="sv-msg-text">${body}</div>` : ""}
      ${atts}
      ${embeds}
      ${comps}
    </div>
    <div class="sv-msg-actions">
      <button type="button" class="sv-reply-btn" data-action="reply" data-name="${escapeHtml(name)}" title="Reply">
        ${REPLY_ICON}<span class="sv-reply-label">Reply</span>
      </button>
    </div>
  </div>`;
}

function onSvMessagesClick(e) {
  const t = e.target;
  if (t.classList?.contains("sv-spoiler")) {
    t.classList.toggle("revealed");
    return;
  }
  if (t.matches?.("img.sv-img, img.sv-embed-image, img.sv-embed-thumb")) {
    openLightbox(t.getAttribute("data-full") || t.src);
    return;
  }
  const chMention = t.closest?.(".sv-mention-channel");
  if (chMention) {
    const id = chMention.getAttribute("data-channel-id");
    if (id) {
      const ch = channelsCache.find((c) => c.id === id);
      selectSvChannel(id, ch ? `# ${ch.name}` : "# channel");
    }
    return;
  }
  const uMention = t.closest?.(".sv-mention-user");
  if (uMention) {
    const id = uMention.getAttribute("data-user-id");
    if (id) insertIntoComposer(`<@${id}> `);
    return;
  }
  const rMention = t.closest?.(".sv-mention-role");
  if (rMention) {
    const id = rMention.getAttribute("data-role-id");
    if (id) insertIntoComposer(`<@&${id}> `);
    return;
  }
  const btn = t.closest?.("[data-action=reply]");
  if (btn) {
    const name = btn.getAttribute("data-name") || "user";
    const id = btn.closest(".sv-msg")?.getAttribute("data-author");
    if (id) insertIntoComposer(`<@${id}> `);
    else insertIntoComposer(`@${name} `);
    showToast(`Replying to ${name}`);
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
  if (svSending) return;

  const input = document.getElementById("sv-input");
  const sendBtn = document.getElementById("sv-send");
  const content = input?.value?.trim();
  if (!content || !selectedServer?.id || !svActiveChannelId) return;

  // Name is optional — bot will fall back to Coffee Shop | Chat
  const username = getSvDisplayName();
  if (username) localStorage.setItem("svDisplayName", username);

  svSending = true;
  if (input) input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  try {
    const params = new URLSearchParams({
      guildId: selectedServer.id,
      channelId: svActiveChannelId,
    });
    const payload = { content };
    if (username) payload.username = username;

    const res = await fetch(`/api/messages?${params}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || `Send failed (${res.status})`);
      return;
    }
    if (input) input.value = "";
    if (data.message?.id) {
      svKnownIds.add(data.message.id);
      svLastMessages.push(data.message);
      renderSvMessages(svLastMessages.slice(-60));
    } else {
      // Message may still have been posted — refresh from Discord
      await loadSvMessages(true);
    }
  } catch (err) {
    console.error(err);
    alert(err.message || "Send failed — check connection / bot online");
  } finally {
    svSending = false;
    if (input) {
      input.disabled = false;
      input.focus();
    }
    if (sendBtn) sendBtn.disabled = false;
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
