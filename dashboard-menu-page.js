/* Coffee Shop menu page: a real menu-style catalog, separate from Tab Manager. */
(function () {
  "use strict";
  if (window.__coffeeShopMenuPageV2) return;
  window.__coffeeShopMenuPageV2 = true;

  var $ = function (id) { return document.getElementById(id); };
  var groups = [
    {
      title: "Community Counter",
      subtitle: "The everyday favorites that keep your community moving.",
      mark: "01 · COMMUNITY",
      items: [
        ["invites","📨","Invite Tracking","Welcome new people and see how they found you.","TODAY'S SPECIAL"],
        ["leveling","📈","Levels & XP","Celebrate activity with levels, roles, and rewards.","COMMUNITY FAVORITE"],
        ["birthday","🎂","Birthdays","Make members feel remembered on their special day.",""],
        ["verification","✅","Member Verification","Give new arrivals a clear, safe way inside.",""],
        ["suggestions","💡","Suggestions","Collect ideas and let your community have a say.",""],
        ["qotd","💭","Question of the Day","Give the conversation a fresh starting point.",""],
        ["selfroles","🎭","Self Roles","Let members choose the roles that fit them.",""],
        ["bump","📢","Bump Rewards","Reward members for helping your server get discovered.",""],
        ["analytics","📊","Analytics","See the activity and trends behind your community.",""],
        ["achievements","🏆","Achievements","Give milestones a little extra celebration.","DISCORD FEATURE"],
        ["profile","👤","Member Profiles","A little more personality for every member.","DISCORD FEATURE"],
        ["memberPresence","👁️","Member Presence","Keep track of the community's presence settings.","DISCORD FEATURE"]
      ]
    },
    {
      title: "Coffee, Coins & Games",
      subtitle: "A little fun, a little friendly competition, and something to spend.",
      mark: "02 · THE FUN STUFF",
      items: [
        ["currency","☕","Beans & Economy","Daily claims, chat earnings, balances, and rewards.","HOUSE FAVORITE"],
        ["shop","🛍️","Community Shop","Stock the shelves with things members can purchase.",""],
        ["chess","♟️","Chess Lounge","Play chess in Discord with your community.","DISCORD FEATURE"],
        ["fishing","🎣","Fishing","Take a break and see what the waters bring.","DISCORD FEATURE"],
        ["giveaways","🎉","Giveaways","Make community celebrations a little bigger.","DISCORD FEATURE"]
      ]
    },
    {
      title: "Safety & Staff Desk",
      subtitle: "The people, tools, and guardrails that help a server run smoothly.",
      mark: "03 · STAFF PICKS",
      items: [
        ["moderation","⚖️","Moderation","Warnings, actions, and day-to-day server care.",""],
        ["automod","🛡️","Auto Moderation","Catch unwanted behavior with automatic safeguards.",""],
        ["punishment","🔨","Warnings & Punishments","Keep moderation history and consequences organized.","DISCORD FEATURE"],
        ["tickets","🎫","Support Tickets","Give members a private place to ask for help.",""],
        ["applications","📝","Applications","Collect and review staff or community applications.",""],
        ["activitycheck","📋","Staff Activity Check","Check in with your staff team and availability.",""],
        ["loa","🏖️","Leave of Absence","Keep track of staff time away.",""],
        ["logs","📚","Message & Event Logs","Keep an organized record of important server events.",""],
        ["auditLog","📜","Audit Log","Review important administrative activity.","DISCORD FEATURE"]
      ]
    },
    {
      title: "AI Corner",
      subtitle: "Helpful automation and AI-powered support for your server.",
      mark: "04 · THE AI CORNER",
      items: [
        ["aichat","🤖","AI Chat","Give members an AI-powered place to ask questions.",""],
        ["aistaff","☕","AI Staff Operator","Help staff with server operations and workflows.",""]
      ]
    },
    {
      title: "Behind the Counter",
      subtitle: "Your dashboard, account, and server-wide feature switches.",
      mark: "05 · WORKSPACE",
      items: [
        ["systems","🎛️","Feature Controls","Choose which bot features are active in this server.","CONTROL BOARD"],
        ["settings","⚙️","Dashboard Settings","Adjust your dashboard preferences.",""],
        ["account","👤","Account & Subscription","Manage your account and connected servers.",""],
        ["owner-billing","🧾","Owner Billing","Manage plans and customer billing.","OWNER ONLY"]
      ]
    },
    {
      title: "The Live Room",
      subtitle: "Step into your server and see the conversation.",
      mark: "06 · LIVE",
      items: [
        ["server-view","💬","Server View","Open the live server chat and member view.","LIVE"]
      ]
    }
  ];

  function activeId() {
    return document.querySelector(".page-section.active")?.id || "overview";
  }
  function show(id) {
    if (id === "server-view") {
      var serverButton = $("nav-server-view") || $("open-server-view");
      if (serverButton) serverButton.click();
      return;
    }
    if (typeof window.showSection === "function") window.showSection(id);
    else {
      var nav = document.querySelector('#dashboard-navigation [data-tab="' + id + '"]');
      if (nav) nav.click();
      else document.querySelectorAll(".page-section").forEach(function (section) {
        section.classList.toggle("active", section.id === id);
      });
    }
    window.setTimeout(sync, 40);
  }
  function ensureButton() {
    var actions = document.querySelector(".header-actions");
    if (!actions || $("dashboard-see-menu")) return;
    var button = document.createElement("button");
    button.type = "button";
    button.id = "dashboard-see-menu";
    button.className = "button secondary dashboard-see-menu";
    button.textContent = "See Menu";
    button.addEventListener("click", function () {
      show(activeId() === "menu" ? "overview" : "menu");
    });
    actions.insertBefore(button, actions.firstChild);
  }
  function ensureSection() {
    var host = document.querySelector(".content");
    if (!host || $("menu")) return;
    var section = document.createElement("section");
    section.id = "menu";
    section.className = "page-section cafe-menu-page";
    section.innerHTML =
      '<div class="cafe-menu-intro">' +
        '<span class="eyebrow">FRESH FROM THE COUNTER</span>' +
        '<div class="cafe-menu-intro-line"><div><h2>The Menu</h2><p>Find your next favorite corner of the Coffee Shop.</p></div>' +
        '<span class="cafe-menu-intro-stamp">MADE FOR<br>YOUR COMMUNITY</span></div>' +
      '</div>' +
      '<section class="cafe-menu-featured" aria-label="House favorites">' +
        '<div class="cafe-menu-featured-heading"><span>HOUSE FAVORITES</span><small>A good place to start</small></div>' +
        '<div class="cafe-menu-featured-grid" id="cafe-menu-featured"></div>' +
      '</section>' +
      '<div class="cafe-menu-page-groups" id="cafe-menu-page-groups"></div>' +
      '<div class="cafe-menu-page-footer"><span>BREWED FOR YOUR COMMUNITY</span><button class="button" type="button" data-menu-home>← Back Home</button></div>';
    var overview = $("overview");
    if (overview && overview.nextSibling) host.insertBefore(section, overview.nextSibling);
    else host.appendChild(section);
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char];
    });
  }
  function navItem(id) {
    if (id === "server-view") return $("nav-server-view") || $("open-server-view");
    var aliases = { "logs":"logs", "emojis":"emojis" };
    return document.querySelector('#dashboard-navigation [data-tab="' + (aliases[id] || id) + '"]');
  }
  function itemMarkup(item) {
    var id = item[0], button = navItem(id), isDiscordOnly = item[5] === "DISCORD FEATURE";
    if (!button && !isDiscordOnly) return "";
    if (button && button.hidden) return "";
    var icon = button ? (button.querySelector("span")?.textContent || item[1]) : item[1];
    var label = button ? (button.querySelector("em")?.textContent || item[2]) : item[2];
    var tag = item[5] ? '<small class="cafe-menu-item-tag">' + escapeHtml(item[5]) + '</small>' : "";
    var inner =
      '<span class="cafe-menu-item-icon">' + escapeHtml(icon) + '</span>' +
      '<span class="cafe-menu-item-copy">' + tag +
        '<strong>' + escapeHtml(label) + '</strong>' +
        '<small class="cafe-menu-item-description">' + escapeHtml(item[3]) + '</small>' +
      '</span>' +
      '<span class="cafe-menu-item-price">' + (isDiscordOnly ? "IN DISCORD" : "OPEN ↗") + '</span>';
    if (isDiscordOnly) return '<div class="cafe-menu-item is-discord-only">' + inner + '</div>';
    return '<button type="button" class="cafe-menu-item" data-menu-target="' + escapeHtml(id) + '">' + inner + '</button>';
  }
  function buildMenu() {
    var root = $("cafe-menu-page-groups");
    var featured = $("cafe-menu-featured");
    if (!root) return;
    var html = groups.map(function (group) {
      var cards = group.items.map(itemMarkup).filter(Boolean);
      if (!cards.length) return "";
      return '<section class="cafe-menu-category">' +
        '<div class="cafe-menu-category-heading"><span class="cafe-menu-category-mark">' + escapeHtml(group.mark) + '</span>' +
          '<h3>' + escapeHtml(group.title) + '</h3><p>' + escapeHtml(group.subtitle) + '</p></div>' +
        '<div class="cafe-menu-category-items">' + cards.join("") + '</div>' +
      '</section>';
    }).join("");
    root.innerHTML = html;
    if (featured) {
      var picks = [
        ["moderation","⚖️","Moderation Desk","A safer, calmer server."],
        ["currency","☕","Beans Counter","Rewards and daily claims."],
        ["shop","🛍️","Community Shop","A little something to spend beans on."]
      ].map(function (pick) {
        var button = navItem(pick[0]);
        if (!button || button.hidden) return "";
        return '<button type="button" class="cafe-menu-featured-card" data-menu-target="' + pick[0] + '">' +
          '<span class="cafe-menu-featured-icon">' + pick[1] + '</span><span><strong>' + pick[2] + '</strong><small>' + pick[3] + '</small></span><b>↗</b></button>';
      }).filter(Boolean);
      featured.innerHTML = picks.join("");
      featured.closest(".cafe-menu-featured").hidden = !picks.length;
    }
  }
  function sync() {
    var id = activeId();
    document.body.dataset.dashboardPage = id;
    var button = $("dashboard-see-menu");
    if (button) button.textContent = id === "menu" ? "Home" : "See Menu";
    if (id === "menu") buildMenu();
    var sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.setAttribute("aria-hidden", "true");
  }
  document.addEventListener("click", function (event) {
    var target = event.target?.closest?.("[data-menu-target]");
    if (target) {
      event.preventDefault();
      show(target.dataset.menuTarget);
      return;
    }
    if (event.target?.closest?.("[data-menu-home]")) {
      show("overview");
      return;
    }
    if (event.target?.closest?.('[data-section-link="menu"]')) {
      event.preventDefault();
      show("menu");
      return;
    }
    if (event.target?.closest?.("[data-tab]")) window.setTimeout(sync, 80);
  }, true);
  var originalShowSection = window.showSection;
  if (typeof originalShowSection === "function" && !originalShowSection.__coffeeMenuWrapped) {
    window.showSection = function () {
      var result = originalShowSection.apply(this, arguments);
      window.setTimeout(sync, 25);
      return result;
    };
    window.showSection.__coffeeMenuWrapped = true;
  }
  function mount() {
    ensureButton();
    ensureSection();
    sync();
  }
  [0, 250, 800, 1800, 4000, 8000].forEach(function (delay) { window.setTimeout(mount, delay); });
  var polls = 0;
  var poll = window.setInterval(function () {
    if (activeId() === "menu") buildMenu();
    if (++polls >= 40) window.clearInterval(poll);
  }, 500);
  window.addEventListener("dashboard:guild-loaded", function () { if (activeId() === "menu") buildMenu(); });
})();
