// Oude ritten importeren uit Excel (.xlsx) of CSV.
// Alles gebeurt in de browser; dit bestand bevat enkel de (testbare) leeslogica.
import type { Gevoel, Ride, Weer } from "./rides";

export type Cel = string | number | boolean | Date | null | undefined;
export type Rij = Cel[];
export type Veld = "datum" | "km" | "tijd" | "snelheid" | "opmerking" | "weer" | "gevoel";
export type Koppeling = Record<Veld, number | null>;
export type Eenheid = "min" | "uur" | null;

export const VELDEN: { v: Veld; label: string }[] = [
  { v: "datum", label: "Datum" },
  { v: "km", label: "Afstand (km)" },
  { v: "tijd", label: "Tijd" },
  { v: "snelheid", label: "Snelheid (km/u)" },
  { v: "opmerking", label: "Opmerking / route" },
  { v: "weer", label: "Weer" },
  { v: "gevoel", label: "Gevoel" },
];

const leegKoppeling = (): Koppeling => ({ datum: null, km: null, tijd: null, snelheid: null, opmerking: null, weer: null, gevoel: null });
const leeg = (c: Cel) => c === null || c === undefined || (typeof c === "string" && c.trim() === "");
const tekst = (c: Cel) => (c instanceof Date ? c.toISOString().slice(0, 10) : String(c ?? "").trim());
const norm = (v: Cel) =>
  tekst(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const n = (x: string | undefined) => Number(x ?? 0);

// ───────────────────────── CSV ─────────────────────────
export function parseCsv(invoer: string): Rij[] {
  const t = invoer.replace(/^\uFEFF/, "");
  const eerste = t.split(/\r?\n/).filter((l) => l.trim()).slice(0, 5);
  const tel = (d: string) => eerste.reduce((s, l) => s + (l.split(d).length - 1), 0);
  const delim = [";", ",", "\t"].reduce((best, d) => (tel(d) > tel(best) ? d : best), ";");
  const rijen: string[][] = [];
  let rij: string[] = [];
  let cel = "";
  let inQ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (inQ) {
      if (c === '"') { if (t[i + 1] === '"') { cel += '"'; i++; } else inQ = false; }
      else cel += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { rij.push(cel); cel = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      rij.push(cel); cel = ""; rijen.push(rij); rij = [];
    } else cel += c;
  }
  if (cel !== "" || rij.length) { rij.push(cel); rijen.push(rij); }
  return rijen.map((r) => r.map((v) => (v.trim() === "" ? null : v.trim())));
}

// ───────────────────────── kolommen herkennen ─────────────────────────
const HERKEN: [Veld, RegExp][] = [
  ["snelheid", /snelheid|\bkm u\b|\bkmu\b|\bkmh\b|speed/],
  ["datum", /datum|\bdate\b|\bdag\b|wanneer/],
  ["km", /afstand|kilometer|\bkm\b|distance|\bdist\b/],
  ["tijd", /\btijd|duur|\btime\b|duration|\buur\b|uren|\bmin\b|minuten/],
  ["opmerking", /opmerking|route|notitie|omschrijving|beschrijving|comment|traject|bestemming|\bnaam\b|\binfo\b/],
  ["weer", /\bweer\b|weather/],
  ["gevoel", /gevoel|feeling|beleving/],
];

function koppelRij(rij: Rij): Koppeling {
  const k = leegKoppeling();
  rij.forEach((c, i) => {
    const h = norm(c);
    if (!h) return;
    for (const [veld, re] of HERKEN) {
      if (k[veld] === null && re.test(h)) { k[veld] = i; break; }
    }
  });
  return k;
}
const aantal = (k: Koppeling) => Object.values(k).filter((v) => v !== null).length;

/** Zoekt de kopregel (mag onder een titel staan). Zonder kopregel: kolomvolgorde datum, km, tijd, opmerking, weer, gevoel. */
export function vindKoppen(rijen: Rij[]): { kopRij: number; koppeling: Koppeling } {
  let best = { score: 0, kop: -1, k: leegKoppeling() };
  for (let i = 0; i < Math.min(rijen.length, 15); i++) {
    const k = koppelRij(rijen[i] ?? []);
    const score = aantal(k);
    if (score > best.score) best = { score, kop: i, k };
  }
  if (best.score >= 2 && (best.k.datum !== null || best.k.km !== null)) return { kopRij: best.kop, koppeling: best.k };
  const kolommen = Math.max(0, ...rijen.slice(0, 15).map((r) => r.length));
  const pos = (i: number) => (i < kolommen ? i : null);
  return { kopRij: -1, koppeling: { datum: pos(0), km: pos(1), tijd: pos(2), snelheid: null, opmerking: pos(3), weer: pos(4), gevoel: pos(5) } };
}

/** Is de kolom in minuten of uren uitgedrukt, volgens de kolomkop (bv. "Tijd (min)")? */
export function eenheidUitKop(kop: Cel): Eenheid {
  const h = norm(kop);
  if (/\bmin\b|minuten/.test(h)) return "min";
  if (/\buur\b|uren|\bu\b|\bh\b/.test(h)) return "uur";
  return null;
}

// ───────────────────────── waarden lezen ─────────────────────────
const MAANDNAMEN: Record<string, number> = { jan: 1, feb: 2, maa: 3, mrt: 3, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12 };

function maakDatum(y: number, m: number, d: number): string | null {
  const jaar = new Date().getFullYear();
  if (y < 1970 || y > jaar + 1) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
const jaar4 = (j: number) => (j < 100 ? (j < 70 ? 2000 + j : 1900 + j) : j);

/** Geeft "JJJJ-MM-DD" of null. Dag eerst bij 3/4/2023 (Belgische schrijfwijze). */
export function parseDatum(c: Cel): string | null {
  if (leeg(c)) return null;
  if (c instanceof Date) return isNaN(c.getTime()) ? null : maakDatum(c.getUTCFullYear(), c.getUTCMonth() + 1, c.getUTCDate());
  if (typeof c === "number") {
    if (c < 20000 || c > 80000) return null; // Excel-datumnummer
    const t = new Date(Math.round((c - 25569) * 86400000));
    return maakDatum(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }
  if (typeof c !== "string") return null;
  let s = c.trim().toLowerCase();
  s = s.replace(/^[a-z]+\.?,?\s+(?=\d)/, ""); // "zo 2 april 2023" → "2 april 2023"
  let m = s.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})(?!\d)/);
  if (m) return maakDatum(n(m[1]), n(m[2]), n(m[3]));
  m = s.match(/^(\d{1,2})[-/. ]+(\d{1,2})[-/. ]+(\d{2}|\d{4})(?!\d)/);
  if (m) {
    const a = n(m[1]), b = n(m[2]), y = jaar4(n(m[3]));
    return maakDatum(y, b, a) ?? (b > 12 && a <= 12 ? maakDatum(y, a, b) : null); // dag-maand, of maand-dag als dat onmogelijk is
  }
  m = s.match(/^(\d{1,2})\s*[-. ]?\s*([a-z]{3,})\.?[-. ,]*\s*(\d{2}|\d{4})(?!\d)/);
  if (m) {
    const mnd = MAANDNAMEN[(m[2] ?? "").slice(0, 3)];
    if (mnd) return maakDatum(jaar4(n(m[3])), mnd, n(m[1]));
  }
  return null;
}

