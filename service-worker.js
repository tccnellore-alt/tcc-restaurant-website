importScripts("/manager-firebase-config.js");
importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js");
const tccFirebaseConfigured = self.TCC_FIREBASE_CONFIG?.apiKey && !self.TCC_FIREBASE_CONFIG.apiKey.startsWith("REPLACE_");
if (tccFirebaseConfigured) {
  firebase.initializeApp(self.TCC_FIREBASE_CONFIG);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    const data = payload.data || {};
    return self.registration.showNotification(data.title || "TCC · New order", {
      body: data.body || "A new customer order is waiting.", icon: "/tcc-manager-icon.svg", badge: "/tcc-manager-icon.svg",
      tag: data.orderId ? "tcc-order-" + data.orderId : "tcc-new-order", renotify: true, vibrate: [250,120,250],
      data: { url: data.url || "/orders.html", orderId: data.orderId || "" }
    });
  });
}
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/orders.html", self.location.origin).href;
  event.waitUntil((async () => {
    const list = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of list) if (new URL(client.url).origin === self.location.origin) { await client.navigate(target); return client.focus(); }
    return clients.openWindow(target);
  })());
});
const CACHE = "tcc-manager-shell-v1";
const SHELL = ["/orders.html", "/orders-dashboard.css", "/orders-dashboard.js", "/tcc-manager-pwa.css", "/manager-firebase-config.js", "/tcc-manager-push.js", "/tcc-manager-icon.svg", "/manager.webmanifest"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/functions/")) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(hit => hit || caches.match("/orders.html"))));
});
