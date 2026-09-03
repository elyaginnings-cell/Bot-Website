/* Full-screen Discord-like server view through the bot */

let svActiveChannelId = null;
let svPollTimer = null;
let svKnownIds = new Set();
let svLoading = false;

function initServerView() {
  document.getElementById("open-server-view")?.addEventListener("click", openServerView);
  document.getElementById("close-server-view")?.addEventListener("click", closeServerView);
  document.getElementById("sv-refresh")?.addEventListener("click", () => loadSvMessages(true));
  document.getElementById("sv-composer")?.addEventListener("submit", sendSvMessage);

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
  renderSvChannels();
  if (svActiveChannelId) {
    loadSvMessages(true);
  }
  startSvPoll();
}

function closeServerView() {
  stopSvPoll();
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
    else if (pid === "_none") html += `<div class="sv-cat">Channels</div>`;
    group
      .sort((a, b) => (a.position || 0) - (b.position || 0) || a.name.localeCompare(b.name))
      .forEach((ch) => {
        const active = ch.id === svActiveChannelId ? " active" : "";
        html += `<button type="button" class="sv-ch${active}" data-id="${ch.id}"># ${escapeHtml(ch.name)}</button>`;
      });
  }

  byParent.forEach((group, pid) => {
    if (seen.has(pid)) return;
    group.forEach((ch) => {
      const active = ch.id === svActiveChannelId ? " active" : "";
      html += `<button type="button" class="sv-ch${active}" data-id="${ch.id}"># ${escapeHtml(ch.name)}</button>`;
    });
  });

  list.innerHTML = html;
  list.querySelectorAll(".sv-ch").forEach((btn) => {
    btn.addEventListener("click", () => selectSvChannel(btn.getAttribute("data-id"), btn.textContent));
  });
}

function selectSvChannel(id, title) {
  svActiveChannelId = id;
  svKnownIds = new Set();
  document.getElementById("sv-channel-title").textContent = title || "# channel";
  document.getElementById("sv-input").disabled = false;
  document.getElementById("sv-send").disabled = false;
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
      renderSvMessages(messages);
    } else {
      const box = document.getElementById("sv-messages");
      const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      const fresh = messages.filter((m) => !svKnownIds.has(m.id));
      if (fresh.length) {
        fresh.forEach((m) => {
          svKnownIds.add(m.id);
          box.insertAdjacentHTML("beforeend", messageHtml(m));
        });
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
    box.innerHTML = `<p class="sv-empty">No messages in this channel yet.</p>`;
    return;
  }
  box.innerHTML = messages.map(messageHtml).join("");
  box.scrollTop = box.scrollHeight;
}

/** Format Discord markdown-ish text with mentions */
function formatMessageContent(content, mentions) {
  if (!content) return "";
  let text = escapeHtml(content);

  const users = mentions?.users || {};
  const roles = mentions?.roles || {};
  const channels = mentions?.channels || {};

  // User mentions <@id> or <@!id>
  text = text.replace(/&lt;@!?(\d+)&gt;/g, (_, id) => {
    const u = users[id];
    const label = u
      ? `@${u.displayName || u.nickname || u.globalName || u.username}`
      : `@${id}`;
    return `<span class="sv-mention sv-mention-user">${escapeHtml(label)}</span>`;
  });

  // Role mentions <@&id>
  text = text.replace(/&lt;@&amp;(\d+)&gt;/g, (_, id) => {
    const r = roles[id];
    const label = r ? `@${r.name}` : `@role`;
    return `<span class="sv-mention sv-mention-role">${escapeHtml(label)}</span>`;
  });
  // Fallback if &amp; wasn't used (shouldn't happen after escapeHtml)
  text = text.replace(/&lt;@&(\d+)&gt;/g, (_, id) => {
    const r = roles[id];
    const label = r ? `@${r.name}` : `@role`;
    return `<span class="sv-mention sv-mention-role">${escapeHtml(label)}</span>`;
  });

  // Channel mentions <#id>
  text = text.replace(/&lt;#(\d+)&gt;/g, (_, id) => {
    const c = channels[id];
    const label = c ? `#${c.name}` : `#channel`;
    return `<span class="sv-mention sv-mention-channel">${escapeHtml(label)}</span>`;
  });

  // @everyone / @here
  text = text.replace(/@everyone/g, `<span class="sv-mention sv-mention-everyone">@everyone</span>`);
  text = text.replace(/@here/g, `<span class="sv-mention sv-mention-everyone">@here</span>`);

  // Simple **bold** and *italic* and `code`
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  text = text.replace(/`([^`]+)`/g, "<code class=\"sv-code\">$1</code>");

  // Newlines already preserved via white-space: pre-wrap
  return text;
}

function embedHtml(e) {
  if (!e) return "";
  const color = e.color != null ? `#${Number(e.color).toString(16).padStart(6, "0")}` : "#ff4df0";
  let inner = "";

  if (e.author?.name) {
    const icon = e.author.iconURL
      ? `<img class="sv-embed-author-icon" src="${escapeHtml(e.author.iconURL)}" alt="">`
      : "";
    inner += `<div class="sv-embed-author">${icon}<span>${escapeHtml(e.author.name)}</span></div>`;
  }
  if (e.title) {
    const title = e.url
      ? `<a href="${escapeHtml(e.url)}" target="_blank" rel="noopener">${escapeHtml(e.title)}</a>`
      : escapeHtml(e.title);
    inner += `<div class="sv-embed-title">${title}</div>`;
  }
  if (e.description) {
    inner += `<div class="sv-embed-desc">${formatMessageContent(e.description, null)}</div>`;
  }
  if (e.fields?.length) {
    inner += `<div class="sv-embed-fields">`;
    e.fields.forEach((f) => {
      inner += `<div class="sv-embed-field${f.inline ? " inline" : ""}">
        <div class="sv-embed-field-name">${escapeHtml(f.name)}</div>
        <div class="sv-embed-field-value">${formatMessageContent(f.value, null)}</div>
      </div>`;
    });
    inner += `</div>`;
  }
  if (e.image) {
    inner += `<a href="${escapeHtml(e.image)}" target="_blank" rel="noopener"><img class="sv-embed-image" src="${escapeHtml(e.image)}" alt=""></a>`;
  }
  if (e.thumbnail) {
    // thumbnail shown as small image on the side conceptually — keep simple
    inner += `<img class="sv-embed-thumb" src="${escapeHtml(e.thumbnail)}" alt="">`;
  }
  if (e.footer?.text) {
    const ficon = e.footer.iconURL
      ? `<img class="sv-embed-footer-icon" src="${escapeHtml(e.footer.iconURL)}" alt="">`
      : "";
    const time = e.timestamp ? ` · ${new Date(e.timestamp).toLocaleString()}` : "";
    inner += `<div class="sv-embed-footer">${ficon}<span>${escapeHtml(e.footer.text)}${escapeHtml(time)}</span></div>`;
  } else if (e.timestamp) {
    inner += `<div class="sv-embed-footer"><span>${escapeHtml(new Date(e.timestamp).toLocaleString())}</span></div>`;
  }

  return `<div class="sv-embed" style="border-left-color:${color}">${inner}</div>`;
}

