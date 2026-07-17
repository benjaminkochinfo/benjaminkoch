/* World Monitor — install / homescreen helper.
   Network-first. Does not store user settings or feed data.
   App entry: https://benjaminkoch.info/wm_terminal.html */
const SHELL = "wmt-shell-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Send bare site / index hits to the real app entry (homescreen & root bookmarks)
  if (req.mode === "navigate") {
    try {
      const url = new URL(req.url);
      const base = self.registration.scope || url.origin + "/";
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const isRoot =
        path === "/" ||
        path === "" ||
        /\/index\.html$/i.test(url.pathname) ||
        path.endsWith("/index.html");
      if (isRoot) {
        const target = new URL("wm_terminal.html", base).href;
        event.respondWith(Response.redirect(target, 302));
        return;
      }
    } catch {
      /* fall through to normal fetch */
    }
  }

  // Always prefer network — no offline feed/settings cache
  event.respondWith(
    fetch(req)
      .then((res) => res)
      .catch(() => caches.match(req).then((c) => c || Response.error()))
  );
});
