// BoredOS Scramjet Service Worker v4
importScripts("./scramjet/scramjet.all.js?v=4");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      try {
        await scramjet.loadConfig();
        if (scramjet.config && scramjet.route(event)) {
          return await scramjet.fetch(event);
        }
      } catch (err) {
        console.error("Scramjet SW Fetch error:", err);
      }
      return await fetch(event.request);
    })()
  );
});
