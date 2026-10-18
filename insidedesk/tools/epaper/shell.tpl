<!doctype html>
<html lang="en-GB" data-theme="paper">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{{TITLE}}</title>
<meta name="description" content="{{DESC}}">
<link rel="canonical" href="{{CANONICAL}}">
<link rel="alternate" type="application/rss+xml" title="Inside Desk" href="{{EP_ROOT}}../feed.xml">
<link rel="icon" href="{{EP_ROOT}}../assets/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#F3EEE4">
<link rel="manifest" href="{{EP_ROOT}}manifest.webmanifest">
<link rel="preload" href="{{FONTS}}newsreader-text.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{{FONTS}}newsreader-disp.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{{ASSETS}}epaper.css">
<script>try{var t=localStorage.getItem("it.epaper.theme")||({terminal:"dark",paper:"paper"})[localStorage.getItem("it.theme")];if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body class="nojs" data-root="{{EP_ROOT}}" data-slot="{{SLOT}}" data-until="{{UNTIL}}">
<a class="skip" href="#reader">Skip to all articles in reading order</a>
<header class="bar" role="banner">
  <div class="bar-l"><a class="logo" href="{{HOME}}" aria-label="Inside Desk website">ID</a><div class="bar-ed"><b><a class="bar-home" href="{{EP_INDEX}}">Inside Desk ePaper</a></b><span class="bar-label">{{EDITION_LABEL}} · <span class="bar-status">{{STATUS}}</span> · Always free</span></div></div>
  <div class="bar-r" role="toolbar" aria-label="ePaper tools">
    <button class="tb" id="b-toc" aria-haspopup="dialog" title="Contents (t)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>Contents</span></button>
    <button class="tb" id="b-search" aria-haspopup="dialog" title="Search this edition (/)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg><span>Search</span></button>
    <span class="tb-group" role="group" aria-label="Zoom">
      <button class="tb tb-i" id="b-zout" aria-label="Zoom out" title="Zoom out (−)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg></button>
      <button class="tb tb-z" id="b-zfit" aria-label="Fit page to screen" title="Fit (0)"><span id="zlabel">Fit</span></button>
      <button class="tb tb-i" id="b-zin" aria-label="Zoom in" title="Zoom in (+)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg></button>
    </span>
    <button class="tb tb-i" id="b-view" aria-pressed="false" aria-label="Single page view" title="Single page or spread"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="8" height="14" rx="1"/><rect x="13" y="5" width="8" height="14" rx="1"/></svg></button>
    <button class="tb tb-i" id="b-theme" aria-label="Switch to dark theme" title="Paper or dark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg></button>
    {{WEB_ED}}
    <a class="tb" id="b-pdf" href="{{PDF}}" download><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg><span>PDF</span></a>
  </div>
</header>
<main id="app">
  <h1 class="sr">Inside Desk ePaper, {{EDITION_LABEL}}</h1>
  <button class="nav-b nav-prev" id="b-prev" aria-label="Previous page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
  <div class="viewport" id="viewport" tabindex="-1">
    <div class="sizer" id="sizer"><div class="stage" id="stage">{{PAGES}}</div></div>
  </div>
  <button class="nav-b nav-next" id="b-next" aria-label="Next page"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>
  <button class="m-read" id="b-read" type="button">Read this edition in reading view →</button>
  <p id="live" class="sr" aria-live="polite"></p>
  <div class="upd-banner" id="upd-banner" hidden role="status"><span id="upd-text">This issue has been updated.</span> <button class="tb" id="upd-reload" type="button">Load the update</button></div>
</main>
<nav class="strip" aria-label="Pages"><ol id="thumbs">{{THUMBS}}</ol><span class="strip-n" id="pgn" aria-hidden="true">1 / {{N}}</span></nav>
<section id="reader" class="reader-store" aria-label="All articles in reading order"><h2 class="rs-h">All articles in this edition</h2>{{READER}}</section>
<dialog id="rd" class="dlg dlg-reader" aria-labelledby="rd-title">
  <div class="rd-bar"><button class="tb" data-close>← Back to the page</button><span class="rd-pos" id="rd-pos"></span>
    <span class="tb-group" role="group" aria-label="Text size"><button class="tb tb-i" id="rd-sm" aria-label="Smaller text">A−</button><button class="tb tb-i" id="rd-lg" aria-label="Larger text">A+</button></span>
    <button class="tb tb-i" id="rd-prev" aria-label="Previous article">‹</button><button class="tb tb-i" id="rd-next" aria-label="Next article">›</button></div>
  <div class="rd-scroll" id="rd-scroll"><span id="rd-title" class="sr">Reading view</span><div id="rd-body"></div></div>
</dialog>
<dialog id="toc" class="dlg dlg-side" aria-labelledby="toc-h"><div class="dlg-head"><h2 id="toc-h">Contents</h2><button class="tb tb-i" data-close aria-label="Close contents">✕</button></div><div id="toc-body"></div></dialog>
<dialog id="srch" class="dlg dlg-side" aria-labelledby="srch-h"><div class="dlg-head"><h2 id="srch-h">Search this edition</h2><button class="tb tb-i" data-close aria-label="Close search">✕</button></div>
  <label class="sr" for="q">Search words</label><input id="q" type="search" placeholder="diesel, Warsh, Ebola…" autocomplete="off"><p class="faint" id="q-n" aria-live="polite"></p><ol id="q-res" class="q-res"></ol></dialog>
<script src="{{ASSETS}}epaper.js" defer></script>
</body>
</html>
