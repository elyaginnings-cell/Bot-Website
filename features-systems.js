/** Complete independent per-server feature manager. */
(function(){
"use strict";
if(window.__coffeeShopFeatureManagerV3)return;window.__coffeeShopFeatureManagerV3=true;
var S=[
["achievements","🏆","Achievements","Community"],["activitycheck","📊","Activity Check","Staff & Support"],["ai","☕","AI Chat & Staff Operator","AI & Automation"],["analytics","📈","Analytics","Community"],["applications","📝","Applications","Staff & Support"],["auditLog","📜","Audit Log","Staff & Support"],["automod","🛡️","Auto Moderation","Moderation & Safety"],["birthday","🎂","Birthdays","Community"],["bump","📢","Bump Rewards","Community"],["chess","♟️","Chess","Economy & Games"],["currency","🫘","Currency & Beans","Economy & Games"],["customEmojis","😀","Custom Emojis","Community"],["fishing","🎣","Fishing","Economy & Games"],["giveaways","🎉","Giveaways","Economy & Games"],["help","❔","Help Commands","AI & Automation"],["invites","📨","Invite Tracking","Community"],["leveling","📈","Leveling & XP","Economy & Games"],["loa","🏖️","Leave of Absence","Staff & Support"],["logging","📋","Message & Event Logging","Staff & Support"],["memberPresence","👁️","Member Presence","Community"],["moderation","⚖️","Moderation Commands","Moderation & Safety"],["profile","👤","Member Profiles","Community"],["punishment","🔨","Warnings & Punishments","Moderation & Safety"],["qotd","💭","Question of the Day","Community"],["selfroles","🎭","Self Roles","Community"],["shop","🛒","Community Shop","Economy & Games"],["suggestions","💡","Suggestions","Community"],["tickets","🎫","Support Tickets","Staff & Support"],["verification","✅","Member Verification","Moderation & Safety"]
];
var T={moderation:"moderation",invites:"invites",leveling:"leveling",currency:"currency",emojis:"customEmojis",shop:"shop",logs:"logging",birthday:"birthday",applications:"applications",fishing:"fishing",achievements:"achievements",verification:"verification",suggestions:"suggestions",tickets:"tickets",qotd:"qotd",selfroles:"selfroles",bump:"bump",ai:"ai",automod:"automod",analytics:"analytics",profile:"profile",punishment:"punishment",chess:"chess",giveaways:"giveaways",loa:"loa",activitycheck:"activitycheck",help:"help"};
var $=function(id){return document.getElementById(id)};
function cfg(){if(!window.currentConfig)window.currentConfig={};if(!window.currentConfig.systems||typeof window.currentConfig.systems!=="object")window.currentConfig.systems={};return window.currentConfig.systems}
function on(k){return cfg()[k]!==false}
function ensure(){
var content=document.querySelector(".content");if(!content)return false;if($("systems"))return true;
var sec=document.createElement("section");sec.id="systems";sec.className="page-section cafe-menu-page cafe-system-controls-page";
sec.innerHTML='<div class="page-heading"><span class="eyebrow">THE WHOLE COFFEE SHOP</span><h2>System Controls</h2><p>Every system in your server, arranged just like the Café Menu. Flip a switch to enable or disable it for this server.</p></div><div class="system-menu-toolbar"><label class="feature-manager-search"><span>⌕</span><input id="feature-manager-search" type="search" placeholder="Find a system..."></label><div class="feature-manager-actions"><button class="button secondary" id="feature-manager-all-on" type="button">Enable all</button><button class="button secondary" id="feature-manager-all-off" type="button">Disable all</button></div></div><div id="feature-manager-summary" class="feature-manager-summary" aria-live="polite"></div><div class="cafe-menu-page-groups" id="systems-list"></div><div class="cafe-menu-page-footer system-menu-footer"><p id="systems-status" class="form-hint" role="status"></p><button class="button" id="save-systems" type="button">Save Changes</button><button class="button secondary" type="button" data-menu-home>← Back to Menu</button></div>';
content.appendChild(sec);return true
}
function summary(){var el=$("feature-manager-summary");if(el)el.textContent=S.filter(x=>on(x[0])).length+" of "+S.length+" features enabled"}
function render(){
var list=$("systems-list");if(!list)return;var q=($("feature-manager-search")?.value||"").trim().toLowerCase(),groups={};
S.forEach(x=>{if(q&&!(x[0]+" "+x[2]+" "+x[3]).toLowerCase().includes(q))return;(groups[x[3]]||(groups[x[3]]=[])).push(x)});
list.innerHTML=Object.keys(groups).map(cat=>'<section class="cafe-menu-page-group"><h3>'+cat+'</h3><div class="cafe-menu-page-grid">'+groups[cat].map(x=>'<label class="cafe-menu-page-item system-menu-item '+(on(x[0])?"is-enabled":"is-disabled")+'"><span class="cafe-menu-page-icon">'+x[1]+'</span><span class="system-menu-copy"><strong>'+x[2]+'</strong><small>'+(on(x[0])?"Enabled for this server":"Disabled for this server")+'</small></span><span class="system-menu-switch"><input type="checkbox" data-sys-key="'+x[0]+'" '+(on(x[0])?"checked":"")+' aria-label="Enable '+x[2]+'"><span class="system-menu-switch-track" aria-hidden="true"></span></span></label>').join("")+'</div></section>').join("")||'<p class="form-hint">No matching systems.</p>';summary()
}
function status(msg,ok){var el=$("systems-status");if(el){el.textContent=msg;el.dataset.state=ok===false?"error":ok?"success":"neutral"}}
function collect(){var next=Object.assign({},cfg());document.querySelectorAll("#systems-list [data-sys-key]").forEach(el=>next[el.dataset.sysKey]=!!el.checked);return next}
async function save(){if(typeof window.saveConfig!=="function"){status("Save is not ready. Refresh and try again.",false);return}try{status("Saving…",true);var systems=collect();await window.saveConfig({systems});window.currentConfig=window.currentConfig||{};window.currentConfig.systems=systems;render();navVisibility();status("Saved. The bot will enforce these switches for this server.",true)}catch(e){status("Could not save: "+(e?.message||"unknown error"),false)}}
function navVisibility(){Object.keys(T).forEach(tab=>{var b=document.querySelector('#dashboard-navigation [data-tab="'+tab+'"]');if(b)b.hidden=!on(T[tab]);document.querySelectorAll('.quick-card[data-section-link="'+tab+'"]').forEach(card=>card.hidden=!on(T[tab]))})}
function bind(){
var list=$("systems-list");if(list&&!list.__managerBound){list.__managerBound=true;list.addEventListener("change",e=>{if(!e.target.matches("[data-sys-key]"))return;var next=collect();window.currentConfig=window.currentConfig||{};window.currentConfig.systems=next;render();status("Unsaved changes — save to apply them.",true)})}
var search=$("feature-manager-search");if(search&&!search.__managerBound){search.__managerBound=true;search.addEventListener("input",render)}
var saveBtn=$("save-systems");if(saveBtn&&!saveBtn.__managerBound){saveBtn.__managerBound=true;saveBtn.addEventListener("click",save)}
[["feature-manager-all-on",true],["feature-manager-all-off",false]].forEach(([id,value])=>{var b=$(id);if(b&&!b.__managerBound){b.__managerBound=true;b.addEventListener("click",()=>{var next=Object.assign({},cfg());S.forEach(x=>next[x[0]]=value);window.currentConfig.systems=next;render();status("Unsaved changes — save to apply them.",true)})}})
}
function mount(){if(!ensure())return;render();bind();navVisibility()}
document.addEventListener("click",e=>{if(e.target?.closest?.('[data-tab="systems"]'))setTimeout(mount,30)},true);
[0,300,1000,2500,6000,12000,20000].forEach(ms=>setTimeout(mount,ms));
var configPolls=0;var configPoll=setInterval(function(){navVisibility();if(++configPolls>=40)clearInterval(configPoll)},500);
window.addEventListener("dashboard:config-loaded",navVisibility);window.addEventListener("configLoaded",navVisibility);window.addEventListener("dashboard:guild-loading",function(){render();navVisibility()});window.addEventListener("dashboard:guild-loaded",function(){render();navVisibility()});
console.log("[features-systems] café menu-style system controls ready")
})();
