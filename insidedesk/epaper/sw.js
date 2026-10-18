/* Inside Desk ePaper service worker. Scope: insidedesk/epaper/ only. An issue is cached for offline reading after it is opened.
   Pages and edition.json: network first (the evening ePaper is updated until 22:30), cache as fallback. Everything else: cache first. */
const V = "id-epaper-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("id-epaper-") && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("message", e => {
  const d = e.data || {}; if (d.type !== "cache-issue" || !Array.isArray(d.urls)) return;
  e.waitUntil(caches.open(V).then(c => Promise.all(d.urls.filter(u => new URL(u, location.href).origin === location.origin)
    .map(u => c.match(u, { ignoreSearch: true }).then(hit => hit && !/\/(index\.html)?$|edition\.json$/.test(u) ? null : fetch(u, { cache: "no-cache" }).then(r => r.ok && c.put(u, r)).catch(() => {}))))));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  const fresh = r.mode === "navigate" || u.pathname.endsWith("/edition.json") || u.pathname.endsWith("/") || u.pathname.endsWith(".html");
  if (fresh) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(u.origin + u.pathname, cp)); } return res; })
      .catch(() => caches.match(u.origin + u.pathname).then(h => h || caches.match(r, { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(h => h || fetch(r).then(res => { if (res.ok && res.type === "basic") { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })));
});
