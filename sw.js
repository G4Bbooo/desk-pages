const CACHE = "desk-v25";
const SHELL = ["./", "index.html", "app.css", "app.js", "chart.js", "app.css?v=25", "app.js?v=25", "chart.js?v=25", "manifest.json", "icons/icon-192.png", "icons/logo-64.png", "icons/logo-128.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  // never cache live data (Pages /d/, raw github live branch, jsDelivr, ntfy SSE, DexScreener, tunnels)
  if (u.pathname.includes("/d/") || u.hostname.includes("raw.githubusercontent.com") || u.hostname.includes("jsdelivr.net") || u.hostname.includes("ntfy.sh") || u.hostname.includes("ntfy.envs.net") ||
      u.hostname.includes("dexscreener.com") || u.hostname.includes("trycloudflare.com") || u.hostname.includes("loca.lt")) return;
  if (u.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data.json(); } catch (_) { d = { title: "Fomo Desk", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Fomo Desk", { body: d.body || "", data: { url: d.url }, icon: "icons/icon-192.png" }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data && e.notification.data.url;
  if (url && url.startsWith("https://")) e.waitUntil(clients.openWindow(url));
});
