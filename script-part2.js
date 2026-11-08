
function fillChannelSelects() {
  ["warn-channel", "invite-channel", "dashboard-log-channel", "level-up-channel", "bday-channel"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    const emptyLabel = id === "level-up-channel" ? "Same channel they leveled in" : "Select a channel...";
    el.innerHTML = `<option value="">${emptyLabel}</option>`;
    channelsCache.forEach((ch) => {
      const opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = `#${ch.name}`;
      el.appendChild(opt);
    });
    if (current) el.value = current;
  });
}

function fillRoleSelects() {
  ["level-role", "shop-role", "bday-ping-role", "bday-role"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = `<option value="">${id.startsWith("bday") ? "None" : "Select role..."}</option>`;
    rolesCache.forEach((role) => {
      const opt = document.createElement("option");
      opt.value = role.id;
      opt.textContent = role.name;
      el.appendChild(opt);
    });
    if (current) el.value = current;
  });
}

function setVal(id, v) {
  const el = document.getElementById(id);
  if (el && v !== undefined && v !== null) el.value = v;
}
function setCheck(id, v) {
  const el = document.getElementById(id);
  if (el) el.checked = !!v;
}
function setStatus(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text || "";
  el.style.color = ok ? "#57F287" : "#f23f43";
}
function formatLogResult(data, okMsg) {
  let text = okMsg || "Saved.";
  if (data?.savedToPostgres) text = "Saved to website Postgres.";
  if (data?.savedToBot === false) text += " Bot did not sync.";
  else if (data?.savedToBot) text += " Bot updated.";
  if (data?.warning) text = data.warning;
  if (data?.logResult?.error) text += " (Log: " + data.logResult.error + ")";
  return { ok: true, text };
}

