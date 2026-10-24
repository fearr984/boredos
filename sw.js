// BoredOS Scramjet Service Worker v6
importScripts("./scramjet/scramjet.all.js?v=6");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

const SCOPE = self.registration.scope;
const SERVICE_PREFIX = new URL("service/", SCOPE).pathname;
const WASM_PATH = new URL("scramjet/scramjet.wasm.wasm", SCOPE).pathname;

// A visible, same-origin error page is much easier to recover from than the
// static host's "Cannot GET /service/..." response. The page detects the
// marker and switches to the next Wisp node automatically.
const PROXY_ERROR_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>BoredOS proxy error</title>
<style>html,body{margin:0;height:100%;background:#111;color:#eee;font-family:Inter,system-ui,sans-serif;display:grid;place-items:center}main{max-width:420px;padding:28px;text-align:center}h1{font-size:18px;margin:0 0 10px}p{font-size:13px;line-height:1.6;color:#aaa;margin:0}</style>
</head><body data-boredos-proxy-error="1"><main><h1>The proxy could not load this page.</h1><p>BoredOS is switching proxy nodes automatically. If this message stays, press Reload or use Switch Node.<br><!--DETAIL--></p></main></body></html>`;

function proxyErrorResponse(message) {
  const detail = String(message || "The proxy request failed.")
    .replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return new Response(PROXY_ERROR_HTML.replace("<!--DETAIL-->", detail), {
    status: 502,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data.type === "CLAIM") event.waitUntil(self.clients.claim());
  if (event.data.scramjet$type === "loadConfig") {
    // Scramjet's built-in message handler stores the config on the worker
    // instance, but does not initialize the bundle-level config used by URL
    // rewriting. Reload it from IndexedDB so Nk()/the codec are initialized.
    event.waitUntil((async () => {
      scramjet.config = undefined;
      await scramjet.loadConfig();
    })());
  }
  if (event.data.type === "BOREDOS_RELOAD_CONFIG") {
    scramjet.config = undefined;
    event.waitUntil(scramjet.loadConfig());
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept ordinary app assets or third-party images. Letting the
  // browser handle those directly avoids breaking wallpaper thumbnails and
  // other cross-origin resources.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SERVICE_PREFIX) && url.pathname !== WASM_PATH) return;

  const isServiceRequest = url.pathname.startsWith(SERVICE_PREFIX);

  event.respondWith(
    (async () => {
      try {
        await scramjet.loadConfig();
        if (scramjet.config && scramjet.route(event)) {
          return await scramjet.fetch(event);
        }
        if (!isServiceRequest) return await fetch(event.request);
        console.error("Scramjet SW: no config or route for", url.pathname);
        return proxyErrorResponse("The proxy is not ready yet.");
      } catch (err) {
        console.error("Scramjet SW Fetch error:", err);
        if (!isServiceRequest) return await fetch(event.request);
        return proxyErrorResponse(err && err.message ? err.message : "The proxy request failed.");
      }
    })()
  );
});
