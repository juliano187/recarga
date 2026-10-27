const SW_VERSION = "unitv-pwa-v2";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SW_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SW_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.mode === "navigate") {
          const copy = response.clone();
          caches.open(SW_VERSION).then((cache) => cache.put("/", copy));
        }
        return response;
      })
      .catch(async () => {
        if (request.mode === "navigate") {
          const cache = await caches.open(SW_VERSION);
          const cached = await cache.match("/");
          if (cached) return cached;
        }
        const cache = await caches.open(SW_VERSION);
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error("offline");
      }),
  );
});