/** "42,5", "61,2 km", "1.234,5", 42.5 → getal */
export function parseGetal(c: Cel): number | null {
  if (typeof c === "number") return isFinite(c) ? c : null;
  if (typeof c !== "string") return null;
  let s = c.toLowerCase().replace(/\u00a0/g, " ").replace(/(km\/u|km\/h|kmh|km|kilometers?|u|h)\b\.?/g, "").replace(/\s+/g, "");
  if (!/^[\d.,]+$/.test(s)) return null;
  const punt = s.lastIndexOf("."), komma = s.lastIndexOf(",");
  if (punt >= 0 && komma >= 0) s = punt > komma ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  else if (komma >= 0) s = s.replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  const v = Number(s);
  return isFinite(v) ? v : null;
}

function getalNaarMinuten(x: number, eenheid: Eenheid): number {
  if (eenheid === "min") return Math.round(x);
  if (eenheid === "uur") return Math.round(x * 60);
  if (x > 0 && x < 1) return Math.round(x * 1440); // Excel-tijd = deel van een dag
  if (x >= 1 && x <= 12) return Math.round(x * 60); // 1–12 zonder eenheid = uren
  return Math.round(x); // anders minuten
}

/** Tijd naar minuten: "1:40", "1u40", "3h05m", "100 min", "1,5 uur", Excel-tijd, … */
export function parseTijd(c: Cel, eenheid: Eenheid = null): number | null {
  if (leeg(c)) return null;
  if (c instanceof Date) {
    const min = (c.getTime() - Date.UTC(1899, 11, 30)) / 60000;
    return min > 0 ? Math.round(min) : null;
  }
  if (typeof c === "number") return getalNaarMinuten(c, eenheid);
  if (typeof c !== "string") return null;
  const s = c.trim().toLowerCase().replace(/(\d),(\d)/g, "$1.$2");
  let m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?\s*(?:u|uur|h)?$/);
  if (m) return Math.round(n(m[1]) * 60 + n(m[2]) + n(m[3]) / 60);
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:u|uur|uren|h|hr|hrs)\s*(?:(\d+(?:\.\d+)?)\s*(?:m|min|mins|minuten|')?)?$/);
  if (m) return Math.round(n(m[1]) * 60 + n(m[2]));
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minuten)$/);
  if (m) return Math.round(n(m[1]));
  if (/^\d+(\.\d+)?$/.test(s)) return getalNaarMinuten(Number(s), eenheid);
  return null;
}

