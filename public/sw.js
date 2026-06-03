// Tymbr service worker — enables installability and basic offline resilience.
const CACHE = "tymbr-v1";
const ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never cache API or auth traffic — always go to the network.
  if (url.pathname.startsWith("/api/")) return;
  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cache if offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((r) => r || caches.match("/dashboard")))
    );
    return;
  }

  // Static assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return res;
        }).catch(() => cached)
    )
  );
});
