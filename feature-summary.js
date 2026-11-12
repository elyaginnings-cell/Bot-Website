(function () {
  "use strict";
  if (window.__featureSummaryV1) return;
  window.__featureSummaryV1 = true;

  var FEATURE_TABS = [
    "moderation","invites","leveling","currency","shop","logs","birthday","systems","custom-emojis",
    "bump","verification","suggestions","tickets","qotd","selfroles",
    "applications","analytics","aichat","automod","aistaff","activitycheck","loa"
  ];
  var TITLES = {
    moderation:"Moderation", invites:"Invites", leveling:"Leveling", currency:"Currency", emojis:"Custom Emojis", systems:"System Settings", "custom-emojis":"Custom Emoji Library",
    shop:"Shop", logs:"Logging", birthday:"Birthday", bump:"Bump rewards",
    verification:"Verification", suggestions:"Suggestions", tickets:"Tickets",
    qotd:"Question of the Day", selfroles:"Self Roles", applications:"Applications",
    analytics:"Analytics", aichat:"AI Chat", automod:"Automod", aistaff:"AI Staff",
    activitycheck:"Activity Check", loa:"Leave of Absence"
  };
  var SAVE = {
    "custom-emojis":["custom-emoji-import","custom-emoji-status"],
    systems:["save-systems","systems-status"],
    bump:["save-bump","bump-status"],
    suggestions:["save-suggestions","suggest-status"],
    tickets:["save-tickets","ticket-status"],
    qotd:["save-qotd","qotd-status"],
    selfroles:["save-selfroles","sr-status"],
    applications:["save-applications","app-status"],
    analytics:["save-analytics","analytics-status"],
    aichat:["save-aichat","aichat-status"],
    automod:["save-automod","automod-status"],
    aistaff:["save-aistaff","aistaff-status"],
    activitycheck:["ac-save","ac-status"],
    loa:["loa-save","loa-status"],
  };
  function $(id){return document.getElementById(id);}
  function escapeHtml(value){
    return String(value == null ? "" : value).replace(/[&<>"']/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function labelFor(el){
    if(el.labels && el.labels.length) return el.labels[0].textContent.trim();
    var group=el.closest(".input-group");
    var label=group && group.querySelector("label");
    if(label) return label.textContent.trim();
    var wrap=el.closest("label");
    if(wrap) return wrap.textContent.replace(/\s+/g," ").trim();
    return el.getAttribute("aria-label") || el.name || el.id.replace(/[-_]/g," ");
  }
  function valueFor(el){
    if(el.type==="checkbox") return el.checked ? "Enabled" : "Disabled";
    if(el.type==="radio") return el.checked ? "Selected" : "";
    if(el.tagName==="SELECT"){
      if(el.multiple) return Array.from(el.selectedOptions).map(o=>o.textContent.trim()).filter(Boolean).join(", ");
      var option=el.selectedOptions && el.selectedOptions[0];
      return option && option.value ? option.textContent.trim() : "";
    }
    return String(el.value || "").trim();
  }
  var savedSummaryData = Object.create(null);
  function collectSummaryData(section){
    var editor=section.querySelector(":scope > .feature-editor-panel");
    if(!editor) return {rows:[],lists:[],enabled:null};
    var rows=[];
    editor.querySelectorAll("input,select,textarea").forEach(function(el){
      if(el.disabled || ["button","submit","file","hidden","password"].includes(el.type)) return;
      if(el.type==="radio" && !el.checked) return;
      if(el.closest("[hidden]")) return;
      var value=valueFor(el);
      if(!value) return;
      var label=labelFor(el);
      if(!label || label.length>90) return;
      rows.push({label:label,value:value});
    });
    var lists=[];
    editor.querySelectorAll(".level-roles-list,[id$='-list'],[id$='-cats'],#sr-v3-cats,#ticket-cats-list,#custom-emoji-grid,.emoji-grid").forEach(function(node){
      if(node.closest("[hidden]")) return;
      var text=(node.innerText || node.textContent || "").replace(/\\s+/g," ").trim();
      if(text && !/No .* yet|No .* found|loading/i.test(text) && text.length<1800){
        var id=node.id || "configured-items";
        if(!lists.some(function(x){return x.id===id;})) lists.push({id:id,text:text});
      }
    });
    var enabled=editor.querySelector('input[type="checkbox"][id$="enabled"],input[type="checkbox"][id$="-enabled"]');
    return {rows:rows,lists:lists,enabled:enabled ? !!enabled.checked : null};
  }
  function captureSavedSummary(sectionId){
    var section=$(sectionId);
    if(!section) return;
    attach(section);
    savedSummaryData[sectionId]=collectSummaryData(section);
    var summary=section.querySelector(":scope > .feature-summary-panel");
    if(summary) renderSummary(section,summary);
  }
  window.captureFeatureSummary=captureSavedSummary;
  function renderSummary(section, summary){
    var data=savedSummaryData[section.id] || collectSummaryData(section);
    var rowsHtml=data.rows.slice(0,36).map(function(row){
      return '<div class="feature-summary-row"><span>'+escapeHtml(row.label)+'</span><strong>'+escapeHtml(row.value)+'</strong></div>';
    }).join("");
    var listsHtml=data.lists.map(function(list){
      return '<div class="feature-summary-list"><span>'+escapeHtml(list.id.replace(/[-_]/g," "))+'</span><p>'+escapeHtml(list.text)+'</p></div>';
    }).join("");
    var enabledHtml=data.enabled===null ? "" :
      '<span class="feature-summary-state '+(data.enabled?'is-on':'is-off')+'">'+(data.enabled?'Enabled':'Disabled')+'</span>';
    summary.innerHTML=
      '<div class="feature-summary-head"><div><span class="eyebrow">SAVED CONFIGURATION</span><h3>'+escapeHtml(TITLES[section.id] || section.id)+'</h3></div>'+enabledHtml+'</div>'+
      (rowsHtml?'<div class="feature-summary-grid">'+rowsHtml+'</div>':'<p class="feature-summary-empty">No saved settings to display yet. Open configuration to set this feature up.</p>')+
      listsHtml+
      '<button type="button" class="button feature-configure-button" data-feature-configure>'+ (section.querySelector(":scope > .feature-editor-panel").hidden?'Configure '+escapeHtml(TITLES[section.id] || 'feature'):'Close configuration') +'</button>';
  }
  function attach(section){
    if(!FEATURE_TABS.includes(section.id)) return;
    var existing=section.querySelector(":scope > .feature-summary-panel");
    var editor=section.querySelector(":scope > .feature-editor-panel");
    if(existing && editor){
      Array.from(section.childNodes).forEach(function(node){
        if(node!==existing && node!==editor) editor.appendChild(node);
      });
      renderSummary(section,existing);
      return;
    }
    var summary=document.createElement("div");
    summary.className="card feature-summary-panel";
    var wrap=document.createElement("div");
    wrap.className="feature-editor-panel";
    while(section.firstChild) wrap.appendChild(section.firstChild);
    section.appendChild(summary);
    section.appendChild(wrap);
    wrap.hidden=true;
    summary.addEventListener("click",function(event){
      var button=event.target.closest("[data-feature-configure]");
      if(!button) return;
      wrap.hidden=!wrap.hidden;
      renderSummary(section,summary);
      if(!wrap.hidden){
        var first=wrap.querySelector("input:not([type=hidden]),select,textarea,button");
        if(first && first.focus) first.focus({preventScroll:true});
      }
    });
    renderSummary(section,summary);
    section.dataset.featureSummary="true";
  }
  function refresh(sectionId,options){
    var section=$(sectionId);
    if(!section) return;
    attach(section);
    var summary=section.querySelector(":scope > .feature-summary-panel");
    var editor=section.querySelector(":scope > .feature-editor-panel");
    if(!summary || !editor) return;
    if(options && options.collapse) editor.hidden=true;
    renderSummary(section,summary);
  }
  window.refreshFeatureSummary=refresh;

  async function saveFeatureDraft(sectionId){
    if(sectionId==="shop"){
      if(typeof window.saveShopToggle==="function") return (await window.saveShopToggle())===true;
      throw new Error("Shop save is not available.");
    }
    if(sectionId==="logs"){
      if(typeof window.saveLoggingConfig==="function") return (await window.saveLoggingConfig())===true;
      throw new Error("Logging save is not available.");
    }
    var config=SAVE[sectionId];
    if(!config) return false;
    var button=$(config[0]);
    var status=$(config[1]);
    if(!button) throw new Error("The save control for "+(TITLES[sectionId]||sectionId)+" was not found.");
    var before=status ? status.textContent : "";
    button.click();
    var started=Date.now();
    while(Date.now()-started<25000){
      await new Promise(resolve=>setTimeout(resolve,150));
      var current=status ? status.textContent.trim() : "";
      if(current && current!==before && !/saving|loading/i.test(current)){
        if(/failed|error|could not|not saved|❌/i.test(current)) throw new Error(current);
        if(/saved|success|updated|created|refreshed|done|synced/i.test(current)) return true;
      }
      if(!status && Date.now()-started>1200) return true;
    }
    if(status) throw new Error(status.textContent || "The save did not confirm within 25 seconds.");
    return true;
  }
  window.saveFeatureDraft=saveFeatureDraft;

  function process(){
    FEATURE_TABS.forEach(function(id){var section=$(id);if(section) attach(section);});
  }
  var observer=new MutationObserver(function(records){
    var relevant=records.some(function(record){
      if(record.type!=="childList" || !record.addedNodes.length) return false;
      if(record.target.closest && record.target.closest(".feature-summary-panel,.feature-editor-panel")) return false;
      return record.target === document.querySelector(".content") ||
        (record.target.classList && record.target.classList.contains("page-section"));
    });
    if(relevant) setTimeout(process,40);
  });
  function boot(){
    process();
    var content=document.querySelector(".content");
    if(content) observer.observe(content,{childList:true,subtree:true});
    document.addEventListener("dashboard:guild-loaded",function(){
      setTimeout(function(){process();FEATURE_TABS.forEach(id=>refresh(id));},80);
      setTimeout(function(){
        FEATURE_TABS.forEach(id=>{refresh(id);captureSavedSummary(id);});
        if(typeof window.captureDashboardDraft==="function") window.captureDashboardDraft();
      },500);
    });
    document.addEventListener("dashboard:guild-loading",function(){
      FEATURE_TABS.forEach(id=>refresh(id,{collapse:true}));
    });
    [300,900,1800,3500,6500].forEach(function(ms){setTimeout(process,ms);});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
  console.log("[feature-summary] summary-first feature tabs ready");
})();