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
