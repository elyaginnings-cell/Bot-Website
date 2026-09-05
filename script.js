(function(){
  function load(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement("script");
      s.src = src;
      s.onload = function(){ resolve(); };
      s.onerror = function(){ reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }
  load("script-part1.js?v=fix4")
    .then(function(){ return load("script-part2.js?v=fix4"); })
    .then(function(){
      if (typeof bootDashboard === "function") bootDashboard();
      else if (typeof setupEventListeners === "function") {
        try { setupEventListeners(); } catch(e) {}
        try { if (typeof initViewMode === "function") initViewMode(); } catch(e) {}
        try { if (typeof checkLogin === "function") checkLogin(); } catch(e) {}
      }
    })
    .catch(function(err){ console.error(err); });
})();
