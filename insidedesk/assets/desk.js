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
  // Slots: Mon–Fri 08:30 and 17:30, Sun 10:00 (Berlin wall time). Saturday closed.
  // A slot is skipped once an edition covering it is published (build writes data-latest-slot).
  var latestEl=$("[data-latest-slot]"), latest=latestEl?latestEl.getAttribute("data-latest-slot"):"";
  var DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  function ymd(d){var o={};new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d).forEach(function(p){o[p.type]=p.value});return [+o.year,+o.month,+o.day]}
  function pad(n){return (n<10?"0":"")+n}
  function nextEdition(d){
    var o=parts(d), t=ymd(d), nowKey=t[0]+"-"+pad(t[1])+"-"+pad(t[2])+" "+o.hour+":"+o.minute;
    for(var i=0;i<9;i++){
      var c=new Date(Date.UTC(t[0],t[1]-1,t[2]+i,12)), wd=c.getUTCDay(), key=c.getUTCFullYear()+"-"+pad(c.getUTCMonth()+1)+"-"+pad(c.getUTCDate());
      var slots=wd===6?[]:wd===0?[["10:00","Sunday long-read"]]:[["08:30","Morning edition"],["17:30","Evening edition"]];
      for(var k=0;k<slots.length;k++){var sk=key+" "+slots[k][0];
        if(sk<=nowKey||(latest&&sk<=latest))continue;
        var when=i===0?"today":i===1?"tomorrow":DAYS[wd];
        var tz=new Intl.DateTimeFormat("en-GB",{timeZone:TZ,timeZoneName:"short"}).formatToParts(c).filter(function(p){return p.type==="timeZoneName"})[0];
        return slots[k][1]+", "+when+" "+slots[k][0]+" "+(tz?tz.value:"")}
    }
    return "";
  }
  function tick(){
    var d=new Date(), o=parts(d), tz=o.timeZoneName||"";
    $$("[data-clock]").forEach(function(el){el.textContent=o.weekday+" "+o.hour+":"+o.minute+" "+tz});
    $$("[data-next]").forEach(function(el){el.textContent="Next: "+nextEdition(d)+" · Morning 08:30 · Evening 17:30 · Sunday 10:00, Berlin time"});
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
