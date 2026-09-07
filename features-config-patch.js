(function(){"use strict";if(window.__featuresConfigPatchV19)return;window.__featuresConfigPatchV19=true;
function $(i){return document.getElementById(i)}
function setVal(i,v){var e=$(i);if(e&&v!=null)e.value=v}
function setCheck(i,v){var e=$(i);if(e)e.checked=!!v}
function setStatus(i,t,ok){var e=$(i);if(!e)return;e.textContent=t||"";e.style.color=ok===false?"#f87171":ok?"#4ade80":""}
function channels(){try{if(typeof channelsCache!=="undefined"&&channelsCache.length)return channelsCache}catch(_){}
try{if(window.syncGlobals)window.syncGlobals()}catch(_){}return window.channelsCache||[]}
function roles(){try{if(typeof rolesCache!=="undefined"&&rolesCache.length)return rolesCache}catch(_){}return window.rolesCache||[]}
function fillSelects(){var ch=channels(),rl=roles();
["analytics-log-channel"].forEach(function(id){var el=$(id);if(!el)return;var c=el.value;el.innerHTML='<option value="">None</option>';
ch.forEach(function(x){var o=document.createElement("option");o.value=x.id;o.textContent="#"+x.name;el.appendChild(o)});if(c)el.value=c});
["suggest-ping-role"].forEach(function(id){var el=$(id);if(!el)return;var c=el.value;el.innerHTML='<option value="">None</option>';
rl.forEach(function(x){var o=document.createElement("option");o.value=x.id;o.textContent=x.name;el.appendChild(o)});if(c)el.value=c})}
function apply(){var c=window.currentConfig||{},S=c.suggestions||{},A=c.analytics||{};
setVal("suggest-ping-role",S.pingRoleId||"");setCheck("analytics-enabled",A.enabled!==false);
setVal("analytics-log-channel",A.logChannelId||"");setCheck("analytics-track-messages",A.trackMessages!==false);
setCheck("analytics-track-members",A.trackMembers!==false);fillSelects()}
async function saveA(){try{setStatus("analytics-status","Saving…",true);
var d=await window.saveConfig({analytics:{enabled:$("analytics-enabled")?$("analytics-enabled").checked:true,
logChannelId:$("analytics-log-channel")?$("analytics-log-channel").value||null:null,
trackMessages:$("analytics-track-messages")?$("analytics-track-messages").checked:true,
trackMembers:$("analytics-track-members")?$("analytics-track-members").checked:true}});
setStatus("analytics-status",d&&d.savedToBot===false?"Saved (bot offline)":"✅ Analytics saved.",true)}catch(e){setStatus("analytics-status","❌ "+(e.message||"Failed"),false)}}
async function saveS(){try{setStatus("suggest-status","Saving…",true);
var d=await window.saveConfig({suggestions:{enabled:$("suggest-enabled")?$("suggest-enabled").checked:true,
channelId:$("suggest-channel")?$("suggest-channel").value||null:null,
staffChannelId:$("suggest-staff-channel")?$("suggest-staff-channel").value||null:null,
pingRoleId:$("suggest-ping-role")?$("suggest-ping-role").value||null:null}});
setStatus("suggest-status",d&&d.savedToBot===false?"Saved (bot offline)":"✅ Suggestions saved.",true)}catch(e){setStatus("suggest-status","❌ "+(e.message||"Failed"),false)}}
async function saveQ(){try{setStatus("qotd-status","Saving…",true);
var d=await window.saveConfig({qotd:{enabled:$("qotd-enabled")?$("qotd-enabled").checked:true,
channelId:$("qotd-channel")?$("qotd-channel").value||null:null,
managerRoleId:$("qotd-manager-role")?$("qotd-manager-role").value||null:null}});
setStatus("qotd-status",d&&d.savedToBot===false?"Saved (bot offline)":"✅ QOTD saved.",true)}catch(e){setStatus("qotd-status","❌ "+(e.message||"Failed"),false)}}
function wire(){var a=$("save-analytics");if(a&&!a.__p){a.__p=1;a.addEventListener("click",saveA)}
var s=$("save-suggestions");if(s&&!s.__p){s.__p=1;s.addEventListener("click",function(e){e.preventDefault();e.stopImmediatePropagation();saveS()},true)}
var q=$("save-qotd");if(q&&!q.__p){q.__p=1;q.addEventListener("click",function(e){e.preventDefault();e.stopImmediatePropagation();saveQ()},true)}
var r=$("refresh-analytics");if(r&&!r.__p){r.__p=1;r.addEventListener("click",apply)}}
var n=0;function boot(){n++;wire();apply();if(n<50)setTimeout(boot,200)}
try{var _v=window.currentConfig;Object.defineProperty(window,"currentConfig",{configurable:true,enumerable:true,get:function(){return _v},set:function(v){_v=v;setTimeout(apply,30)}})}catch(_){}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
console.log("[features-config-patch] v19")}());
