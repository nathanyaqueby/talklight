// TalkLight service worker:
//  1. caches the app so it opens instantly and works offline after the first visit
//  2. shows alert notifications (Android Chrome needs a service worker); a paired watch can mirror them

const CACHE = "talklight-v6";
const ASSETS = [
  "./", "index.html", "css/app.css", "js/app.js", "js/i18n.js", "js/plan.js", "js/extras.js", "vendor/qrcode.js", "manifest.webmanifest",
  "fonts/open-sauce-sans-regular.woff2", "fonts/open-sauce-sans-600.woff2",
  "fonts/open-sauce-sans-700.woff2", "fonts/open-sauce-sans-800.woff2",
  "img/logo.svg", "img/cup-white.svg", "img/logo-white.svg", "img/icon.svg", "img/cuas-logo.png", "img/monitor.svg", "img/nudge.svg", "img/rest.svg", "img/band.png",
  "img/favicon-32.png", "img/icon-180.png", "img/icon-192.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for our own files: instant from cache, refreshed in the background
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        const fresh = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || fresh;
      })
    )
  );
});

// Tapping the notification brings the app back to the front
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) =>
      list.length ? list[0].focus() : self.clients.openWindow("./")
    )
  );
});
