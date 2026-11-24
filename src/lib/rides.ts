import { NietIngelogd } from "./auth";
export type Weer = "zonnig" | "te warm" | "te koud" | "regen" | "bewolkt" | "wind";
export type Gevoel = "zeer goed" | "goed" | "matig" | "slecht";
export const WEER: { v: Weer; e: string }[] = [
  { v: "zonnig", e: "☀️" }, { v: "te warm", e: "🥵" }, { v: "te koud", e: "🥶" },
  { v: "regen", e: "🌧️" }, { v: "bewolkt", e: "☁️" }, { v: "wind", e: "💨" },
];
export const GEVOEL: { v: Gevoel; e: string; score: number }[] = [
  { v: "zeer goed", e: "😄", score: 4 }, { v: "goed", e: "🙂", score: 3 },
  { v: "matig", e: "😐", score: 2 }, { v: "slecht", e: "😣", score: 1 },
];
export interface Ride { id: string; datum: string; km: number; minuten: number; opmerking: string; weer: Weer | ""; gevoel: Gevoel | ""; }
const KEY = "fietslog-ritten";
/** Uniek id. crypto.randomUUID bestaat alleen op https/localhost; op http://nas:5252 niet, daarom een terugval. */
export function nieuwId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
export function loadRides(): Ride[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export async function fetchRides(): Promise<Ride[]> {
  const res = await fetch("/api/rides", { credentials: "same-origin" });
  if (res.status === 401) throw new NietIngelogd();
  if (!res.ok) throw new Error("Server niet bereikbaar");
  const server: Ride[] = await res.json();
  const local = loadRides();
  // Eenmalig: ritten die nog lokaal op de gsm stonden naar de server overzetten.
  if (local.length) {
    const ids = new Set(server.map((r) => r.id));
    const merged = [...server, ...local.filter((r) => !ids.has(r.id))];
    await saveRides(merged);
    localStorage.removeItem(KEY);
    return merged;
  }
  return server;
}
/** backup: true → de server bewaart eerst een kopie van de huidige ritten (bv. voor een import). */
export async function saveRides(r: Ride[], opties: { backup?: boolean } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (opties.backup) headers["x-backup"] = "1";
  const res = await fetch("/api/rides", { method: "PUT", credentials: "same-origin", headers, body: JSON.stringify(r) });
  if (res.status === 401) throw new NietIngelogd();
  if (!res.ok) throw new Error("Opslaan mislukt");
}
export function ridesToCsv(rides: Ride[]) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ["Datum", "Afstand (km)", "Tijd (min)", "Tijd", "Snelheid (km/u)", "Opmerking", "Weer", "Gevoel"];
  const rows = [...rides].sort((a, b) => a.datum.localeCompare(b.datum)).map((r) =>
    [r.datum, r.km.toFixed(1).replace(".", ","), r.minuten, fmtTijd(r.minuten), snelheid(r.km, r.minuten).toFixed(1).replace(".", ","), r.opmerking, r.weer, r.gevoel].map(q).join(";"));
  return "\uFEFF" + [head.map(q).join(";"), ...rows].join("\r\n");
}
export function downloadCsv(rides: Ride[]) {
  const blob = new Blob([ridesToCsv(rides)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `fietsritten-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function fmtTijd(min: number) { const h = Math.floor(min / 60), m = Math.round(min % 60); return `${h}u${String(m).padStart(2, "0")}`; }
export function snelheid(km: number, min: number) { return min > 0 ? km / (min / 60) : 0; }
export const MAANDEN = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
