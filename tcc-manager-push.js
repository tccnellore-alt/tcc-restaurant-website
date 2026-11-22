import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging.js";
(() => {
  const API = "https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-manager-push";
  const ORDERS_API = "https://pcxsdypqlavtulidpydn.supabase.co/functions/v1/tcc-orders";
  const PUBLIC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjeHNkeXBxbGF2dHVsaWRweWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2NzM3MjcsImV4cCI6MjExMDI0OTcyN30.RJ6Q8gcGbC-cfX93oG-6Y7-YGpNkUCDzkrDioTHgM_A";
  const SESSION_KEY = "tccOrderDeskSessionV1";
  const CONFIG = window.TCC_FIREBASE_CONFIG;
  const VAPID = window.TCC_FIREBASE_VAPID_KEY;
  const validConfig = CONFIG && CONFIG.apiKey && !CONFIG.apiKey.startsWith("REPLACE_") && VAPID && !VAPID.startsWith("REPLACE_");
  let messaging = null;
  const session = () => localStorage.getItem(SESSION_KEY) || "";
  const ready = () => !!session() && !document.querySelector("#dashboardView")?.hidden;
  async function api(action, body) {
    const response = await fetch(API + "?action=" + action, {
      method: "POST", headers: { "Content-Type": "application/json", apikey: PUBLIC_KEY, Authorization: "Bearer " + PUBLIC_KEY, "x-tcc-admin-session": session() },
      body: JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not update mobile notifications.");
    return data;
  }
  function showStatus(message, error = false) {
    const status = document.querySelector("#tccPushStatus");
    if (status) { status.textContent = message; status.dataset.error = String(error); }
  }
  async function enablePush() {
    if (!validConfig) { showStatus("Firebase setup is not finished yet. Ask the TCC administrator to complete app configuration.", true); return; }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) { showStatus("This browser does not support app notifications. Install TCC Manager in Chrome on Android.", true); return; }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { showStatus("Notifications are blocked. Allow them in Android app settings.", true); return; }
      const supported = await isSupported();
      if (!supported) throw new Error("Firebase push is not supported by this browser.");
      const app = getApps().length ? getApps()[0] : initializeApp(CONFIG);
      messaging = getMessaging(app);
      const sw = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const token = await getToken(messaging, { vapidKey: VAPID, serviceWorkerRegistration: sw });
      if (!token) throw new Error("Firebase did not return a device registration.");
      localStorage.setItem("tccManagerFcmToken", token);
      await api("register", { token, manager_username: localStorage.getItem("tccOrderDeskManager") || "manager", device_name: navigator.userAgent.slice(0, 180) });
      showStatus("This phone is registered for TCC order alerts.");
      document.querySelector("#tccEnablePush").textContent = "Notifications enabled";
      document.querySelector("#tccEnablePush").disabled = true;
      onMessage(messaging, payload => {
        const data = payload.data || {};
        const title = payload.notification?.title || "TCC · New order";
        const body = payload.notification?.body || "A new customer order is waiting.";
        if (document.visibilityState === "visible") {
          const notice = new Notification(title, { body, icon: "/tcc-manager-icon.svg", tag: data.orderId || "tcc-order" });
          notice.onclick = () => { window.focus(); if (data.orderId) location.href = "/orders.html?order=" + encodeURIComponent(data.orderId); };
        }
      });
    } catch (error) { console.error("TCC push setup:", error); showStatus(error.message || "Could not enable notifications.", true); }
  }
  function mount() {
    const topbar = document.querySelector(".topbar-actions");
    if (!topbar || document.querySelector("#tccEnablePush") || !ready()) return;
    const installButton = document.createElement("button");
    installButton.id = "tccInstallApp"; installButton.type = "button"; installButton.className = "quiet"; installButton.textContent = "Install TCC Manager"; installButton.hidden = true;
    installButton.addEventListener("click", async () => { if (window.__tccInstallPrompt) { window.__tccInstallPrompt.prompt(); await window.__tccInstallPrompt.userChoice; window.__tccInstallPrompt = null; installButton.hidden = true; } else showStatus("In Chrome, open ⋮ menu and choose Install app or Add to Home screen."); });
    topbar.insertBefore(installButton, topbar.firstChild);
    const button = document.createElement("button");
    button.id = "tccEnablePush"; button.type = "button"; button.className = "quiet";
    button.textContent = Notification.permission === "granted" ? "Enable order alerts on this phone" : "Enable mobile notifications";
    button.addEventListener("click", enablePush);
    topbar.insertBefore(button, topbar.firstChild);
    const status = document.createElement("small"); status.id = "tccPushStatus"; status.className = "tcc-push-status"; status.setAttribute("role", "status");
    topbar.parentElement.append(status);
    if (!validConfig) showStatus("Firebase setup pending — mobile push will activate after configuration.");
  }
  window.addEventListener("beforeinstallprompt", event => { event.preventDefault(); window.__tccInstallPrompt = event; mount(); const install = document.querySelector("#tccInstallApp"); if (install) install.hidden = false; });
  window.addEventListener("appinstalled", () => { const install = document.querySelector("#tccInstallApp"); if (install) install.remove(); });
  window.TCC_MANAGER_UNREGISTER_PUSH = async () => { const token = localStorage.getItem("tccManagerFcmToken"); if (token && session()) { try { await api("unregister", { token }); } catch (error) { console.warn("Could not unregister this phone from TCC alerts:", error); } } localStorage.removeItem("tccManagerFcmToken"); };
  const observer = new MutationObserver(mount);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  document.addEventListener("DOMContentLoaded", mount);
  window.addEventListener("storage", mount);
  setInterval(() => { if (!session()) { const b=document.querySelector("#tccEnablePush"); if(b) b.remove(); } else mount(); }, 3000);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(console.warn);
})();
