// The offline shell: pages open from cache when the network is gone; the API is never cached.
const CACHE = "sh-ui-v1";
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(["/", "/manifest.webmanifest"]))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || /^\/(api|healthz|login|logout)/.test(u.pathname)) return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then(res => { caches.open(CACHE).then(c => c.put("/", res.clone())); return res; }).catch(() => caches.match("/")));
    return;
  }
  if (u.pathname.startsWith("/assets/")) {   // hashed file names: cache-first is safe
    e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
  }
});
