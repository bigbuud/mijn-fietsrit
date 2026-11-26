// Fietslog service worker – alleen actief via https (browsers staan dit niet toe op gewoon http).
// Doel: de app zelf (pagina, scripts, stijl, icoontjes) op het toestel bewaren, zodat ze ook opent als de NAS uit ligt.
// Ritgegevens (/api/) worden hier nooit bewaard; die regelt de app zelf met een wachtrij.
const VERSIE = "fietslog-v2";

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

// Achter een reverse proxy (Nginx Proxy Manager, Cloudflare) geeft een uitgeschakelde NAS geen netwerkfout maar een
// 502/503/504/52x-pagina. Dat telt dus ook als "NAS niet bereikbaar": dan tonen we de bewaarde app.
async function paginaEerstNetwerk(req) {
  const c = await caches.open(VERSIE);
  const bewaard = await c.match("/");
  try {
    const res = await fetchMetTijdslimiet(req, bewaard ? 4000 : 0);
    if (res.ok) { if (new URL(req.url).pathname === "/") c.put("/", res.clone()); return res; }
    if (res.status >= 500 && bewaard) return bewaard;
    return res;
  } catch {
    return bewaard || Response.error();
  }
}

function fetchMetTijdslimiet(req, ms) {
  if (!ms) return fetch(req);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(req, { signal: ctl.signal }).finally(() => clearTimeout(t));
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
