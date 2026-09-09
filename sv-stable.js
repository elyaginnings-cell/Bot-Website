/**
 * Lightweight server-view helpers — channel/role menu + @mentions.
 * Safe: does not touch message send path or overall dashboard look.
 */
(function () {
  if (window.__svStableV5) return;
  window.__svStableV5 = true;

  function guildId() {
    if (window.selectedServer && window.selectedServer.id) return String(window.selectedServer.id);
    if (window.__svGuildId) return String(window.__svGuildId);
    return "";
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  async function postManage(path, body) {
    var gid = guildId();
    if (!gid) throw new Error("No server selected");
    var res = await fetch(path + (path.indexOf("?") >= 0 ? "&" : "?") + "guildId=" + encodeURIComponent(gid), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.assign({ guildId: gid }, body)),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
    return data;
  }

  async function loadRolesMeta() {
    var gid = guildId();
    if (!gid) return;
    try {
      var res = await fetch("/api/guilds?resource=meta&guildId=" + encodeURIComponent(gid) + "&_=" + Date.now(), {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      var data = await res.json().catch(function () { return {}; });
      if (res.ok) {
        if (Array.isArray(data.roles)) window.rolesCache = data.roles;
        if (Array.isArray(data.emojis)) window.emojisCache = data.emojis;
      }
    } catch (_) {}
  }

  function injectMenu() {
    var nameEl = document.getElementById("sv-server-name");
    if (!nameEl || document.getElementById("sv-server-menu-btn")) return;
    var parent = nameEl.parentNode;
    if (!parent) return;

    var wrap = document.createElement("div");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:4px;position:relative";
    parent.insertBefore(wrap, nameEl);
    wrap.appendChild(nameEl);

    var btn = document.createElement("button");
    btn.id = "sv-server-menu-btn";
    btn.type = "button";
    btn.textContent = "\u25BE";
    btn.title = "Server settings";
    btn.style.cssText = "background:transparent;border:0;color:#b5bac1;cursor:pointer;padding:4px 6px;border-radius:4px";
    wrap.appendChild(btn);

    var menu = document.createElement("div");
    menu.id = "sv-server-menu";
    menu.hidden = true;
    menu.style.cssText = "position:absolute;top:100%;left:0;min-width:220px;background:#111214;border:1px solid #1e1f22;border-radius:8px;padding:6px;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,.45)";
    function item(act, label) {
      return '<button type="button" data-act="' + act + '" style="display:block;width:100%;text-align:left;background:transparent;border:0;color:#dbdee1;padding:8px 10px;border-radius:4px;cursor:pointer;font-size:13px">' + label + "</button>";
    }
    menu.innerHTML =
      item("create-channel", "Create channel") +
      item("create-category", "Create category") +
      item("delete-channel", "Delete selected channel") +
      '<hr style="border:0;border-top:1px solid #1e1f22;margin:4px 0">' +
      item("create-role", "Create role") +
      item("delete-role", "Delete role\u2026");
    wrap.appendChild(menu);

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener("click", function () { menu.hidden = true; });
    menu.addEventListener("click", function (e) {
      e.stopPropagation();
      var t = e.target.closest("[data-act]");
      if (!t) return;
      menu.hidden = true;
      runAct(t.getAttribute("data-act"));
    });
  }

  async function runAct(act) {
    try {
      if (act === "create-channel") {
        var n = prompt("New text channel name:");
        if (!n) return;
        await postManage("/api/channel-manage", { action: "create", kind: "text", name: n });
        alert("Channel created");
        if (window.openServerView) window.openServerView();
      } else if (act === "create-category") {
        var c = prompt("New category name:");
        if (!c) return;
        await postManage("/api/channel-manage", { action: "create", kind: "category", name: c });
        alert("Category created");
        if (window.openServerView) window.openServerView();
      } else if (act === "delete-channel") {
        var active = document.querySelector("#sv-channel-list .sv-ch.active");
        var id = active && active.getAttribute("data-channel-id");
        if (!id) return alert("Select a channel first");
        if (!confirm("Delete this channel?")) return;
        await postManage("/api/channel-manage", { action: "delete", channelId: id });
        alert("Deleted");
        if (window.openServerView) window.openServerView();
      } else if (act === "create-role") {
        var r = prompt("New role name:");
        if (!r) return;
        await postManage("/api/channel-manage?resource=roles", { action: "create", name: r });
        alert("Role created");
        loadRolesMeta();
      } else if (act === "delete-role") {
        var rid = prompt("Paste the role ID to delete:");
        if (!rid) return;
        if (!confirm("Delete role " + rid + "?")) return;
        await postManage("/api/channel-manage?resource=roles", { action: "delete", roleId: rid.trim() });
        alert("Role deleted");
        loadRolesMeta();
      }
    } catch (err) {
      alert(err.message || "Failed");
    }
  }

  var box = null;
  function ensureBox() {
    if (box) return box;
    box = document.createElement("div");
    box.style.cssText = "position:fixed;z-index:99999;background:#2b2d31;border:1px solid #1e1f22;border-radius:8px;max-height:220px;overflow:auto;padding:4px;display:none";
    document.body.appendChild(box);
    return box;
  }

  function onKeyup(e) {
    var input = e.target;
    if (!input || input.id !== "sv-input") return;
    var val = input.value || "";
    var pos = input.selectionStart != null ? input.selectionStart : val.length;
    var before = val.slice(0, pos);
    var m = before.match(/@([A-Za-z0-9_.]*)$/);
    var b = ensureBox();
    if (!m) {
      b.style.display = "none";
      return;
    }
    var q = (m[1] || "").toLowerCase();
    var members = Array.isArray(window.membersCache) ? window.membersCache : [];
    var roles = Array.isArray(window.rolesCache) ? window.rolesCache : [];

    var memberHits = members.filter(function (mem) {
      if (!mem || !mem.id) return false;
      var name = String(mem.displayName || mem.username || "");
      return !q || name.toLowerCase().indexOf(q) >= 0;
    }).slice(0, 6);

    var roleHits = roles.filter(function (role) {
      if (!role || !role.id || role.name === "@everyone") return false;
      return !q || String(role.name || "").toLowerCase().indexOf(q) >= 0;
    }).slice(0, 4);

    if (!memberHits.length && !roleHits.length) {
      b.style.display = "none";
      return;
    }

    var html = "";
    memberHits.forEach(function (mem) {
      var name = mem.displayName || mem.username || mem.id;
      html +=
        '<button type="button" data-kind="user" data-id="' +
        esc(mem.id) +
        '" style="display:block;width:100%;text-align:left;background:transparent;border:0;color:#dbdee1;padding:8px;cursor:pointer">@' +
        esc(name) +
        (mem.bot ? " <span style=\"opacity:.6;font-size:11px">BOT</span>" : "") +
        "</button>";
    });
    roleHits.forEach(function (role) {
      var color =
        role.color && Number(role.color)
          ? "#" + ("000000" + (Number(role.color) >>> 0).toString(16)).slice(-6)
          : "#dbdee1";
      html +=
        '<button type="button" data-kind="role" data-id="' +
        esc(role.id) +
        '" style="display:block;width:100%;text-align:left;background:transparent;border:0;color:' +
        color +
        ';padding:8px;cursor:pointer">@' +
        esc(role.name) +
        "</button>";
    });
    b.innerHTML = html;

    var rect = input.getBoundingClientRect();
    b.style.left = Math.max(8, rect.left) + "px";
    b.style.bottom = window.innerHeight - rect.top + 6 + "px";
    b.style.width = Math.min(300, Math.max(200, rect.width)) + "px";
    b.style.display = "block";
    b.querySelectorAll("[data-id]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-id");
        var kind = btn.getAttribute("data-kind") || "user";
        var at = before.lastIndexOf("@");
        var token = kind === "role" ? "<@&" + id + "> " : "<@" + id + "> ";
        input.value = before.slice(0, at) + token + val.slice(pos);
        b.style.display = "none";
        input.focus();
      };
    });
  }

  function tick() {
    var view = document.getElementById("server-view");
    if (view && !view.hidden) {
      injectMenu();
      if (!window.rolesCache || !window.rolesCache.length) loadRolesMeta();
    }
  }

  document.addEventListener("keyup", onKeyup, true);
  setInterval(tick, 2000);
  tick();
  console.log("[sv-stable] v5 ready — settings menu + role/bot mentions");
})();
