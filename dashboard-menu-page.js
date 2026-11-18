/* Dedicated Coffee Shop menu page + home/menu navigation. */
(function(){
"use strict";
if(window.__coffeeShopMenuPageV2)return;window.__coffeeShopMenuPageV2=true;
var $=id=>document.getElementById(id);
function content(){return document.querySelector(".content")}
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
 var host=content();if(!host||$("menu"))return;
 var section=document.createElement("section");section.id="menu";section.className="page-section cafe-menu-page";
 section.innerHTML='<div class="page-heading"><span class="eyebrow">FRESH FROM THE COUNTER</span><h2>The Menu</h2><p>Choose a station in your Coffee Shop. Each station opens its own full configuration workspace.</p></div><div class="cafe-menu-page-groups" id="cafe-menu-page-groups"></div><div class="cafe-menu-page-footer"><button class="button" type="button" data-menu-home>← Back Home</button></div>';
 var overview=$("overview");if(overview&&overview.nextSibling)host.insertBefore(section,overview.nextSibling);else host.appendChild(section)
}
function buildMenu(){
 var root=$("cafe-menu-page-groups"),nav=$("dashboard-navigation");if(!root||!nav)return;
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
  invites:"Community",birthday:"Community",achievements:"Community",emojis:"Community",selfroles:"Community",suggestions:"Community",qotd:"Community",bump:"Community",profile:"Community",analytics:"Community",
  leveling:"Economy & Games",currency:"Economy & Games",shop:"Economy & Games",fishing:"Economy & Games",chess:"Economy & Games",giveaways:"Economy & Games",
  applications:"Staff & Support",tickets:"Staff & Support",loa:"Staff & Support",activitycheck:"Staff & Support",logs:"Staff & Support",
  ai:"AI & Automation",help:"AI & Automation",
  settings:"Workspace",account:"Workspace","owner-billing":"Workspace"
 };
 nav.querySelectorAll("[data-tab]").forEach(button=>{
  if(button.hidden)return;
  var id=button.getAttribute("data-tab");
  if(!id||id==="overview"||id==="systems")return;
  var category=categoryByTab[id]||"Community";
  var item={id,label:button.querySelector("em")?.textContent||button.title||id,icon:button.querySelector("span")?.textContent||"☕",desc:"Open "+(button.title||id)+" settings"};
  groups[category].push(item)
 });
 var serverView=$("nav-server-view");if(serverView&&!serverView.hidden)groups["Server View"].push({id:"server-view",label:"Chat",icon:"💬",desc:"Open your live server view"});