export function parseWeer(c: Cel): Weer | "" {
  const raw = tekst(c);
  const h = norm(c);
  if (/🌧|☔|⛈/.test(raw) || /regen|\bnat\b|rain|\bbui|motregen/.test(h)) return "regen";
  if (/🥶|❄/.test(raw) || /koud|\bkil\b|vorst|cold|vries/.test(h)) return "te koud";
  if (/🥵|🔥/.test(raw) || /warm|heet|\bhot\b/.test(h)) return "te warm";
  if (/💨|🌬/.test(raw) || /wind/.test(h)) return "wind";
  if (/☁|⛅|🌥/.test(raw) || /bewolkt|wolk|grijs|cloud/.test(h)) return "bewolkt";
  if (/☀|🌞/.test(raw) || /\bzon|sun|helder/.test(h)) return "zonnig";
  return "";
}

export function parseGevoel(c: Cel): Gevoel | "" {
  const raw = tekst(c);
  const h = norm(c);
  if (typeof c === "number" || /^\d(?:\s*\d+)?$/.test(h)) {
    const v = typeof c === "number" ? c : Number(h.split(" ")[0]);
    if (v >= 5) return "zeer goed";
    if (v >= 4) return "goed";
    if (v >= 3) return "matig";
    if (v >= 1) return "slecht";
    return "";
  }
  if (/😄|😁|🤩|😍/.test(raw)) return "zeer goed";
  if (/🙂|😊|😀/.test(raw)) return "goed";
  if (/😐|😕/.test(raw)) return "matig";
  if (/😣|😩|😫|😖|🥵/.test(raw)) return "slecht";
  if (/niet goed|niet zo goed/.test(h)) return "matig";
  if (/zeer goed|heel goed|super|\btop\b|uitstekend|geweldig|fantastisch|perfect|great|excellent|zalig/.test(h)) return "zeer goed";
  if (/slecht|miserabel|afgepeigerd|uitgeput|\bbad\b|verschrikkelijk/.test(h)) return "slecht";
  if (/matig|gemiddeld|zwaar|\bmoe\b|redelijk|so so/.test(h)) return "matig";
  if (/goed|prima|\bfijn\b|\bok\b|oke|good|lekker/.test(h)) return "goed";
  return "";
}

// ───────────────────────── rijen omzetten ─────────────────────────
export interface ImportItem {
  /** rijnummer in het bestand (1 = eerste rij) */
  rij: number;
  ride?: Ride;
  fout?: string;
  dubbel?: boolean;
  geenTijd?: boolean;
  geschat?: boolean;
}
export interface ImportOpties {
  /** Ontbreekt de tijd? Schat die met deze gemiddelde snelheid (km/u). Leeg = rij overslaan. */
  schatKmU?: number | null;
  id: () => string;
}

const sleutel = (datum: string, km: number, min: number) => `${datum}|${km.toFixed(1)}|${min}`;

