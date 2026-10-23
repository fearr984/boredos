// BoredOS Scramjet Service Worker v5
importScripts("./scramjet/scramjet.all.js?v=5");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

const SCOPE = self.registration.scope;
const SERVICE_PREFIX = new URL("service/", SCOPE).pathname;
const WASM_PATH = new URL("scramjet/scramjet.wasm.wasm", SCOPE).pathname;

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data.type === "CLAIM") event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept ordinary app assets or third-party images. Letting the
  // browser handle those directly avoids breaking wallpaper thumbnails and
  // other cross-origin resources.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SERVICE_PREFIX) && url.pathname !== WASM_PATH) return;

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
