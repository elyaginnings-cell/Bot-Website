(function () {
  "use strict";
  if (window.__coffeeShopDesignSystem) return;
  window.__coffeeShopDesignSystem = true;
  var icons = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    panel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>'
  };
  function button(action, label, icon) {
    var b=document.createElement("button"); b.type="button"; b.className="ds-toolbar-button"; b.dataset.action=action;
    b.setAttribute("aria-label",label); b.title=label; b.innerHTML=icon+'<span>'+label+'</span>'; return b;
  }
  function setup() {
    var sidebar=document.querySelector(".sidebar"), brand=document.querySelector(".sidebar-brand"), headerText=document.querySelector(".header-text"), app=document.getElementById("app");
    if(!sidebar||!brand||!headerText||!app) return false;
    var collapse=button("sidebar","Collapse navigation",icons.panel); collapse.classList.add("ds-sidebar-toggle"); brand.appendChild(collapse);
    var mobile=button("mobile-nav","Open navigation",icons.menu); mobile.classList.add("ds-mobile-toggle"); headerText.insertBefore(mobile,headerText.firstChild);
    var searchWrap=document.createElement("div"); searchWrap.className="ds-nav-search";
    searchWrap.innerHTML='<input type="search" id="ds-nav-search" aria-label="Search dashboard sections" placeholder="Search sections…">';
    var nav=document.querySelector(".navigation"); if(nav) nav.insertBefore(searchWrap,nav.firstChild);
    var backdrop=document.createElement("div"); backdrop.id="ds-mobile-backdrop"; backdrop.setAttribute("aria-hidden","true"); document.body.appendChild(backdrop);
    collapse.addEventListener("click",function(){var on=document.body.classList.toggle("ds-sidebar-collapsed"); collapse.setAttribute("aria-label",on?"Expand navigation":"Collapse navigation"); collapse.title=on?"Expand navigation":"Collapse navigation"; try{localStorage.setItem("coffee-dashboard-sidebar-collapsed",on?"1":"0");}catch(_){}});
    try{if(localStorage.getItem("coffee-dashboard-sidebar-collapsed")==="1"&&matchMedia("(min-width: 961px)").matches)document.body.classList.add("ds-sidebar-collapsed");}catch(_){}
    mobile.addEventListener("click",function(){document.body.classList.add("ds-mobile-nav-open");});
    backdrop.addEventListener("click",closeMobileNav);
    document.addEventListener("keydown",function(e){if(e.key==="Escape")closeMobileNav();});
    function closeMobileNav(){document.body.classList.remove("ds-mobile-nav-open");}
    var search=searchWrap.querySelector("input");
    if(search&&nav)search.addEventListener("input",function(){var q=search.value.trim().toLowerCase(),shown=0;nav.querySelectorAll(".nav-item").forEach(function(item){var value=(item.textContent||"")+" "+(item.getAttribute("title")||"")+" "+(item.dataset.tab||"");var match=!q||value.toLowerCase().indexOf(q)!==-1;item.hidden=!match;if(match)shown++;});var empty=nav.querySelector(".ds-nav-empty");if(!empty){empty=document.createElement("div");empty.className="ds-nav-empty";empty.textContent="No matching sections";nav.appendChild(empty);}empty.hidden=!q||shown>0;});
    if(nav)nav.addEventListener("click",function(e){if(e.target.closest(".nav-item"))closeMobileNav();});
    window.addEventListener("resize",function(){if(matchMedia("(min-width: 961px)").matches)closeMobileNav();});
    return true;
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();
