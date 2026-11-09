/**
 * Service Worker — Revente Jean-Bouin (Paris FC)
 * Stratégie : Network-first avec cache de secours pour les assets statiques.
 */

const CACHE_NAME = "pfc-revente-v1";

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
      .then(cache => cache.addAll(PRECACHE))
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
  // Ne pas intercepter Firebase / Firestore
  if (event.request.url.includes("firestore") || event.request.url.includes("firebase")) return;
  if (event.request.url.includes("fonts.googleapis") || event.request.url.includes("fonts.gstatic")) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== "opaque") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
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
