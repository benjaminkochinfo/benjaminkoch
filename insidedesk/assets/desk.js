/* Inside Desk — small progressive enhancements. No trackers, no network calls. */
(function(){
  "use strict";
  var $ = function(s,r){return (r||document).querySelector(s)}, $$ = function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
  function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k));localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
  // theme (same key as earlier versions: it.theme)
  var root=document.documentElement, meta=$('meta[name="theme-color"]');
  function applyTheme(t,save){root.dataset.theme=t;if(meta)meta.content=t==="paper"?"#F6F1E7":"#0D1015";
    if(save){try{localStorage.setItem("it.theme",t)}catch(e){}}}
  applyTheme(root.dataset.theme==="paper"?"paper":"terminal",false);
  $$("[data-theme-toggle]").forEach(function(b){b.addEventListener("click",function(){applyTheme(root.dataset.theme==="paper"?"terminal":"paper",true)})});
  // follow the system setting until the reader chooses
  try{var mq=matchMedia("(prefers-color-scheme: light)");var onMq=function(){if(!localStorage.getItem("it.theme"))applyTheme(mq.matches?"paper":"terminal",false)};mq.addEventListener?mq.addEventListener("change",onMq):mq.addListener(onMq)}catch(e){}
  // Berlin clock + next edition (CET/CEST from the browser's tz database)
  var TZ="Europe/Berlin";
  function parts(d){var o={};new Intl.DateTimeFormat("en-GB",{timeZone:TZ,weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false,timeZoneName:"short"}).formatToParts(d).forEach(function(p){o[p.type]=p.value});return o}
  function nextEdition(d){
    var o=parts(d), wd=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(o.weekday), t=(+o.hour)*60+(+o.minute);
    if(wd===6) return "Sunday long-read, tomorrow 10:00";
    if(wd===0) return t<600?"Sunday long-read, 10:00":"Monday morning, 08:30";
    if(t<510) return "Morning edition, 08:30";
    if(t<1050) return "Evening edition, 17:30";
    return wd===5?"Sunday long-read, Sunday 10:00":"Morning edition, tomorrow 08:30";
  }
  function tick(){
    var d=new Date(), o=parts(d), tz=o.timeZoneName||"";
    $$("[data-clock]").forEach(function(el){el.textContent=o.weekday+" "+o.hour+":"+o.minute+" "+tz});
    $$("[data-next]").forEach(function(el){el.textContent="Next: "+nextEdition(d)+" "+tz+" · Morning 08:30 · Evening 17:30 · Sunday 10:00, Berlin time"});
  }
  tick(); setInterval(tick,30000);
  // copy + native share
  function toast(msg){var t=$("#toast");if(!t){t=document.createElement("div");t.id="toast";t.setAttribute("role","status");t.style.cssText="position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--signal);color:var(--on-signal);font:600 14px var(--sans);padding:9px 14px;border-radius:9px;z-index:99";document.body.appendChild(t)}t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(function(){t.hidden=true},2400)}
  $$("[data-copy]").forEach(function(b){b.addEventListener("click",function(){
    var u=b.getAttribute("data-copy");
    if(navigator.clipboard){navigator.clipboard.writeText(u).then(function(){toast("Link copied.")},function(){prompt("Copy this link:",u)})}else{prompt("Copy this link:",u)}
  })});
  if(navigator.share){$$("[data-native-share]").forEach(function(b){b.hidden=false;b.addEventListener("click",function(){navigator.share({title:b.dataset.title,url:b.dataset.url}).catch(function(){})})})}
  $$("[data-print]").forEach(function(b){b.addEventListener("click",function(){window.print()})});
  // shelf (browser-only)
  var art=$("[data-article]");
  function shelf(){return store("it.shelf2")||[]}
  $$("[data-save]").forEach(function(b){
    function sync(){var on=shelf().some(function(x){return x.id===art.dataset.id});b.textContent=on?"On the shelf":"Save for later";b.classList.toggle("btn-amber",on)}
    if(!art){b.hidden=true;return} sync();
    b.addEventListener("click",function(){var s=shelf(),id=art.dataset.id;
      if(s.some(function(x){return x.id===id})) s=s.filter(function(x){return x.id!==id});
      else s.unshift({id:id,title:art.dataset.title,dek:art.dataset.dek,path:id,saved:Date.now()});
      store("it.shelf2",s.slice(0,100));sync();toast("Shelf updated.")});
  });
  var list=$("[data-shelf-list]");
  if(list){var s=shelf(); if(s.length){
    var base=location.pathname.replace(/insidedesk\/shelf\.html$/,"");
    list.innerHTML="";s.forEach(function(x){var d=document.createElement("div");d.className="shelf-item";
      var a=document.createElement("a");a.href=base+x.path;a.textContent=x.title;var p=document.createElement("div");p.appendChild(a);
      var m=document.createElement("div");m.className="faint";m.textContent=x.dek||"";p.appendChild(m);
      var r=document.createElement("button");r.className="btn btn-s";r.type="button";r.textContent="Remove";
      r.addEventListener("click",function(){store("it.shelf2",shelf().filter(function(y){return y.id!==x.id}));d.remove()});
      d.appendChild(p);d.appendChild(r);list.appendChild(d)})}}
  // reading progress on articles
  var bar=$(".progress span");
  if(art&&bar){var onS=function(){var r=art.getBoundingClientRect(),h=r.height-innerHeight;bar.style.width=Math.max(0,Math.min(100,(-r.top/(h||1))*100))+"%"};addEventListener("scroll",onS,{passive:true});onS()}
})();
