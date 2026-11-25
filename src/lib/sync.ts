// Offline-eerst: ritten worden eerst op dit toestel bewaard (cache + wachtrij) en daarna naar de NAS gestuurd.
// Ligt de NAS uit, dan blijft alles in de wachtrij staan tot de verbinding terug is.
import { NietIngelogd } from "./auth";
import { loadRides, saveRides, type Ride } from "./rides";

export type Op = { t: "zet"; r: Ride } | { t: "weg"; id: string } | { t: "leeg" };
export type SyncResultaat = { status: "ok"; ritten: Ride[] } | { status: "offline" };

const CACHE = "fietslog-cache";
const QUEUE = "fietslog-wachtrij";
const BACKUP = "fietslog-backup-nodig";
const OUD = "fietslog-ritten"; // ritten die ooit alleen op de gsm stonden

function lees<T>(k: string, standaard: T): T {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : standaard; } catch { return standaard; }
}
function schrijf(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* opslag vol of geblokkeerd */ }
}

export const lokaleRitten = (): Ride[] => lees<Ride[]>(CACHE, []);
export const wachtrij = (): Op[] => lees<Op[]>(QUEUE, []);
export function aantalWachtend(): number {
  return new Set(wachtrij().map((o) => (o.t === "zet" ? o.r.id : o.t === "weg" ? o.id : "__leeg__"))).size;
}
export function wisLokaleData() {
  try { localStorage.removeItem(CACHE); localStorage.removeItem(QUEUE); localStorage.removeItem(BACKUP); } catch { /* niets */ }
}

/** Past de wijzigingen toe op een lijst ritten (volgorde van de wachtrij). */
export function pasToe(lijst: Ride[], ops: Op[]): Ride[] {
  let uit = [...lijst];
  for (const o of ops) {
    if (o.t === "leeg") { uit = []; continue; }
    if (o.t === "weg") { uit = uit.filter((r) => r.id !== o.id); continue; }
    const i = uit.findIndex((r) => r.id === o.r.id);
    if (i >= 0) uit[i] = o.r; else uit.push(o.r);
  }
  return uit;
}

/** Legt het verschil tussen oude en nieuwe lijst vast in de wachtrij en bewaart de nieuwe lijst lokaal. */
export function plaatsInWachtrij(oud: Ride[], nieuw: Ride[], backup = false) {
  const was = new Map(oud.map((r) => [r.id, JSON.stringify(r)]));
  const ops: Op[] = [];
  for (const r of nieuw) if (was.get(r.id) !== JSON.stringify(r)) ops.push({ t: "zet", r });
  const nu = new Set(nieuw.map((r) => r.id));
  for (const r of oud) if (!nu.has(r.id)) ops.push({ t: "weg", id: r.id });
  if (ops.length) schrijf(QUEUE, [...wachtrij(), ...ops]);
  if (backup) schrijf(BACKUP, true);
  schrijf(CACHE, nieuw);
}

/** Verwijdert alle ritten (ook op de NAS, zodra die bereikbaar is). De server maakt eerst een back-up. */
export function plaatsLeegInWachtrij() {
  schrijf(QUEUE, [...wachtrij(), { t: "leeg" } satisfies Op]);
  schrijf(BACKUP, true);
  schrijf(CACHE, []);
}

async function eenRonde(): Promise<SyncResultaat> {
  const oud = loadRides();
  const ops: Op[] = [...oud.map((r): Op => ({ t: "zet", r })), ...wachtrij()];
  const backup = lees<boolean>(BACKUP, false);

  let res: Response;
  try { res = await fetch("/api/rides", { credentials: "same-origin" }); } catch { return { status: "offline" }; }
  if (res.status === 401) throw new NietIngelogd();
  if (!res.ok) return { status: "offline" };
  const server = (await res.json()) as Ride[];
  const samen = pasToe(server, ops);

  if (ops.length) {
    try { await saveRides(samen, { backup }); }
    catch (e) { if (e instanceof NietIngelogd) throw e; return { status: "offline" }; }
    if (oud.length) { try { localStorage.removeItem(OUD); } catch { /* niets */ } }
    schrijf(QUEUE, wachtrij().slice(ops.length - oud.length));
    if (backup) schrijf(BACKUP, false);
  }
  const nu = pasToe(samen, wachtrij());
  schrijf(CACHE, nu);
  return { status: "ok", ritten: nu };
}

let bezig: Promise<SyncResultaat> | null = null;
/** Haalt de ritten van de NAS en stuurt wachtende wijzigingen door. Meerdere aanroepen tegelijk delen één ronde. */
export function synchroniseer(): Promise<SyncResultaat> {
  if (bezig) return bezig;
  bezig = (async () => {
    let r = await eenRonde();
    // Wijzigingen die tijdens de ronde bijkwamen meteen ook versturen.
    while (r.status === "ok" && wachtrij().length) r = await eenRonde();
    return r;
  })().finally(() => { bezig = null; });
  return bezig;
}
