// Fietslog service worker – alleen actief via https (browsers staan dit niet toe op gewoon http).
// Doel: de app zelf (pagina, scripts, stijl, icoontjes) op het toestel bewaren, zodat ze ook opent als de NAS uit ligt.
// Ritgegevens (/api/) worden hier nooit bewaard; die regelt de app zelf met een wachtrij.
const VERSIE = "fietslog-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== VERSIE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener("message", (e) => {
  if (!e.data || e.data.type !== "cache") return;
  e.waitUntil((async () => {
    const c = await caches.open(VERSIE);
    for (const u of e.data.urls) { try { await c.add(u); } catch { /* overslaan */ } }
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  e.respondWith(req.mode === "navigate" ? paginaEerstNetwerk(req) : bestandEerstCache(req, url));
});

async function paginaEerstNetwerk(req) {
  const c = await caches.open(VERSIE);
  try {
    const res = await fetch(req);
    if (res.ok && new URL(req.url).pathname === "/") c.put("/", res.clone());
    return res;
  } catch {
    return (await c.match("/")) || Response.error();
  }
}

async function bestandEerstCache(req, url) {
  const c = await caches.open(VERSIE);
  const hit = await c.match(req);
  if (hit) {
    if (!url.pathname.startsWith("/assets/")) fetch(req).then((r) => r.ok && c.put(req, r)).catch(() => {});
    return hit;
  }
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch {
    return Response.error();
  }
}
