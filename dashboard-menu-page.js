/* Dedicated Coffee Shop menu page + home/menu navigation. */
(function(){
"use strict";
if(window.__coffeeShopMenuPageV1)return;window.__coffeeShopMenuPageV1=true;
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
 var groups={"Server Systems":[],"Workspace":[],"Server View":[]};
 nav.querySelectorAll("[data-tab]").forEach(button=>{
  if(button.hidden)return;var id=button.getAttribute("data-tab");if(!id||id==="overview")return;
  var item={id,label:button.querySelector("em")?.textContent||button.title||id,icon:button.querySelector("span")?.textContent||"☕",desc:"Open "+(button.title||id)+" settings"};
  if(["settings","account","systems","owner-billing"].includes(id))groups.Workspace.push(item);else groups["Server Systems"].push(item)
 });
 var serverView=$("nav-server-view");if(serverView&&!serverView.hidden)groups["Server View"].push({id:"server-view",label:"Chat",icon:"💬",desc:"Open your live server view"});
 root.innerHTML=Object.keys(groups).map(category=>{
  var items=groups[category];if(!items.length)return "";
  return '<section class="cafe-menu-page-group"><h3>'+category+'</h3><div class="cafe-menu-page-grid">'+items.map(item=>'<button type="button" class="cafe-menu-page-item" data-menu-target="'+item.id+'"><span class="cafe-menu-page-icon">'+item.icon+'</span><span><strong>'+item.label+'</strong><small>'+item.desc+'</small></span><span class="cafe-menu-page-arrow">↗</span></button>').join("")+'</div></section>'
 }).join("")
}
function sync(){
 var id=activeId(),button=$("dashboard-see-menu");document.body.dataset.dashboardPage=id;
 if(button)button.textContent=id==="menu"?"Home":"See Menu";
 var heading=document.querySelector("#menu .page-heading");
 if(id==="menu")buildMenu();
 var side=document.querySelector(".sidebar");if(side)side.setAttribute("aria-hidden","true")
}
document.addEventListener("click",e=>{
 var target=e.target?.closest?.("[data-menu-target]");if(target){var id=target.dataset.menuTarget;if(id==="server-view")$("nav-server-view")?.click();else show(id);return}
 if(e.target?.closest?.("[data-menu-home]")){show("overview");return}
 if(e.target?.closest?.('[data-section-link="menu"]')){e.preventDefault();show("menu")}
 if(e.target?.closest?.('[data-tab]'))setTimeout(sync,80)
},true);
var original=window.showSection;
if(typeof original==="function"&&!original.__coffeeMenuWrapped){window.showSection=function(){var r=original.apply(this,arguments);setTimeout(sync,25);return r};window.showSection.__coffeeMenuWrapped=true}
function mount(){ensureButton();ensureSection();sync()}
[0,250,800,1800,4000].forEach(ms=>setTimeout(mount,ms));
})();