async function saveConfig(body) {
  const guildId = String(selectedServer?.id || "");
  if (!guildId) throw new Error("Select a server first.");
  if (window.guildConfigLoading) throw new Error("This server is still loading. Wait for its settings to finish loading before saving.");
  const response = await fetch(`/api/config?guildId=${encodeURIComponent(guildId)}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail ? (" — " + data.detail) : "";
    throw new Error((data.error || "Save failed") + detail);
  }
  // A save for a previous server must never replace the currently selected
  // server's in-memory configuration after a switch.
  if (String(selectedServer?.id || "") === guildId && data.config) {
    currentConfig = data.config;
    syncGlobals();
  }
  return data;
}

function applyConfigToForms() {
  if (!currentConfig) return;
  const c = currentConfig;
  if (c.warnChannelId) setVal("warn-channel", c.warnChannelId);
  if (c.inviteLeaderboardChannelId) setVal("invite-channel", c.inviteLeaderboardChannelId);
  if (c.dashboardLogChannelId) setVal("dashboard-log-channel", c.dashboardLogChannelId);
  if (c.levelUpChannelId) setVal("level-up-channel", c.levelUpChannelId);
  else setVal("level-up-channel", "");
  const L = c.leveling || {};
  setCheck("lvl-enabled", L.enabled !== false);
  setCheck("lvl-messages", L.levelUpMessages !== false);
  setCheck("lvl-beans-enabled", L.beansEnabled !== false);
  setVal("lvl-xp-min", L.xpMin ?? 15);
  setVal("lvl-xp-max", L.xpMax ?? 25);
  setVal("lvl-xp-cd", L.xpCooldownSeconds ?? 60);
  setVal("lvl-beans-base", L.beansBase ?? 50);
  setVal("lvl-beans-linear", L.beansLinear ?? 50);
  setVal("lvl-beans-quad", L.beansQuadratic ?? 5);
  updateLevelPreview();
  const U = c.currency || {};
  setCheck("cur-enabled", U.enabled !== false);
  setVal("cur-name", U.currencyName ?? "Beans");
  setVal("cur-emoji", U.currencyEmoji ?? "☕");
  setVal("cur-daily-min", U.dailyMin ?? 150);
  setVal("cur-daily-max", U.dailyMax ?? 300);
  setVal("cur-streak-bonus", U.dailyStreakBonus ?? 25);
  setVal("cur-max-streak", U.dailyMaxStreak ?? 7);
  setVal("cur-work-min", U.workMin ?? 40);
  setVal("cur-work-max", U.workMax ?? 120);
  setVal("cur-work-cd", U.workCooldownMinutes ?? 30);
  setCheck("cur-chat-enabled", U.chatCoinsEnabled !== false);
  setVal("cur-chat-chance", U.chatCoinChance ?? 8);
  setVal("cur-chat-min", U.chatCoinMin ?? 5);
  setVal("cur-chat-max", U.chatCoinMax ?? 20);
  setVal("cur-chat-cd", U.chatCoinCooldownSeconds ?? 60);
  setCheck("cur-flip-enabled", U.coinflipEnabled !== false);
  setVal("cur-flip-max", U.coinflipMaxBet ?? 0);
  const S = c.shop || {};
  setCheck("shop-enabled", S.enabled !== false);
  renderLevelRolesList();
  renderShopItems();
  updateShopTypeFields();
  const B = c.birthday || {};
  setVal("bday-channel", B.channelId || "");
  setVal("bday-ping-role", B.pingRoleId || "");
  setVal("bday-role", B.birthdayRoleId || "");
  setVal("bday-bonus", B.bonusBeans ?? 500);
}

function updateLevelPreview() {
  const base = Number(document.getElementById("lvl-beans-base")?.value) || 0;
  const linear = Number(document.getElementById("lvl-beans-linear")?.value) || 0;
  const quad = Number(document.getElementById("lvl-beans-quad")?.value) || 0;
  const el = document.getElementById("lvl-preview");
  if (!el) return;
  const samples = [1, 5, 10, 20].map((lvl) => {
    const amt = Math.floor(base + lvl * linear + lvl * lvl * quad);
    return `L${lvl}=${amt.toLocaleString()}`;
  });
  el.textContent = "Preview: " + samples.join(" · ");
}

async function saveModeration() {
  try {
    setStatus("moderation-status", "Saving…", true);
    const data = await saveConfig({ warnChannelId: document.getElementById("warn-channel")?.value || null });
    const r = formatLogResult(data, "✅ Saved.");
    setStatus("moderation-status", r.text, r.ok);
  } catch (e) {
    setStatus("moderation-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveInvites() {
  try {
    setStatus("invites-status", "Saving…", true);
    const data = await saveConfig({ inviteLeaderboardChannelId: document.getElementById("invite-channel")?.value || null });
    const r = formatLogResult(data, "✅ Saved.");
    setStatus("invites-status", r.text, r.ok);
  } catch (e) {
    setStatus("invites-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveLeveling() {
  try {
    setStatus("leveling-status", "Saving…", true);
    const data = await saveConfig({
      levelingEnabled: document.getElementById("lvl-enabled")?.checked,
      levelUpChannelId: document.getElementById("level-up-channel")?.value || null,
      leveling: {
        enabled: document.getElementById("lvl-enabled")?.checked,
        levelUpMessages: document.getElementById("lvl-messages")?.checked,
        beansEnabled: document.getElementById("lvl-beans-enabled")?.checked,
        xpMin: Number(document.getElementById("lvl-xp-min")?.value) || 15,
        xpMax: Number(document.getElementById("lvl-xp-max")?.value) || 25,
        xpCooldownSeconds: Number(document.getElementById("lvl-xp-cd")?.value) || 60,
        beansBase: Number(document.getElementById("lvl-beans-base")?.value) || 0,
        beansLinear: Number(document.getElementById("lvl-beans-linear")?.value) || 0,
        beansQuadratic: Number(document.getElementById("lvl-beans-quad")?.value) || 0,
      },
    });
    const r = formatLogResult(data, "✅ Leveling saved.");
    setStatus("leveling-status", r.text, r.ok);
  } catch (e) {
    setStatus("leveling-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveCurrency() {
  try {
    setStatus("currency-status", "Saving…", true);
    const data = await saveConfig({
      currencyEnabled: document.getElementById("cur-enabled")?.checked,
      currency: {
        enabled: document.getElementById("cur-enabled")?.checked,
        currencyName: document.getElementById("cur-name")?.value || "Beans",
        currencyEmoji: document.getElementById("cur-emoji")?.value || "☕",
        dailyMin: Number(document.getElementById("cur-daily-min")?.value) || 150,
        dailyMax: Number(document.getElementById("cur-daily-max")?.value) || 300,
        dailyStreakBonus: Number(document.getElementById("cur-streak-bonus")?.value) || 25,
        dailyMaxStreak: Number(document.getElementById("cur-max-streak")?.value) || 7,
        workMin: Number(document.getElementById("cur-work-min")?.value) || 40,
        workMax: Number(document.getElementById("cur-work-max")?.value) || 120,
        workCooldownMinutes: Number(document.getElementById("cur-work-cd")?.value) || 30,
        chatCoinsEnabled: document.getElementById("cur-chat-enabled")?.checked,
        chatCoinChance: Number(document.getElementById("cur-chat-chance")?.value) || 8,
        chatCoinMin: Number(document.getElementById("cur-chat-min")?.value) || 5,
        chatCoinMax: Number(document.getElementById("cur-chat-max")?.value) || 20,
        chatCoinCooldownSeconds: Number(document.getElementById("cur-chat-cd")?.value) || 60,
        coinflipEnabled: document.getElementById("cur-flip-enabled")?.checked,
        coinflipMaxBet: Number(document.getElementById("cur-flip-max")?.value) || 0,
      },
    });
    const r = formatLogResult(data, "✅ Currency saved.");
    setStatus("currency-status", r.text, r.ok);
  } catch (e) {
    setStatus("currency-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveLogChannel() {
  try {
    setStatus("logs-status", "Saving…", true);
    const data = await saveConfig({ dashboardLogChannelId: document.getElementById("dashboard-log-channel")?.value || null });
    const r = formatLogResult(data, "✅ Log channel saved.");
    setStatus("logs-status", r.text, r.ok);
  } catch (e) {
    setStatus("logs-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function sendTestLog() {
  try {
    setStatus("logs-status", "Sending…", true);
    const data = await saveConfig({ testLog: true });
    const r = formatLogResult(data, "✅ Test log sent.");
    setStatus("logs-status", r.text, r.ok);
  } catch (e) {
    setStatus("logs-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function saveShopToggle() {
  try {
    setStatus("shop-status", "Saving…", true);
    const data = await saveConfig({ shopEnabled: document.getElementById("shop-enabled")?.checked });
    const r = formatLogResult(data, "✅ Shop toggle saved.");
    setStatus("shop-status", r.text, r.ok);
  } catch (e) {
    setStatus("shop-status", "❌ " + (e.message || "Failed"), false);
  }
}

async function addLevelRole() {
  const level = Number(document.getElementById("level-number")?.value);
  const roleId = document.getElementById("level-role")?.value;
  if (!level || !roleId) return alert("Pick level + role");
  try {
    await saveConfig({ setLevelRole: { level, roleId } });
    await loadGuildData();
  } catch (e) {
    alert(e.message || "Failed");
  }
}

function renderLevelRolesList() {
  const list = document.getElementById("level-roles-list");
  if (!list) return;
  const roles = (currentConfig && currentConfig.levelRoles) || {};
  const entries = Object.entries(roles).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (!entries.length) {
    list.innerHTML = "<p class=\"form-hint\">No level roles yet.</p>";
    return;
  }
  list.innerHTML = entries
    .map(([lvl, roleId]) => {
      const role = rolesCache.find((r) => r.id === roleId);
      return `<div class=\"level-role-row\">Level ${lvl} → ${role ? role.name : roleId} <button type=\"button\" data-remove-level=\"${lvl}\">Remove</button></div>`;
    })
    .join("");
  list.querySelectorAll("[data-remove-level]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await saveConfig({ removeLevelRole: btn.getAttribute("data-remove-level") });
        await loadGuildData();
      } catch (e) {
        alert(e.message || "Failed");
      }
    });
  });
}

