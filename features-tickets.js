(function(){
if(window.__featuresTicketsV5Load)return;
window.__featuresTicketsV5Load=true;
var N=5,loaded=0;
function tryRun(){
  if(!window.__tparts)return;
  var ok=true;
  for(var i=0;i<N;i++){if(typeof window.__tparts[i]!=="string")ok=false;}
  if(!ok)return;
  var code=window.__tparts.join("");
  var s=document.createElement("script");
  s.textContent=code;
  document.head.appendChild(s);
  console.log("[features-tickets] v5 assembled");
}
for(var i=0;i<N;i++){
  (function(i){
    var s=document.createElement("script");
    s.src="/tp"+i+".js?v=5";
    s.onload=function(){loaded++;tryRun();};
    s.onerror=function(){console.error("[features-tickets] missing tp"+i);};
    document.head.appendChild(s);
  })(i);
}
})();
