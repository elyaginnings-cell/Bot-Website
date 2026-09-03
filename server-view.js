/* Discord-style Server View (+ mobile drawer) */

let svActiveChannelId = null;
let svPollTimer = null;
let svKnownIds = new Set();
let svLoading = false;
let svLastMessages = [];
let svSending = false;

function svServer() {
  return window.selectedServer || null;
}
function svChannels() {
  return window.channelsCache || [];
}

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
  view.classList.remove("theme-darker", "theme-light", "theme-garden", "density-compact", "density-cozy");
  if (theme === "darker") view.classList.add("theme-darker");
  if (theme === "light") view.classList.add("theme-light");
  if (theme === "garden") view.classList.add("theme-garden");
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
  const selectedServer = svServer();
  if (!selectedServer?.id) {
    alert("Choose a server first.");
    return;
  }
  const app = document.getElementById("app");
  const view = document.getElementById("server-view");
  if (!view) {
    alert("Server View markup missing from the page.");
    return;
  }
  if (app) app.hidden = true;
  view.hidden = false;
  document.body.classList.add("server-view-open");
  const nameEl = document.getElementById("sv-server-name");
  if (nameEl) nameEl.textContent = selectedServer.name || "Server";
  const nameInput = document.getElementById("sv-display-name");
  if (nameInput && !nameInput.value) nameInput.value = localStorage.getItem("svDisplayName") || "";
  applySvPrefs();
  closeSvDrawer();
  renderSvChannels();
  if (svActiveChannelId) loadSvMessages(true);
  else if (window.matchMedia("(max-width: 768px)").matches) openSvDrawer();
  startSvPoll();
}
window.openServerView = openServerView;

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
window.closeServerView = closeServerView;

function renderSvChannels() {
  const list = document.getElementById("sv-channel-list");
  if (!list) return;
  const channelsCache = svChannels();
  const cats = channelsCache.filter((c) => c.type === 4);
  const texts = channelsCache.filter((c) => c.type === 0 || c.type === 5);
  if (!texts.length) {
    list.innerHTML = `<p class="sv-empty">No text channels found. Choose a server and wait for channels to load.</p>`;
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
  const selectedServer = svServer();
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

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

function formatMessageContent(content, mentions) {
  if (!content) return "";
  let text = escapeHtml(content);
  const users = mentions?.users || {};
  const roles = mentions?.roles || {};
  const channels = mentions?.channels || {};
  text = text.replace(/<@!?(\d+)>/g, (_, id) => {
    const u = users[id];
    const label = u ? `@${u.displayName || u.nickname || u.globalName || u.username}` : `@user`;
    return `<span class="sv-mention sv-mention-user">${escapeHtml(label)}</span>`;
  });
  text = text.replace(/<@&(\d+)>/g, (_, id) => {
    const r = roles[id];
    return `<span class="sv-mention sv-mention-role">${escapeHtml(r ? `@${r.name}` : `@role`)}</span>`;
  });
  text = text.replace(/<#(\d+)>/g, (_, id) => {
    const c = channels[id];
    return `<span class="sv-mention sv-mention-channel" data-channel-id="${id}">${escapeHtml(c ? `#${c.name}` : `#channel`)}</span>`;
  });
  text = text.replace(/(https?:\/\/[^\s<]+)/g, `<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>`);
  return text;
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
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const av = m.author?.avatar
    ? `<img class="sv-av" src="${escapeHtml(m.author.avatar)}" alt="">`
    : `<div class="sv-av fallback">☕</div>`;
  let body = formatMessageContent(m.content || "", m.mentions);
  if (!body && !(m.embeds?.length) && !(m.attachments?.length)) {
    body = `<em style="opacity:.6">(empty)</em>`;
  }
  const atts = (m.attachments || [])
    .map((a) => {
      if (a.contentType && a.contentType.startsWith("image/")) {
        return `<img class="sv-img" src="${escapeHtml(a.url)}" alt="" data-full="${escapeHtml(a.url)}">`;
      }
      return `<a class="sv-file" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(a.name || "file")}</a>`;
    })
    .join("");
  return `<div class="sv-msg${grouped ? " grouped" : ""}" data-id="${m.id}">
    <div class="sv-av-wrap">${av}</div>
    <div class="sv-msg-body">
      <div class="sv-msg-meta"><strong>${escapeHtml(name)}</strong>${bot}<span class="sv-time">${escapeHtml(time)}</span></div>
      ${body ? `<div class="sv-msg-text">${body}</div>` : ""}
      ${atts}
    </div>
  </div>`;
}

function onSvMessagesClick(e) {
  const t = e.target;
  if (t.matches?.("img.sv-img")) {
    openLightbox(t.getAttribute("data-full") || t.src);
    return;
  }
  const chMention = t.closest?.(".sv-mention-channel");
  if (chMention) {
    const id = chMention.getAttribute("data-channel-id");
    if (id) {
      const ch = svChannels().find((c) => c.id === id);
      selectSvChannel(id, ch ? `# ${ch.name}` : "# channel");
    }
  }
}

function openLightbox(src) {
  const box = document.getElementById("sv-lightbox");
  const img = document.getElementById("sv-lightbox-img");
  if (!box || !img) return;
  img.src = src;
  box.hidden = false;
}
function closeLightbox() {
  const box = document.getElementById("sv-lightbox");
  if (box) box.hidden = true;
}

async function sendSvMessage(e) {
  e.preventDefault();
  if (svSending) return;
  const selectedServer = svServer();
  const input = document.getElementById("sv-input");
  const sendBtn = document.getElementById("sv-send");
  const content = input?.value?.trim();
  if (!content || !selectedServer?.id || !svActiveChannelId) return;

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