function renderShopItems() {
  const list = document.getElementById("shop-items-list");
  if (!list) return;
  const items = (currentConfig && currentConfig.shop && currentConfig.shop.items) || [];
  if (!items.length) {
    list.innerHTML = "<p class=\"form-hint\">No shop items yet.</p>";
    return;
  }
  list.innerHTML = items
    .map((item, idx) => `<div class=\"level-role-row\">${item.name || item.type} — ${item.price || 0} <button type=\"button\" data-remove-shop=\"${idx}\">Remove</button></div>`)
    .join("");
  list.querySelectorAll("[data-remove-shop]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await saveConfig({ removeShopItem: Number(btn.getAttribute("data-remove-shop")) });
        await loadGuildData();
      } catch (e) {
        alert(e.message || "Failed");
      }
    });
  });
}

async function addShopItem() {
  const type = document.getElementById("shop-type")?.value || "role";
  const name = document.getElementById("shop-name")?.value?.trim();
  const price = Number(document.getElementById("shop-price")?.value);
  if (!name || !price) return alert("Name + price required");
  const item = { type, name, price, description: document.getElementById("shop-desc")?.value || "" };
  const meta = SHOP_TYPE_META[type] || {};
  if (meta.role) item.roleId = document.getElementById("shop-role")?.value || null;
  if (meta.duration) item.durationHours = Number(document.getElementById("shop-duration")?.value) || 24;
  if (meta.amount) item.amount = Number(document.getElementById("shop-amount")?.value) || 1;
  if (meta.title) item.titleText = document.getElementById("shop-title-text")?.value || "";
  try {
    await saveConfig({ addShopItem: item });
    await loadGuildData();
  } catch (e) {
    alert(e.message || "Failed");
  }
}

