(function(){
  var parts = [];
  function finish(){
    var b64 = parts.join("");
    var bin = atob(b64);
    var code;
    try { code = decodeURIComponent(escape(bin)); } catch (e) { code = bin; }
    var s = document.createElement("script");
    s.text = code;
    document.head.appendChild(s);
  }
  function load(i){
    if (i >= 4) return finish();
    fetch("sv-chunk-" + i + ".b64.txt?v=2").then(function(r){ return r.text(); }).then(function(t){
      parts[i] = String(t || "").replace(/\s+/g, "");
      load(i + 1);
    }).catch(function(err){ console.error("server-view chunk", i, err); });
  }
  load(0);
})();
