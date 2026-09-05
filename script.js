(function(){
  var a=document.createElement("script");
  a.src="script-part1.js?v=revert1";
  a.onload=function(){
    var b=document.createElement("script");
    b.src="script-part2.js?v=revert1";
    document.head.appendChild(b);
  };
  a.onerror=function(){console.error("Failed loading script-part1");};
  document.head.appendChild(a);
})();
