import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// De service worker is gewone JS in /public; hier draaien we hem met nagebootste browser-onderdelen.
type FetchHandler = (e: { request: Request; respondWith: (p: Promise<Response>) => void }) => void;

function laadSw(netwerk: (req: Request) => Promise<Response>, opslag: Map<string, Response>) {
  let handler: FetchHandler | undefined;
  const cache = {
    match: async (r: Request | string) => opslag.get(typeof r === "string" ? r : r.url)?.clone(),
    put: async (r: Request | string, res: Response) => { opslag.set(typeof r === "string" ? r : r.url, res); },
    add: async () => {},
  };
  const self = { addEventListener: (t: string, f: FetchHandler) => { if (t === "fetch") handler = f; }, skipWaiting: () => {}, clients: { claim: async () => {} } };
  const fn = new Function("self", "caches", "fetch", "location", "Response", "AbortController", "setTimeout", "clearTimeout", readFileSync("public/sw.js", "utf8"));
  fn(self, { open: async () => cache, keys: async () => [], delete: async () => true }, netwerk, new URL("https://fietslog.example"), Response, AbortController, setTimeout, clearTimeout);
  return async (req: Request): Promise<Response | undefined> => { let p: Promise<Response> | undefined; handler!({ request: req, respondWith: (x) => { p = x; } }); return p; };
}

const pagina = () => Object.defineProperty(new Request("https://fietslog.example/"), "mode", { value: "navigate" });

describe("service worker", () => {
  let opslag: Map<string, Response>;
  beforeEach(() => { opslag = new Map([["/", new Response("<html>bewaarde app</html>")]]); });

  it("toont de bewaarde app als de reverse proxy een 502 teruggeeft (container gestopt)", async () => {
    const sw = laadSw(async () => new Response("Bad Gateway", { status: 502 }), opslag);
    expect(await (await sw(pagina()))!.text()).toContain("bewaarde app");
  });

  it("toont de bewaarde app bij een echte netwerkfout", async () => {
    const sw = laadSw(async () => { throw new TypeError("Failed to fetch"); }, opslag);
    expect(await (await sw(pagina()))!.text()).toContain("bewaarde app");
  });

  it("gebruikt de verse pagina als de NAS bereikbaar is en bewaart ze", async () => {
    const sw = laadSw(async () => new Response("<html>nieuwe versie</html>"), opslag);
    expect(await (await sw(pagina()))!.text()).toContain("nieuwe versie");
    expect(await opslag.get("/")!.text()).toContain("nieuwe versie");
  });

  it("raakt API-verzoeken niet aan", async () => {
    const f = vi.fn();
    const sw = laadSw(f, opslag);
    expect(await sw(new Request("https://fietslog.example/api/rides"))).toBeUndefined();
    expect(f).not.toHaveBeenCalled();
  });
});
