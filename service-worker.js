const CACHE = "tcc-manager-shell-v1";
const SHELL = ["/orders.html", "/orders-dashboard.css", "/orders-dashboard.js", "/tcc-manager-icon.svg", "/manager.webmanifest"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/functions/")) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(hit => hit || caches.match("/orders.html"))));
});
