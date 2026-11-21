/* Coffee Shop navigation — categorized café menu, searchable and collapsible. */
(function () {
  "use strict";
  if (window.__coffeeShopDesignSystemV4) return;
  window.__coffeeShopDesignSystemV4 = true;

  var groups = [
    { id:"moderation", label:"Moderation & Safety", items:["moderation","automod","punishment","verification"], open:true },
    { id:"community", label:"Community", items:["invites","birthday","achievements","emojis","custom-emojis","selfroles","suggestions","qotd","bump","profile","ideas","roles"], open:true },
    { id:"economy", label:"Economy & Games", items:["leveling","currency","beans","shop","fishing","chess","giveaways"], open:true },
    { id:"staff", label:"Staff & Support", items:["applications","apply","tickets","loa","activitycheck","logs"], open:true },
    { id:"ai", label:"AI & Automation", items:["ai","help","staff-ai","operator"], open:true },
    { id:"workspace", label:"Workspace", items:["overview","settings","account","owner-billing","systems"], open:true },
    { id:"server", label:"Server View", items:["server-view"], open:true }
  ];

  function groupFor(item) {
    var tab = item.getAttribute("data-tab") || "";
    if (item.id === "nav-server-view" || tab === "server-view") return "server";
    for (var i=0;i<groups.length;i++) if (groups[i].items.indexOf(tab) !== -1) return groups[i].id;
    return "community";
  }

  function setup() {
    var nav = document.querySelector(".navigation");
    if (!nav || nav.dataset.dsGrouped === "1") return;
    nav.dataset.dsGrouped = "1";
    var items = Array.prototype.slice.call(nav.querySelectorAll(":scope > .nav-item"));
    if (!items.length) return;

    var searchWrap = document.createElement("div");
    searchWrap.className = "ds-nav-search";
    searchWrap.innerHTML = '<label for="ds-nav-search">QUICK FIND</label><div class="ds-search-field"><span aria-hidden="true">⌕</span><input type="search" id="ds-nav-search" placeholder="Find a menu item…" autocomplete="off"></div>';
    nav.innerHTML = "";
    nav.appendChild(searchWrap);

    var groupNodes = {};
    groups.forEach(function (group) {
      var section = document.createElement("section");
      section.className = "ds-nav-group";
      section.dataset.group = group.id;
      section.dataset.navGroup = group.label;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "ds-nav-group-toggle";
      button.setAttribute("aria-expanded", group.open ? "true" : "false");
      button.innerHTML = '<span class="ds-nav-group-label">'+group.label+'</span><span class="ds-nav-group-meta"></span><span class="ds-nav-chevron" aria-hidden="true">⌄</span>';
      var list = document.createElement("div");
      list.className = "ds-nav-group-items";
      list.hidden = !group.open;
      button.addEventListener("click", function () {
        var open = button.getAttribute("aria-expanded") !== "true";
        button.setAttribute("aria-expanded", open ? "true" : "false");
        list.hidden = !open;
      });
      section.appendChild(button);
      section.appendChild(list);
      nav.appendChild(section);
      groupNodes[group.id] = { section:section, button:button, list:list };
    });

    items.forEach(function (item) {
      var target = groupNodes[groupFor(item)];
      if (target) target.list.appendChild(item);
    });

    function updateCounts() {
      Object.keys(groupNodes).forEach(function (id) {
        var g = groupNodes[id], count = g.list.querySelectorAll(".nav-item").length;
        g.section.hidden = count === 0;
        g.button.querySelector(".ds-nav-group-meta").textContent = count ? String(count) : "";
      });
    }
    updateCounts();

    var input = searchWrap.querySelector("input");
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      Object.keys(groupNodes).forEach(function (id) {
        var g = groupNodes[id], shown = 0;
        g.list.querySelectorAll(".nav-item").forEach(function (item) {
          var text = (item.textContent+" "+(item.title||"")+" "+(item.dataset.tab||"")).toLowerCase();
          var match = !q || text.indexOf(q) !== -1;
          item.hidden = !match;
          if (match) shown++;
        });
        g.section.hidden = shown === 0;
        if (q) { g.button.setAttribute("aria-expanded","true"); g.list.hidden = false; }
        g.button.querySelector(".ds-nav-group-meta").textContent = shown ? String(shown) : "";
      });
    });

    function revealActive() {
      nav.querySelectorAll(".ds-nav-group").forEach(function (section) {
        var active = !!section.querySelector(".nav-item.active");
        section.classList.toggle("has-active", active);
        if (active && !input.value) {
          var list = section.querySelector(".ds-nav-group-items");
          var button = section.querySelector(".ds-nav-group-toggle");
          if (list && button) { list.hidden = false; button.setAttribute("aria-expanded","true"); }
        }
      });
    }
    nav.addEventListener("click", function (event) {
      if (event.target.closest(".nav-item")) setTimeout(revealActive, 0);
    });
    items.forEach(function (item) { item.addEventListener("click", function () { setTimeout(revealActive, 0); }); });
    revealActive();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once:true });
  else setup();
})();
