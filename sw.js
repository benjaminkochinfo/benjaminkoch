/* World Monitor — minimal service worker for install / homescreen only.
   Does not store user settings or feed data. Network-first for all requests. */
const SHELL = "wmt-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Always prefer network — no offline app-data cache of user feeds
  event.respondWith(
    fetch(req)
      .then((res) => res)
      .catch(() => caches.match(req).then((c) => c || Response.error()))
  );
});
