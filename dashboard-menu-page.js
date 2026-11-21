/* Dedicated Coffee Shop menu page + home/menu navigation. */
(function(){
"use strict";
if(window.__coffeeShopMenuPageV3)return;window.__coffeeShopMenuPageV3=true;
var $=id=>document.getElementById(id);
function contentHost(){return document.querySelector(".content")}
function activeId(){return document.querySelector(".page-section.active")?.id||"overview"}
function show(id){
 if(typeof window.showSection==="function")window.showSection(id);
 else{
  var nav=document.querySelector('#dashboard-navigation [data-tab="'+id+'"]');
  if(nav)nav.click();
  else document.querySelectorAll(".page-section").forEach(s=>s.classList.toggle("active",s.id===id));
 }
 setTimeout(sync,40)
}
function ensureButton(){
 var actions=document.querySelector(".header-actions");if(!actions||$("dashboard-see-menu"))return;
 var b=document.createElement("button");b.type="button";b.id="dashboard-see-menu";b.className="button secondary dashboard-see-menu";b.textContent="See Menu";b.addEventListener("click",()=>show(activeId()==="menu"?"overview":"menu"));actions.insertBefore(b,actions.firstChild)
}
function ensureSection(){
 var host=contentHost();if(!host||$("menu"))return;
 var section=document.createElement("section");section.id="menu";section.className="page-section cafe-menu-page";
 section.innerHTML='<div class="page-heading"><span class="eyebrow">FRESH FROM THE COUNTER</span><h2>The Menu</h2><p>Browse the stations in your Coffee Shop. Choose a category to open its configuration workspace.</p></div><div class="cafe-menu-page-groups" id="cafe-menu-page-groups"></div><div class="cafe-menu-page-footer"><button class="button" type="button" data-menu-home>← Back Home</button></div>';
 var overview=$("overview");if(overview&&overview.nextSibling)host.insertBefore(section,overview.nextSibling);else host.appendChild(section)
}
function buildMenu(){
 var root=$("cafe-menu-page-groups"),nav=$("dashboard-navigation");if(!root||!nav)return;
 var signature=Array.from(nav.querySelectorAll("[data-tab]")).filter(b=>!b.hidden).map(b=>[b.dataset.tab,b.title,b.querySelector("em")?.textContent||"",b.querySelector("span")?.textContent||""].join("|")).join("~")+"|"+!!($("nav-server-view")&&!$("nav-server-view").hidden);
 if(root.dataset.signature===signature)return;
 var groups={
  "Moderation & Safety":[],
  "Community":[],
  "Economy & Games":[],
  "Staff & Support":[],
  "AI & Automation":[],
  "Workspace":[],
  "Server View":[]
 };
 var categoryByTab={
  moderation:"Moderation & Safety",automod:"Moderation & Safety",punishment:"Moderation & Safety",verification:"Moderation & Safety",
  invites:"Community",birthday:"Community",achievements:"Community",emojis:"Community","custom-emojis":"Community",selfroles:"Community",suggestions:"Community",qotd:"Community",bump:"Community",profile:"Community",analytics:"Community",
  leveling:"Economy & Games",currency:"Economy & Games",shop:"Economy & Games",fishing:"Economy & Games",chess:"Economy & Games",giveaways:"Economy & Games",
  applications:"Staff & Support",tickets:"Staff & Support",loa:"Staff & Support",activitycheck:"Staff & Support",logs:"Staff & Support",logging:"Staff & Support",
  ai:"AI & Automation",aichat:"AI & Automation",staffai:"AI & Automation",aistaff:"AI & Automation",help:"AI & Automation",
  settings:"Workspace",account:"Workspace","owner-billing":"Workspace"
 };
 nav.querySelectorAll("[data-tab]").forEach(button=>{
  var id=button.getAttribute("data-tab");
  if(!id||id==="overview"||id==="systems")return;
  // Feature tabs disappear from the rail when their system is disabled.
  // Keep them discoverable here so owners can still open and configure them.
  if(id==="owner-billing"&&button.hidden)return;
  if(!document.getElementById(id))return;
  var category=categoryByTab[id]||"Community";
  var label=button.querySelector("em")?.textContent||button.title||id;
  var item={id:id,label:label,icon:button.querySelector("span")?.textContent||"☕",desc:button.hidden?"Currently disabled · open to configure":"Open "+(button.title||label)+" settings"};
  groups[category].push(item);
 });
 groups["Workspace"].push({id:"systems",label:"System Controls",icon:"⚙️",desc:"Enable or disable every server system"});
 var serverView=$("nav-server-view");
 if(serverView&&!serverView.hidden)groups["Server View"].push({id:"server-view",label:"Chat",icon:"💬",desc:"Open your live server view"});
 root.innerHTML=Object.keys(groups).map(category=>{
  var items=groups[category];if(!items.length)return "";
  return '<section class="cafe-menu-page-group"><h3>'+category+'</h3><div class="cafe-menu-page-grid">'+items.map(item=>'<button type="button" class="cafe-menu-page-item" data-menu-target="'+item.id+'"><span class="cafe-menu-page-icon">'+item.icon+'</span><span><strong>'+item.label+'</strong><small>'+item.desc+'</small></span><span class="cafe-menu-page-arrow">↗</span></button>').join("")+'</div></section>';
 }).join("");
 root.dataset.signature=signature;
}
function sync(){
 var id=activeId(),button=$("dashboard-see-menu");document.body.dataset.dashboardPage=id;
 if(button)button.textContent=id==="menu"?"Home":"See Menu";
 if(id==="menu")buildMenu();
 var side=document.querySelector(".sidebar");if(side)side.setAttribute("aria-hidden","true");
}
window.addEventListener("dashboard:guild-loaded",()=>{if(activeId()==="menu"){var root=$("cafe-menu-page-groups");if(root)delete root.dataset.signature;buildMenu()}});
document.addEventListener("click",e=>{
 var target=e.target?.closest?.("[data-menu-target]");
 if(target){var id=target.dataset.menuTarget;if(id==="server-view")$("nav-server-view")?.click();else show(id);return}
 if(e.target?.closest?.("[data-menu-home]")){show("overview");return}
 if(e.target?.closest?.("[data-open-feature-manager]")){show("systems");return}
 if(e.target?.closest?.('[data-section-link="menu"]')){e.preventDefault();show("menu")}
 if(e.target?.closest?.("[data-tab]"))setTimeout(sync,80);
},true);
var original=window.showSection;
if(typeof original==="function"&&!original.__coffeeMenuWrapped){window.showSection=function(){var result=original.apply(this,arguments);setTimeout(sync,25);return result};window.showSection.__coffeeMenuWrapped=true}
function mount(){ensureButton();ensureSection();sync()}
function init(){mount();var nav=$("dashboard-navigation");if(nav&&window.MutationObserver){var observer=new MutationObserver(function(records){var changed=records.some(function(record){return Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).some(function(node){return node.nodeType===1&&(node.matches?.("[data-tab],.nav-item")||node.querySelector?.("[data-tab],.nav-item"))})});if(changed){var root=$("cafe-menu-page-groups");if(root)delete root.dataset.signature;if(activeId()==="menu")buildMenu()}});observer.observe(nav,{childList:true,subtree:true});}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();