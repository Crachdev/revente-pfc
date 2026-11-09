/**
 * Service Worker — Revente Jean-Bouin (Paris FC)
 * Stratégie : Network-first avec cache de secours pour les assets statiques.
 */

const CACHE_NAME = "pfc-revente-v3";

// Bibliothèques tierces à garder pour un démarrage hors connexion
const LIBS = [
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];
const isLib = u => LIBS.indexOf(u) >= 0;

// Assets à précacher au premier install
const PRECACHE = [
  "/revente-pfc/",
  "/revente-pfc/index.html",
  "/revente-pfc/config.js",
  "/revente-pfc/icons/icon-192.png",
  "/revente-pfc/icons/icon-512.png",
  "/revente-pfc/manifest.json"
];

/* ── Install ── */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE).then(() => Promise.all(LIBS.map(u =>
        fetch(new Request(u, { mode: "no-cors" })).then(r => cache.put(u, r)).catch(() => {})))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

/* ── Activate ── */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch : Network-first, fallback cache ── */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = event.request.url;
  // Ne pas intercepter les appels de données Firebase (API Firestore / Auth) ni les polices
  if (/firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|googleapis\.com\/(?!css)/.test(url) && !isLib(url)) return;
  if (url.includes("fonts.googleapis") || url.includes("fonts.gstatic")) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && ((response.status === 200 && response.type !== "opaque") || (isLib(url) && response.type === "opaque"))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});

/* ── Notifications locales ── */
self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "PFC_NOTIFY") return;
  const matches = event.data.matches || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const soon = matches.filter(m => {
    if (!m.date) return false;
    const d = new Date(m.date + "T12:00:00");
    return d >= today && d <= in7;
  });
  if (!soon.length) return;
  const titles = soon.map(m => m.opp).join(", ");
  const body = soon.length === 1
    ? "1 match à revendre cette semaine : " + titles
    : soon.length + " matchs à revendre cette semaine : " + titles;
  event.waitUntil(
    self.registration.showNotification("Paris FC – Revente", {
      body,
      icon: "/revente-pfc/icons/icon-192.png",
      badge: "/revente-pfc/icons/icon-192.png",
      tag: "pfc-weekly",
      renotify: false
    })
  );
});

/* ── Notifications push (Firebase Cloud Messaging, messages « data » envoyés par GitHub Actions) ── */
self.addEventListener("push", event => {
  let d = {};
  try { const j = event.data ? event.data.json() : {}; d = j.data || j.notification || j || {}; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(d.title || "Paris FC – Revente", {
      body: d.body || "Une action est à faire.",
      icon: "/revente-pfc/icons/icon-192.png",
      badge: "/revente-pfc/icons/icon-192.png",
      tag: "pfc-push",
      data: { url: d.url || "/revente-pfc/" }
    })
  );
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/revente-pfc/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) { if (c.url.indexOf("/revente-pfc/") >= 0 && "focus" in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