async function saveBirthday() {
  try {
    setStatus("birthday-status", "Saving…", true);
    const data = await saveConfig({
      birthday: {
        channelId: document.getElementById("bday-channel")?.value || null,
        pingRoleId: document.getElementById("bday-ping-role")?.value || null,
        birthdayRoleId: document.getElementById("bday-role")?.value || null,
        bonusBeans: Number(document.getElementById("bday-bonus")?.value) || 0,
      },
    });
    const r = formatLogResult(data, "✅ Birthday settings saved.");
    setStatus("birthday-status", r.text, r.ok);
  } catch (e) {
    setStatus("birthday-status", "❌ " + (e.message || "Save failed"), false);
  }
}

async function refreshStorageStatus() {
  const el = document.getElementById("storage-status");
  if (!el) return;
  el.textContent = "…";
  try {
    const res = await fetch("/api/bot-status", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      el.textContent = data.error ? "Error" : "Unknown";
      return;
    }
    const s = data.storage || data;
    if (s.label) el.textContent = s.label;
    else if (s.websitePostgres || s.usingPostgres) el.textContent = "Postgres ✓";
    else if (s.websiteHasDatabaseUrl === false && s.botHasDatabaseUrl === false) el.textContent = "File only ⚠️";
    else if (s.usingPostgres === false) el.textContent = "File fallback";
    else el.textContent = data.online ? "Online" : "Offline";
  } catch {
    el.textContent = "—";
  }
}


const DASHBOARD_TAB_KEYS = [
  "moderation", "invites", "leveling", "currency", "emojis",
  "shop", "logs", "birthday", "account", "owner-billing"
];

function applyDashboardTabs() {
  const preferences = currentConfig && currentConfig.dashboardTabs || {};
  const ownerNav = document.getElementById("nav-owner-billing");
  const ownerAvailable = !!(ownerNav && ownerNav.dataset.ownerAvailable === "true");

  DASHBOARD_TAB_KEYS.forEach((key) => {
    const enabled = preferences[key] !== false;
    const nav = document.querySelector('.nav-item[data-tab="' + key + '"]');
    const row = document.querySelector('[data-tab-pref-row="' + key + '"]');
    const checkbox = document.getElementById("dashboard-tab-" + key);

    if (checkbox) checkbox.checked = enabled;
    if (key === "owner-billing") {
      if (row) row.hidden = !ownerAvailable;
      if (nav) nav.hidden = !ownerAvailable || !enabled;
    } else if (nav) {
      nav.hidden = !enabled;
    }

    document.querySelectorAll('.quick-card[data-section-link="' + key + '"]').forEach((card) => {
      card.hidden = !enabled;
    });
  });

  const active = document.querySelector(".page-section.active");
  if (active && preferences[active.id] === false && typeof window.showSection === "function") {
    window.showSection("overview");
  }
}
window.applyDashboardTabs = applyDashboardTabs;

async function saveDashboardTabs() {
  const preferences = {};
  DASHBOARD_TAB_KEYS.forEach((key) => {
    const checkbox = document.getElementById("dashboard-tab-" + key);
    if (checkbox) preferences[key] = checkbox.checked;
  });
  const statusNode = document.getElementById("dashboard-tabs-status");
  if (statusNode) statusNode.textContent = "Saving tab layout…";
  try {
    await saveConfig({ dashboardTabs: preferences });
    applyDashboardTabs();
    if (statusNode) {
      statusNode.textContent = "Tab layout saved for this server.";
      statusNode.style.color = "#57F287";
    }
  } catch (error) {
    if (statusNode) {
      statusNode.textContent = "Could not save tab layout: " + (error.message || "Unknown error");
      statusNode.style.color = "#f23f43";
    }
  }
}

