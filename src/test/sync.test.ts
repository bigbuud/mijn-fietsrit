import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aantalWachtend, lokaleRitten, plaatsInWachtrij, plaatsLeegInWachtrij, synchroniseer } from "@/lib/sync";
import type { Ride } from "@/lib/rides";

const rit = (id: string, km = 10): Ride => ({ id, datum: "2026-11-24", km, minuten: 30, opmerking: "", weer: "", gevoel: "" });
const json = (d: unknown) => new Response(JSON.stringify(d), { status: 200, headers: { "content-type": "application/json" } });

describe("offline wachtrij", () => {
  let server: Ride[];
  let online: boolean;
  let puts: Ride[][];
  beforeEach(() => {
    localStorage.clear();
    server = []; online = true; puts = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
      if (!online) throw new TypeError("Failed to fetch");
      if (init?.method === "PUT") { server = JSON.parse(String(init.body)); puts.push(server); return json({ ok: true }); }
      return json(server);
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("bewaart een rit lokaal als de NAS uit ligt en stuurt hem later door", async () => {
    online = false;
    plaatsInWachtrij([], [rit("a")]);
    expect((await synchroniseer()).status).toBe("offline");
    expect(aantalWachtend()).toBe(1);
    expect(lokaleRitten().map((r) => r.id)).toEqual(["a"]);
    expect(puts).toHaveLength(0);

    online = true;
    const res = await synchroniseer();
    expect(res.status).toBe("ok");
    expect(server.map((r) => r.id)).toEqual(["a"]);
    expect(aantalWachtend()).toBe(0);
  });

  it("behoudt ritten die intussen op een ander toestel zijn toegevoegd", async () => {
    online = false;
    plaatsInWachtrij([], [rit("gsm")]);
    online = true;
    server = [rit("tablet")];
    await synchroniseer();
    expect(server.map((r) => r.id).sort()).toEqual(["gsm", "tablet"]);
  });

  it("past ook wijzigingen en verwijderingen toe die offline gebeurden", async () => {
    server = [rit("a", 10), rit("b", 20)];
    online = false;
    plaatsInWachtrij([rit("a", 10), rit("b", 20)], [rit("a", 12)]); // a gewijzigd, b weg
    online = true;
    await synchroniseer();
    expect(server).toEqual([rit("a", 12)]);
  });

  it("stuurt niets door als er niets wacht", async () => {
    server = [rit("a")];
    const res = await synchroniseer();
    expect(res.status).toBe("ok");
    expect(puts).toHaveLength(0);
  });

  it("vraagt een back-up bij een import", async () => {
    const headers: Record<string, string>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
      if (init?.method === "PUT") { headers.push(init.headers as Record<string, string>); return json({ ok: true }); }
      return json([]);
    }));
    plaatsInWachtrij([], [rit("x")], true);
    await synchroniseer();
    expect(headers[0]?.["x-backup"]).toBe("1");
  });

  it("verwijdert alle ritten, ook die enkel op de NAS stonden, met een back-up", async () => {
    server = [rit("a"), rit("b"), rit("andere-gsm")];
    const headers: Record<string, string>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
      if (init?.method === "PUT") { headers.push(init.headers as Record<string, string>); server = JSON.parse(String(init.body)); return json({ ok: true }); }
      return json(server);
    }));
    plaatsLeegInWachtrij();
    expect(lokaleRitten()).toEqual([]);
    const res = await synchroniseer();
    expect(res).toEqual({ status: "ok", ritten: [] });
    expect(server).toEqual([]);
    expect(headers[0]?.["x-backup"]).toBe("1");
    expect(aantalWachtend()).toBe(0);
  });
});
