(function(){
  function load(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
  load("script-part1.js?v=12").then(function(){return load("script-part2.js?v=12");}).catch(function(e){console.error(e);});
})();