function messageHtml(m) {
  const name =
    m.author?.displayName ||
    m.author?.nickname ||
    m.author?.globalName ||
    m.author?.username ||
    "Unknown";
  const bot = m.author?.bot ? `<span class="sv-bot">BOT</span>` : "";
  const time = m.createdTimestamp
    ? new Date(m.createdTimestamp).toLocaleString()
    : "";
  const av = m.author?.avatar
    ? `<img class="sv-av" src="${escapeHtml(m.author.avatar)}" alt="">`
    : `<div class="sv-av fallback">☕</div>`;

  let body = formatMessageContent(m.content || "", m.mentions);
  if (!body && !(m.embeds && m.embeds.length) && !(m.attachments && m.attachments.length)) {
    body = "<em>(empty)</em>";
  }

  const atts = (m.attachments || [])
    .map((a) => {
      if (a.contentType && a.contentType.startsWith("image/")) {
        return `<a href="${escapeHtml(a.url)}" target="_blank" rel="noopener"><img class="sv-img" src="${escapeHtml(a.url)}" alt=""></a>`;
      }
      return `<a class="sv-file" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">📎 ${escapeHtml(a.name || "file")}</a>`;
    })
    .join("");

  const embeds = (m.embeds || []).map(embedHtml).join("");

  return `<div class="sv-msg" data-id="${m.id}">
    ${av}
    <div class="sv-msg-body">
      <div class="sv-msg-meta"><strong>${escapeHtml(name)}</strong>${bot}<span class="sv-time">${escapeHtml(time)}</span></div>
      ${body ? `<div class="sv-msg-text">${body}</div>` : ""}
      ${atts}
      ${embeds}
    </div>
  </div>`;
}

async function sendSvMessage(e) {
  e.preventDefault();
  const input = document.getElementById("sv-input");
  const content = input?.value?.trim();
  if (!content || !selectedServer?.id || !svActiveChannelId) return;

  const username = getSvDisplayName();
  if (!username) {
    alert("Set a display name first (top bar) — that name shows in Discord instead of the bot.");
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
    if (data.warning) console.warn(data.warning);
    input.value = "";
    if (data.message) {
      svKnownIds.add(data.message.id);
      const box = document.getElementById("sv-messages");
      const empty = box.querySelector(".sv-empty");
      if (empty) box.innerHTML = "";
      box.insertAdjacentHTML("beforeend", messageHtml(data.message));
      box.scrollTop = box.scrollHeight;
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
  }, 4000);
}

function stopSvPoll() {
  if (svPollTimer) clearInterval(svPollTimer);
  svPollTimer = null;
}

document.addEventListener("DOMContentLoaded", initServerView);
