/* TCC Manager background push worker. */
importScripts("/manager-firebase-config.js");
importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js");
firebase.initializeApp(self.TCC_FIREBASE_CONFIG);
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = payload.notification?.title || "TCC · New order";
  const options = {
    body: payload.notification?.body || "A new customer order is waiting.",
    icon: "/tcc-manager-icon.svg",
    badge: "/tcc-manager-icon.svg",
    tag: data.orderId ? "tcc-order-" + data.orderId : "tcc-new-order",
    renotify: true,
    vibrate: [250, 120, 250],
    data: { url: data.url || "/orders.html", orderId: data.orderId || "" }
  };
  return self.registration.showNotification(title, options);
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/orders.html", self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
