/* Coffee Shop navigation — categorized, searchable, collapsible groups. */
(function () {
  "use strict";
  if (window.__coffeeShopDesignSystemV3) return;
  window.__coffeeShopDesignSystemV3 = true;

  var groups = [
    { id:"overview", label:"Workspace", items:["overview"], open:true },
    { id:"moderation", label:"Safety & moderation", items:["moderation","verification","logs","apply","applications"], open:true },
    { id:"community", label:"Community", items:["invites","leveling","birthday","bump","suggestions","qotd"], open:true },
    { id:"engagement", label:"Member experience", items:["tickets","selfroles","ideas","roles"], open:false },
    { id:"economy", label:"Economy", items:["currency","shop","beans"], open:false },
    { id:"settings", label:"Configuration", items:["settings","systems","automod","custom-emojis","emojis"], open:false },
    { id:"server", label:"Server tools", items:["server-view"], open:false }
  ];

  function groupFor(item) {
    var tab = item.getAttribute("data-tab") || "";
    if (item.id === "nav-server-view") return "server";
    for (var i=0;i<groups.length;i++) if (groups[i].items.indexOf(tab) !== -1) return groups[i].id;
    return "engagement";
  }

  function setup() {
    var nav = document.querySelector(".navigation");
    if (!nav || nav.dataset.dsGrouped === "1") return;
    nav.dataset.dsGrouped = "1";

    var items = Array.prototype.slice.call(nav.querySelectorAll(":scope > .nav-item"));
    if (!items.length) return;

    var searchWrap = document.createElement("div");
    searchWrap.className = "ds-nav-search";
    searchWrap.innerHTML = '<label for="ds-nav-search">QUICK FIND</label><div class="ds-search-field"><span aria-hidden="true">⌕</span><input type="search" id="ds-nav-search" placeholder="Search sections…" autocomplete="off"></div>';
    nav.innerHTML = "";
    nav.appendChild(searchWrap);

    var groupNodes = {};
    groups.forEach(function (group) {
      var section = document.createElement("section");
      section.className = "ds-nav-group";
      section.dataset.group = group.id;
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

    var fallback = document.createElement("section");
    fallback.className = "ds-nav-group";
    fallback.dataset.group = "other";
    fallback.innerHTML = '<button type="button" class="ds-nav-group-toggle" aria-expanded="false"><span class="ds-nav-group-label">More</span><span class="ds-nav-group-meta"></span><span class="ds-nav-chevron" aria-hidden="true">⌄</span></button><div class="ds-nav-group-items" hidden></div>';
    fallback.querySelector("button").addEventListener("click", function () {
      var b=this, list=fallback.querySelector(".ds-nav-group-items");
      var open=b.getAttribute("aria-expanded")!=="true";
      b.setAttribute("aria-expanded",open?"true":"false"); list.hidden=!open;
    });
    nav.appendChild(fallback);

    items.forEach(function (item) {
      var id=groupFor(item), target=groupNodes[id];
      if(!target){target={list:fallback.querySelector(".ds-nav-group-items")};}
      target.list.appendChild(item);
    });

    function updateCounts() {
      Object.keys(groupNodes).forEach(function (id) {
        var g=groupNodes[id], count=g.list.querySelectorAll(".nav-item").length;
        g.section.hidden=count===0;
        g.button.querySelector(".ds-nav-group-meta").textContent=count?String(count):"";
      });
      var extra=fallback.querySelectorAll(".nav-item").length;
      fallback.hidden=extra===0;
      fallback.querySelector(".ds-nav-group-meta").textContent=extra?String(extra):"";
    }
    updateCounts();

    var input=searchWrap.querySelector("input");
    input.addEventListener("input",function(){
      var q=input.value.trim().toLowerCase();
      Object.keys(groupNodes).forEach(function(id){
        var g=groupNodes[id], shown=0;
        g.list.querySelectorAll(".nav-item").forEach(function(item){
          var text=(item.textContent+" "+(item.title||"")+" "+(item.dataset.tab||"")).toLowerCase();
          var match=!q||text.indexOf(q)!==-1;
          item.hidden=!match; if(match)shown++;
        });
        g.section.hidden=shown===0;
        if(q){g.button.setAttribute("aria-expanded","true");g.list.hidden=false;}
        else {g.button.setAttribute("aria-expanded",g.list.hidden?"false":"true");}
        g.button.querySelector(".ds-nav-group-meta").textContent=shown?String(shown):"";
      });
      var extra=fallback.querySelectorAll(".nav-item"), visible=0;
      extra.forEach(function(item){var match=!q||(item.textContent+" "+(item.title||"")+" "+(item.dataset.tab||"")).toLowerCase().indexOf(q)!==-1;item.hidden=!match;if(match)visible++;});
      fallback.hidden=visible===0;
      if(q&&visible){fallback.querySelector("button").setAttribute("aria-expanded","true");fallback.querySelector(".ds-nav-group-items").hidden=false;}
    });

    nav.addEventListener("click",function(event){
      if(event.target.closest(".nav-item")){
        nav.querySelectorAll(".ds-nav-group").forEach(function(section){
          var active=!!section.querySelector(".nav-item.active");
          section.classList.toggle("has-active",active);
          if(active && !input.value){var list=section.querySelector(".ds-nav-group-items"),button=section.querySelector(".ds-nav-group-toggle");if(list&&button){list.hidden=false;button.setAttribute("aria-expanded","true");}}
        });
      }
    });
    nav.querySelectorAll(".nav-item").forEach(function(item){
      item.addEventListener("click",function(){
        nav.querySelectorAll(".ds-nav-group").forEach(function(section){
          var active=!!section.querySelector(".nav-item.active");
          section.classList.toggle("has-active",active);
          if(active){var list=section.querySelector(".ds-nav-group-items"),button=section.querySelector(".ds-nav-group-toggle");if(list&&button){list.hidden=false;button.setAttribute("aria-expanded","true");}}
        });
      });
    });
    var activeGroup=nav.querySelector(".nav-item.active");
    if(activeGroup){var parent=activeGroup.closest(".ds-nav-group");if(parent){var list=parent.querySelector(".ds-nav-group-items"),button=parent.querySelector(".ds-nav-group-toggle");if(list&&button){list.hidden=false;button.setAttribute("aria-expanded","true");parent.classList.add("has-active");}}}
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});
  else setup();
})();