function previewCustomEmojiFile() {
  const file = document.getElementById("emoji-file")?.files?.[0];
  const preview = document.getElementById("emoji-import-preview");
  const image = document.getElementById("emoji-preview-image");
  const name = document.getElementById("emoji-preview-name");
  if (!file || !preview || !image) {
    if (preview) preview.hidden = true;
    return;
  }
  if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
    setStatus("custom-emoji-status", "Choose a PNG, JPG, GIF, or WebP image.", false);
    preview.hidden = true;
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    setStatus("custom-emoji-status", "For website uploads, choose an image smaller than 3 MB.", false);
    preview.hidden = true;
    return;
  }
  image.src = URL.createObjectURL(file);
  if (name) name.textContent = document.getElementById("emoji-name")?.value || file.name;
  preview.hidden = false;
}

function renderCustomEmojis(items) {
  const list = document.getElementById("custom-emoji-list");
  if (!list) return;
  list.replaceChildren();
  if (!Array.isArray(items) || !items.length) {
    const empty = document.createElement("p");
    empty.className = "form-hint";
    empty.textContent = "No saved custom emojis yet.";
    list.appendChild(empty);
    return;
  }
  items.forEach((emoji) => {
    const row = document.createElement("div");
    row.className = "custom-emoji-row";
    const image = document.createElement("img");
    image.src = "/api/config?resource=custom-emojis&imageId=" + encodeURIComponent(emoji.id);
    image.alt = ":" + emoji.name + ":";
    image.loading = "lazy";
    const details = document.createElement("div");
    details.className = "custom-emoji-details";
    const title = document.createElement("strong");
    title.textContent = ":" + emoji.name + ":";
    const category = document.createElement("span");
    category.textContent = emoji.category || "General";
    details.append(title, category);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button secondary";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deleteCustomEmoji(emoji.id, emoji.name));
    row.append(image, details, remove);
    list.appendChild(row);
  });
}

async function loadCustomEmojis() {
  const list = document.getElementById("custom-emoji-list");
  if (!list) return;
  try {
    const response = await fetch("/api/config?resource=custom-emojis", {
      credentials: "include", cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load custom emojis.");
    renderCustomEmojis(data.emojis || []);
    setStatus("custom-emoji-status", (data.emojis || []).length + " saved emoji(s) in the shared library.", true);
  } catch (error) {
    setStatus("custom-emoji-status", error.message || "Could not load custom emojis.", false);
  }
}

async function saveCustomEmoji() {
  const name = document.getElementById("emoji-name")?.value?.trim();
  const category = document.getElementById("emoji-category")?.value?.trim() || "General";
  const source = document.getElementById("emoji-source")?.value?.trim();
  const file = document.getElementById("emoji-file")?.files?.[0];
  if (!name) return setStatus("custom-emoji-status", "Give the emoji a name first.", false);
  if (!file && !source) return setStatus("custom-emoji-status", "Upload an image or paste a Pinterest pin link.", false);
  const button = document.getElementById("save-custom-emoji");
  if (button) button.disabled = true;
  setStatus("custom-emoji-status", "Saving emoji to the shared library…", true);
  try {
    const body = { name, category };
    if (file) {
      if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
        throw new Error("Use a PNG, JPG, GIF, or WebP image.");
      }
      if (file.size > 3 * 1024 * 1024) throw new Error("Choose an image smaller than 3 MB.");
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read that image."));
        reader.readAsDataURL(file);
      });
      body.contentType = file.type;
      body.imageBase64 = dataUrl.split(",")[1] || "";
    } else {
      body.pinUrl = source;
    }
    const response = await fetch("/api/config?resource=custom-emojis", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Emoji could not be saved.");
    document.getElementById("emoji-name").value = "";
    document.getElementById("emoji-source").value = "";
    document.getElementById("emoji-file").value = "";
    const preview = document.getElementById("emoji-import-preview");
    if (preview) preview.hidden = true;
    await loadCustomEmojis();
    setStatus("custom-emoji-status", "Saved :" + data.emoji.name + ": to the shared library.", true);
  } catch (error) {
    setStatus("custom-emoji-status", "Could not save emoji: " + (error.message || "Unknown error"), false);
  } finally {
    if (button) button.disabled = false;
  }
}

async function deleteCustomEmoji(id, name) {
  if (!confirm("Delete :" + name + ": from the shared emoji library?")) return;
  try {
    const response = await fetch("/api/config?resource=custom-emojis", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not delete emoji.");
    await loadCustomEmojis();
  } catch (error) {
    setStatus("custom-emoji-status", error.message || "Could not delete emoji.", false);
  }
}
