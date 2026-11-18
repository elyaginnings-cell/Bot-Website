/** Complete independent per-server feature manager. */
(function(){
"use strict";
if(window.__coffeeShopFeatureManagerV2)return;window.__coffeeShopFeatureManagerV2=true;
var S=[
["achievements","🏆","Achievements","Community"],["activitycheck","📊","Activity Check","Staff Tools"],["ai","☕","AI Chat & Staff Operator","AI"],["analytics","📈","Analytics","Community"],["applications","📝","Applications","Staff Tools"],["auditLog","📜","Audit Log","Staff Tools"],["automod","🛡️","Auto Moderation","Moderation"],["birthday","🎂","Birthdays","Community"],["bump","📢","Bump Rewards","Community"],["chess","♟️","Chess","Games"],["currency","🫘","Currency & Beans","Economy"],["customEmojis","😀","Custom Emojis","Community"],["fishing","🎣","Fishing","Games"],["giveaways","🎉","Giveaways","Community"],["help","❔","Help Commands","Utilities"],["invites","📨","Invite Tracking","Community"],["leveling","📈","Leveling & XP","Community"],["loa","🏖️","Leave of Absence","Staff Tools"],["logging","📋","Message & Event Logging","Staff Tools"],["memberPresence","👁️","Member Presence","Community"],["moderation","⚖️","Moderation Commands","Moderation"],["profile","👤","Member Profiles","Community"],["punishment","🔨","Warnings & Punishments","Moderation"],["qotd","💭","Question of the Day","Community"],["selfroles","🎭","Self Roles","Community"],["shop","🛒","Community Shop","Economy"],["suggestions","💡","Suggestions","Community"],["tickets","🎫","Support Tickets","Staff Tools"],["verification","✅","Member Verification","Safety"]
];
var T={moderation:"moderation",invites:"invites",leveling:"leveling",currency:"currency",emojis:"customEmojis",shop:"shop",logs:"logging",birthday:"birthday",applications:"applications",fishing:"fishing",achievements:"achievements",verification:"verification",suggestions:"suggestions",tickets:"tickets",qotd:"qotd",selfroles:"selfroles",bump:"bump",ai:"ai",automod:"automod",analytics:"analytics",profile:"profile",punishment:"punishment",chess:"chess",giveaways:"giveaways",loa:"loa",activitycheck:"activitycheck",help:"help"};
var $=function(id){return document.getElementById(id)};
function cfg(){if(!window.currentConfig)window.currentConfig={};if(!window.currentConfig.systems||typeof window.currentConfig.systems!=="object")window.currentConfig.systems={};return window.currentConfig.systems}
function on(k){return cfg()[k]!==false}
function ensure(){
var content=document.querySelector(".content");if(!content)return false;if($("systems"))return true;
var sec=document.createElement("section");sec.id="systems";sec.className="page-section";
sec.innerHTML='<div class="card form-card wide coffee-feature-manager"><span class="eyebrow">THE CONTROL BOARD</span><h2>Tab Manager</h2><p class="form-hint">Every bot feature is here, including Chess and features without website settings. Turning one off disables it for this server, not just its dashboard tab.</p><div class="feature-manager-toolbar"><label class="feature-manager-search"><span>⌕</span><input id="feature-manager-search" type="search" placeholder="Find a feature..."></label><div class="feature-manager-actions"><button class="button secondary" id="feature-manager-all-on" type="button">Enable all</button><button class="button secondary" id="feature-manager-all-off" type="button">Disable all</button></div></div><div id="feature-manager-summary" class="feature-manager-summary" aria-live="polite"></div><div id="systems-list" class="feature-manager-groups"></div><div class="feature-manager-footer"><button class="button" id="save-systems" type="button">Save feature settings</button><p id="systems-status" class="form-hint" role="status"></p></div></div>';
content.appendChild(sec);return true
}
function summary(){var el=$("feature-manager-summary");if(el)el.textContent=S.filter(x=>on(x[0])).length+" of "+S.length+" features enabled"}
function render(){
var list=$("systems-list");if(!list)return;var q=($("feature-manager-search")?.value||"").trim().toLowerCase(),groups={};
S.forEach(x=>{if(q&&!(x[0]+" "+x[2]+" "+x[3]).toLowerCase().includes(q))return;(groups[x[3]]||(groups[x[3]]=[])).push(x)});
list.innerHTML=Object.keys(groups).sort().map(cat=>'<section class="feature-manager-group"><h3>'+cat+'</h3><div class="feature-manager-grid">'+groups[cat].map(x=>'<label class="feature-manager-row '+(on(x[0])?"is-enabled":"is-disabled")+'"><span class="feature-manager-icon">'+x[1]+'</span><span class="feature-manager-copy"><strong>'+x[2]+'</strong><small>'+(on(x[0])?"Active for this server":"Disabled for this server")+'</small></span><span class="feature-manager-state">'+(on(x[0])?"ON":"OFF")+'</span><input type="checkbox" data-sys-key="'+x[0]+'" '+(on(x[0])?"checked":"")+' aria-label="Enable '+x[2]+'"></label>').join("")+'</div></section>').join("")||'<p class="form-hint">No matching features.</p>';summary()
}
function status(msg,ok){var el=$("systems-status");if(el){el.textContent=msg;el.dataset.state=ok===false?"error":ok?"success":"neutral"}}
function collect(){var next=Object.assign({},cfg());document.querySelectorAll("#systems-list [data-sys-key]").forEach(el=>next[el.dataset.sysKey]=!!el.checked);return next}
async function save(){if(typeof window.saveConfig!=="function"){status("Save is not ready. Refresh and try again.",false);return}try{status("Saving…",true);var systems=collect();await window.saveConfig({systems});window.currentConfig=window.currentConfig||{};window.currentConfig.systems=systems;render();navVisibility();status("Saved. The bot will enforce these switches for this server.",true)}catch(e){status("Could not save: "+(e?.message||"unknown error"),false)}}
function navVisibility(){Object.keys(T).forEach(tab=>{var b=document.querySelector('#dashboard-navigation [data-tab="'+tab+'"]');if(b)b.hidden=!on(T[tab])})}
function navLink(){var nav=$("dashboard-navigation")||document.querySelector(".navigation");if(!nav||nav.querySelector('[data-tab="systems"]'))return;var b=document.createElement("button");b.type="button";b.className="nav-item";b.dataset.tab="systems";b.title="Tab Manager";b.innerHTML="<span>⚙️</span><em>Tab Manager</em>";nav.insertBefore(b,nav.querySelector('[data-tab="moderation"]')||null)}
function bind(){
var list=$("systems-list");if(list&&!list.__managerBound){list.__managerBound=true;list.addEventListener("change",e=>{if(!e.target.matches("[data-sys-key]"))return;var next=collect();window.currentConfig=window.currentConfig||{};window.currentConfig.systems=next;render();status("Unsaved changes — save to apply them.",true)})}
var search=$("feature-manager-search");if(search&&!search.__managerBound){search.__managerBound=true;search.addEventListener("input",render)}
var saveBtn=$("save-systems");if(saveBtn&&!saveBtn.__managerBound){saveBtn.__managerBound=true;saveBtn.addEventListener("click",save)}
[["feature-manager-all-on",true],["feature-manager-all-off",false]].forEach(([id,value])=>{var b=$(id);if(b&&!b.__managerBound){b.__managerBound=true;b.addEventListener("click",()=>{var next=Object.assign({},cfg());S.forEach(x=>next[x[0]]=value);window.currentConfig.systems=next;render();status("Unsaved changes — save to apply them.",true)})}})
}
function mount(){if(!ensure())return;navLink();render();bind();navVisibility()}
document.addEventListener("click",e=>{if(e.target?.closest?.('[data-tab="systems"]'))setTimeout(mount,30)},true);
[0,300,1000,2500,6000].forEach(ms=>setTimeout(mount,ms));
window.addEventListener("dashboard:config-loaded",navVisibility);window.addEventListener("configLoaded",navVisibility);
console.log("[features-systems] complete feature manager ready")
})();
