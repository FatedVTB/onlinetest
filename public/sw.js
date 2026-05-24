// Nightmare Ascension — Service Worker
// Cache-first strategy: serves cached assets instantly, refreshes in background.

const CACHE_NAME = "nma-v1";

// App-shell resources to pre-cache on install
const PRECACHE = [
  "/",
  "/nightmare-spell.png",
  "/manifest.json",
];

// ── Install: pre-cache shell ───────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, fall back to network ──────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests for same-origin resources
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  // Don't intercept cross-origin requests (fonts, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Serve from cache immediately, then refresh in the background
      const networkFetch = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type !== "opaque") {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => cached); // offline fallback

      return cached ?? networkFetch;
    })
  );
});
