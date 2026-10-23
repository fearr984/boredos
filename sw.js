// Scramjet Service Worker for BoredOS
importScripts("./scramjet/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