export function leesRitten(rijen: Rij[], kopRij: number, k: Koppeling, bestaand: Ride[], opties: ImportOpties): ImportItem[] {
  const eenheid = kopRij >= 0 && k.tijd !== null ? eenheidUitKop(rijen[kopRij]?.[k.tijd]) : null;
  const gezien = new Set(bestaand.map((r) => sleutel(r.datum, r.km, r.minuten)));
  const items: ImportItem[] = [];

  for (let i = kopRij + 1; i < rijen.length; i++) {
    const rij = rijen[i] ?? [];
    const cel = (v: Veld): Cel => (k[v] === null ? null : rij[k[v]!] ?? null);
    if ([cel("datum"), cel("km"), cel("tijd"), cel("snelheid")].every(leeg)) continue; // lege of losse notitie-rij
    const nr = i + 1;
    const fout = (tekstFout: string, extra: Partial<ImportItem> = {}) => items.push({ rij: nr, fout: tekstFout, ...extra });

    const datum = parseDatum(cel("datum"));
    if (!datum) { fout(leeg(cel("datum")) ? "Geen datum" : `Datum “${tekst(cel("datum"))}” niet te lezen`); continue; }

    if (leeg(cel("km"))) { fout("Geen afstand"); continue; }
    const km = parseGetal(cel("km"));
    if (km === null) { fout(`Afstand “${tekst(cel("km"))}” niet te lezen`); continue; }
    if (km <= 0 || km > 1000) { fout(`Afstand ${km} km is onwaarschijnlijk`); continue; }

    let minuten: number | null = null;
    let geschat = false;
    if (!leeg(cel("tijd"))) {
      minuten = parseTijd(cel("tijd"), eenheid);
      if (minuten === null) { fout(`Tijd “${tekst(cel("tijd"))}” niet te lezen`); continue; }
    }
    if (minuten === null && !leeg(cel("snelheid"))) {
      const s = parseGetal(cel("snelheid"));
      if (s && s > 0) minuten = Math.round((km / s) * 60);
    }
    if (minuten === null) {
      if (opties.schatKmU && opties.schatKmU > 0) { minuten = Math.round((km / opties.schatKmU) * 60); geschat = true; }
      else { fout("Geen tijd", { geenTijd: true }); continue; }
    }
    if (minuten <= 0 || minuten > 1500) { fout(`Tijd van ${minuten} minuten is onwaarschijnlijk`); continue; }
    const gem = km / (minuten / 60);
    if (gem > 70) { fout(`Gemiddeld ${gem.toFixed(0)} km/u is onwaarschijnlijk: controleer afstand en tijd`); continue; }

    // Weer/gevoel die we niet herkennen, gaan naar de opmerking zodat er niets verloren gaat.
    const extra: string[] = [];
    const weerTxt = cel("weer"), gevoelTxt = cel("gevoel");
    const weer = leeg(weerTxt) ? "" : parseWeer(weerTxt);
    const gevoel = leeg(gevoelTxt) ? "" : parseGevoel(gevoelTxt);
    if (!leeg(weerTxt) && !weer) extra.push(`weer: ${tekst(weerTxt)}`);
    if (!leeg(gevoelTxt) && !gevoel) extra.push(`gevoel: ${tekst(gevoelTxt)}`);
    if (geschat) extra.push("tijd geschat");
    const opm = tekst(cel("opmerking"));
    const opmerking = [opm, extra.length ? `(${extra.join(", ")})` : ""].filter(Boolean).join(" ");

    const sl = sleutel(datum, km, minuten);
    if (gezien.has(sl)) { items.push({ rij: nr, dubbel: true }); continue; }
    gezien.add(sl);
    items.push({ rij: nr, geschat, ride: { id: opties.id(), datum, km: Math.round(km * 100) / 100, minuten, opmerking, weer, gevoel } });
  }
  return items;
}

/** Kolomletter (A, B, … AA) voor rijen zonder kopregel. */
export function kolomNaam(i: number): string {
  let s = "", x = i + 1;
  while (x > 0) { s = String.fromCharCode(65 + ((x - 1) % 26)) + s; x = Math.floor((x - 1) / 26); }
  return s;
}

export const SJABLOON_CSV =
  "\uFEFFdatum;km;tijd;opmerking;weer;gevoel\r\n2024-04-02;42,5;1:40;Schelde naar Temse;zonnig;goed\r\n2024-04-09;61,2;2:05;Kasseien;wind;matig\r\n";
