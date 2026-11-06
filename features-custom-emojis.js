(function () {
  "use strict";
  if (window.__customEmojiDashboardLoaded) return;
  window.__customEmojiDashboardLoaded = true;

  const style = document.createElement("style");
  style.textContent = `
    #custom-emojis .emoji-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:18px 0}
    #custom-emojis .emoji-toolbar input,#custom-emojis .emoji-import input{min-width:0}
    #custom-emojis .emoji-toolbar .emoji-search{flex:1 1 220px}
    #custom-emojis .emoji-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(142px,1fr));gap:12px;margin-top:16px}
    #custom-emojis .emoji-card{min-width:0;padding:14px;border:1px solid rgba(196,150,255,.16);border-radius:16px;background:linear-gradient(145deg,rgba(40,22,58,.72),rgba(20,14,31,.82));display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
    #custom-emojis .emoji-card img{width:64px;height:64px;object-fit:contain;image-rendering:auto}
    #custom-emojis .emoji-card strong{max-width:100%;overflow-wrap:anywhere}
    #custom-emojis .emoji-card small{color:var(--muted,#aaa);font-size:12px}
    #custom-emojis .emoji-card button{width:100%;margin-top:4px}
    #custom-emojis .emoji-import{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    #custom-emojis .emoji-import .full{grid-column:1/-1}
    #custom-emojis .emoji-drop{border:1px dashed rgba(208,160,255,.45);border-radius:16px;padding:18px;text-align:center;background:rgba(120,65,160,.08)}
    #custom-emojis .emoji-preview{width:74px;height:74px;object-fit:contain;margin:10px auto;display:none}
    #custom-emojis .emoji-empty{padding:32px 18px;text-align:center;border:1px dashed rgba(196,150,255,.2);border-radius:16px;color:var(--muted,#aaa)}
    #custom-emojis .emoji-count{color:var(--muted,#aaa);font-size:13px}
    #custom-emojis .emoji-pill{display:inline-flex;padding:5px 10px;border-radius:999px;background:rgba(180,120,255,.12);font-size:12px}
    @media(max-width:640px){#custom-emojis .emoji-import{grid-template-columns:1fr}#custom-emojis .emoji-import .full{grid-column:auto}#custom-emojis .emoji-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  const $ = (id) => document.getElementById(id);
  let emojiItems = [];
  let previewData = null;

  function guildId() {
    try {
      if (typeof selectedServer !== "undefined" && selectedServer?.id) return String(selectedServer.id);
    } catch (_) {}
    return String(window.selectedServer?.id || "");
  }

  function status(message, error) {
    const el = $("custom-emoji-status");
    if (!el) return;
    el.textContent = message || "";
    el.style.color = error ? "#f87171" : "#a78bfa";
  }

  async function api(method, body) {
    const id = guildId();
    if (!id) throw new Error("Choose a Discord server first.");
    const response = await fetch("/api/config?resource=custom-emojis&guildId=" + encodeURIComponent(id), {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Emoji request failed.");
    return data;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function render() {
    const grid = $("custom-emoji-grid");
    if (!grid) return;
    const query = ($("custom-emoji-search")?.value || "").trim().toLowerCase();
    const category = $("custom-emoji-filter")?.value || "__all";
    const filtered = emojiItems.filter((item) => {
      const matchesCategory = category === "__all" || item.category === category;
      const matchesQuery = !query || (item.name + " " + item.category).toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
    $("custom-emoji-count").textContent = emojiItems.length + " saved emoji" + (emojiItems.length === 1 ? "" : "s");
    if (!filtered.length) {
      grid.innerHTML = '<div class="emoji-empty" style="grid-column:1/-1">' +
        (emojiItems.length ? "No emojis match your search." : "No custom emojis yet. Import your first image above.") + "</div>";
      return;
    }
    grid.innerHTML = filtered.map((item) =>
      '<article class="emoji-card">' +
        '<img src="' + escapeHtml(item.url) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">' +
        '<strong>:' + escapeHtml(item.name) + ':</strong>' +
        '<small>' + escapeHtml(item.category || "General") + '</small>' +
        '<button class="button secondary" type="button" data-remove-emoji="' + escapeHtml(item.emojiId) + '">Remove</button>' +
      '</article>'
    ).join("");
    grid.querySelectorAll("[data-remove-emoji]").forEach((button) => {
      button.addEventListener("click", async () => {
        const item = emojiItems.find((entry) => entry.emojiId === button.dataset.removeEmoji);
        if (!item || !confirm("Delete :" + item.name + ": from this server?")) return;
        button.disabled = true;
        try {
          await api("DELETE", { emojiId: item.emojiId });
          await load();
          status("Emoji removed from this server.");
        } catch (error) {
          button.disabled = false;
          status(error.message, true);
        }
      });
    });
  }

  function renderCategories() {
    const select = $("custom-emoji-filter");
    if (!select) return;
    const current = select.value;
    const categories = [...new Set(emojiItems.map((item) => item.category || "General"))].sort();
    select.innerHTML = '<option value="__all">All categories</option>' +
      categories.map((name) => '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>').join("");
    if (categories.includes(current)) select.value = current;
  }

  async function load() {
    const id = guildId();
    if (!id) {
      emojiItems = [];
      renderCategories();
      render();
      status("Choose a server from the server selector to manage its emojis.", true);
      return;
    }
    status("Loading this server's emoji library…");
    try {
      const data = await api("GET");
      if (guildId() !== id) return;
      emojiItems = Array.isArray(data.emojis) ? data.emojis : [];
      renderCategories();
      render();
      status("Loaded " + emojiItems.length + " emoji(s).");
    } catch (error) {
      status(error.message, true);
    }
  }

  function inject() {
    const nav = document.querySelector(".navigation");
    const content = document.querySelector(".content");
    if (!nav || !content) return false;

    if (!nav.querySelector('[data-tab="custom-emojis"]')) {
      const button = document.createElement("button");
      button.className = "nav-item";
      button.type = "button";
      button.dataset.tab = "custom-emojis";
      button.title = "Custom Emojis";
      button.innerHTML = "<span>✨</span><em>Emojis</em>";
      button.addEventListener("click", () => {
        if (typeof window.showSection === "function") window.showSection("custom-emojis");
        else {
          document.querySelectorAll(".page-section").forEach((section) => section.classList.remove("active"));
          $("custom-emojis")?.classList.add("active");
          document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
        }
        load();
      });
      const settings = nav.querySelector('[data-tab="settings"]');
      nav.insertBefore(button, settings || null);
    }

    if (!$("custom-emojis")) {
      const section = document.createElement("section");
      section.id = "custom-emojis";
      section.className = "page-section";
      section.innerHTML =
        '<div class="card form-card wide">' +
          '<span class="eyebrow">EMOJI LIBRARY</span>' +
          '<h2>Custom Emojis</h2>' +
          '<p class="form-hint">Import images into this Discord server, organize them into categories, and let members browse them with one /emoji command. Every server has its own separate library.</p>' +
          '<div class="emoji-import">' +
            '<div class="emoji-drop full">' +
              '<strong>Upload an image</strong>' +
              '<p class="form-hint">PNG, JPG, GIF, or WebP · up to 256 KB</p>' +
              '<input id="custom-emoji-file" type="file" accept="image/png,image/jpeg,image/gif,image/webp">' +
              '<img id="custom-emoji-preview" class="emoji-preview" alt="Selected emoji preview">' +
            '</div>' +
            '<div class="input-group"><label for="custom-emoji-name">Emoji name</label><input id="custom-emoji-name" type="text" maxlength="32" placeholder="happy_cat"></div>' +
            '<div class="input-group"><label for="custom-emoji-category">Category</label><input id="custom-emoji-category" type="text" maxlength="80" placeholder="Reactions" value="General"></div>' +
            '<div class="input-group full"><label for="custom-emoji-pin">Or import from a Pinterest pin</label><input id="custom-emoji-pin" type="url" placeholder="https://www.pinterest.com/pin/..."><p class="form-hint">Use a public pin link. The bot extracts the image itself.</p></div>' +
            '<div class="full"><button class="button" id="custom-emoji-import" type="button">💾 Save to Emoji Library</button></div>' +
          '</div>' +
          '<p class="form-hint" id="custom-emoji-status" role="status"></p>' +
        '</div>' +
        '<div class="card form-card wide" style="margin-top:16px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><span class="eyebrow">YOUR COLLECTION</span><h2 style="margin-bottom:4px">Emoji Library</h2><span id="custom-emoji-count" class="emoji-count">0 saved emojis</span></div><span class="emoji-pill">Server-specific</span></div>' +
          '<div class="emoji-toolbar"><input class="emoji-search" id="custom-emoji-search" type="search" placeholder="Search names and categories…"><select id="custom-emoji-filter" aria-label="Filter category"><option value="__all">All categories</option></select><button class="button secondary" id="custom-emoji-refresh" type="button">Refresh</button></div>' +
          '<div id="custom-emoji-grid" class="emoji-grid"><div class="emoji-empty">Choose a server to load its emojis.</div></div>' +
        '</div>';
      content.appendChild(section);
    }

    $("custom-emoji-file")?.addEventListener("change", () => {
      const file = $("custom-emoji-file").files?.[0];
      previewData = null;
      const preview = $("custom-emoji-preview");
      if (!file) { preview.style.display = "none"; return; }
      if (!/^image\/(png|jpeg|gif|webp)$/i.test(file.type)) {
        status("Choose a PNG, JPG, GIF, or WebP image.", true);
        $("custom-emoji-file").value = "";
        return;
      }
      if (file.size > 256 * 1024) {
        status("That image is larger than 256 KB. Resize it before importing.", true);
        $("custom-emoji-file").value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        previewData = String(reader.result || "");
        preview.src = previewData;
        preview.style.display = "block";
        if (!$("custom-emoji-name").value) {
          $("custom-emoji-name").value = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 32);
        }
      };
      reader.readAsDataURL(file);
    });

    $("custom-emoji-search")?.addEventListener("input", render);
    $("custom-emoji-filter")?.addEventListener("change", render);
    $("custom-emoji-refresh")?.addEventListener("click", load);
    $("custom-emoji-import")?.addEventListener("click", async () => {
      const name = $("custom-emoji-name").value.trim();
      const category = $("custom-emoji-category").value.trim() || "General";
      const pinUrl = $("custom-emoji-pin").value.trim();
      if (!name) return status("Give the emoji a name first.", true);
      if (!previewData && !pinUrl) return status("Choose an image or paste a Pinterest pin link.", true);
      const button = $("custom-emoji-import");
      button.disabled = true;
      button.textContent = "Importing…";
      try {
        const payload = { name, category };
        if (previewData) {
          payload.imageBase64 = previewData;
          payload.contentType = $("custom-emoji-file").files?.[0]?.type || "";
        } else {
          payload.pinUrl = pinUrl;
        }
        await api("POST", payload);
        $("custom-emoji-file").value = "";
        $("custom-emoji-pin").value = "";
        $("custom-emoji-name").value = "";
        previewData = null;
        $("custom-emoji-preview").style.display = "none";
        await load();
        status("✨ Saved to this server’s Emoji Library!");
      } catch (error) {
        status(error.message, true);
      } finally {
        button.disabled = false;
        button.textContent = "💾 Save to Emoji Library";
      }
    });
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (inject() || attempts > 30) clearInterval(timer);
  }, 250);
  document.addEventListener("click", (event) => {
    const navButton = event.target.closest?.('[data-tab="custom-emojis"]');
    if (navButton) setTimeout(load, 0);
  });
})();
