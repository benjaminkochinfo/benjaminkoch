(function(){
  var C=window.LODESTRATH_CONFIG||{},L=C.PAYMENT_LINKS||{},mail=C.CONTACT||"isoline@benjaminkoch.info";
  var names={"macro-central-banks":"Macro & Central Banks","geointel":"GeoIntel","energy-commodities":"Energy & Commodities","sanctions-trade":"Sanctions & Trade","boardroom-legacy":"Boardroom & Legacy"};
  function link(desk,lic){ if(lic==="house_year") return L.house_year||""; return (L[desk]||{})[lic]||""; }
  function fallback(desk,lic){
    var what=lic==="house_year"?"House year (all five desks)":(names[desk]||desk)+" · "+(lic==="year"?"Desk year":"Quarter licence");
    return "mailto:"+mail+"?subject="+encodeURIComponent("LODESTRATH licence: "+what);
  }
  function deskFor(a){
    if(a.dataset.desk) return a.dataset.desk;
    var plan=a.closest(".plan"),sel=plan&&plan.querySelector("[data-desk-select]");
    return sel?sel.value:"";
  }
  function update(a){
    var lic=a.dataset.buy,desk=deskFor(a),url=link(desk,lic);
    a.href=url||fallback(desk,lic);
    if(url){a.target="_blank";a.rel="noopener";}else{a.removeAttribute("target");}
  }
  var btns=[].slice.call(document.querySelectorAll("[data-buy]"));
  btns.forEach(update);
  [].forEach.call(document.querySelectorAll("[data-desk-select]"),function(sel){
    sel.addEventListener("change",function(){var p=sel.closest(".plan");[].forEach.call(p.querySelectorAll("[data-buy]"),update);});
  });
  // thank-you banner after checkout (?subscribed=1)
  try{ if(new URLSearchParams(location.search).get("subscribed")==="1"){var b=document.getElementById("subOk");if(b)b.hidden=false;} }catch(e){}
  // counsel form -> mailto
  var f=document.getElementById("callForm");
  if(f) f.addEventListener("submit",function(ev){
    ev.preventDefault();
    var v=function(id){var el=document.getElementById(id);return el?el.value.trim():"";};
    var body="Name: "+v("n")+"\nOrganisation: "+v("o")+"\nWork email: "+v("e")+"\nInterest: "+v("t")+"\n\nThe question in front of me:\n"+v("q")+"\n";
    location.href="mailto:"+mail+"?subject="+encodeURIComponent("LODESTRATH Counsel request: "+v("t"))+"&body="+encodeURIComponent(body);
  });
  // iso contour backgrounds are drawn inline in the page
})();
