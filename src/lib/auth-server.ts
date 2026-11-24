// Server-only: inloggen met een ondertekende sessiecookie (1 jaar geldig, schuivend verlengd).
// Wordt enkel dynamisch geïmporteerd vanuit server-handlers (nooit in de browser-bundel).
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const DAG = 24 * 60 * 60;
/** Een sessie blijft 365 dagen geldig (browsers begrenzen cookies toch op ~400 dagen). */
export const SESSIE_SECONDEN = 365 * DAG;
/** Bij elk bezoek na 7 dagen wordt de sessie opnieuw 365 dagen geldig: wie de app gebruikt, blijft ingelogd. */
const VERNIEUW_NA = 7 * DAG;
export const COOKIE_NAAM = "fietslog_sessie";

const dataDir = () => process.env["DATA_DIR"] || path.join(process.cwd(), "data");
const nu = () => Math.floor(Date.now() / 1000);
const sha256 = (s: string) => createHash("sha256").update(s).digest();
const gelijk = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

// ---------- geheime sleutel (blijft bewaard in /data, zodat sessies updates en herstarts overleven) ----------
let geheim: Buffer | undefined;
async function getGeheim(): Promise<Buffer> {
  if (geheim) return geheim;
  const uitEnv = process.env["SESSION_SECRET"];
  if (uitEnv && uitEnv.length >= 16) return (geheim = sha256(uitEnv));
  const file = path.join(dataDir(), "session.key");
  try {
    const hex = (await fs.readFile(file, "utf8")).trim();
    if (hex.length >= 32) return (geheim = Buffer.from(hex, "hex"));
  } catch {
    /* bestaat nog niet */
  }
  const nieuw = randomBytes(32);
  await fs.mkdir(dataDir(), { recursive: true });
  try {
    await fs.writeFile(file, nieuw.toString("hex"), { mode: 0o600, flag: "wx" });
    return (geheim = nieuw);
  } catch {
    // iemand was ons voor (gelijktijdige start): lees die sleutel
    const hex = (await fs.readFile(file, "utf8")).trim();
    return (geheim = Buffer.from(hex, "hex"));
  }
}

// ---------- account ----------
type Account = { gebruikersnaam: string; controleer: (ww: string) => boolean; vingerafdruk: string };
type OpgeslagenAccount = { gebruikersnaam: string; salt: string; hash: string };
const userFile = () => path.join(dataDir(), "user.json");

export async function getAccount(): Promise<Account | null> {
  const envWw = process.env["APP_PASSWORD"];
  if (envWw) {
    const naam = (process.env["APP_USERNAME"] || "fietser").trim();
    const wwHash = sha256(envWw);
    return {
      gebruikersnaam: naam,
      controleer: (ww) => gelijk(sha256(ww), wwHash),
      vingerafdruk: sha256(`env:${naam}:${envWw}`).toString("hex").slice(0, 16),
    };
  }
  try {
    const u = JSON.parse(await fs.readFile(userFile(), "utf8")) as OpgeslagenAccount;
    const hash = Buffer.from(u.hash, "hex");
    return {
      gebruikersnaam: u.gebruikersnaam,
      controleer: (ww) => gelijk(scryptSync(ww, Buffer.from(u.salt, "hex"), 64), hash),
      vingerafdruk: sha256(`file:${u.gebruikersnaam}:${u.hash}`).toString("hex").slice(0, 16),
    };
  } catch {
    return null;
  }
}

export async function maakAccount(gebruikersnaam: string, wachtwoord: string): Promise<string | null> {
  const naam = gebruikersnaam.trim();
  if (naam.length < 2 || naam.length > 40) return "Kies een gebruikersnaam van 2 tot 40 tekens.";
  if (wachtwoord.length < 8) return "Kies een wachtwoord van minstens 8 tekens.";
  if (await getAccount()) return "Er bestaat al een account.";
  const salt = randomBytes(16);
  const rec: OpgeslagenAccount = {
    gebruikersnaam: naam,
    salt: salt.toString("hex"),
    hash: scryptSync(wachtwoord, salt, 64).toString("hex"),
  };
  await fs.mkdir(dataDir(), { recursive: true });
  try {
    await fs.writeFile(userFile(), JSON.stringify(rec), { mode: 0o600, flag: "wx" });
  } catch {
    return "Er bestaat al een account.";
  }
  return null;
}

// ---------- sessietoken ----------
const b64 = (b: Buffer) => b.toString("base64url");
async function teken(uitgegeven: number, vingerafdruk: string) {
  const sleutel = await getGeheim();
  return b64(createHmac("sha256", sleutel).update(`${uitgegeven}.${vingerafdruk}`).digest());
}
async function maakToken(vingerafdruk: string) {
  const iat = nu();
  return `${iat}.${vingerafdruk}.${await teken(iat, vingerafdruk)}`;
}

function leesCookie(request: Request, naam: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const deel of header.split(";")) {
    const i = deel.indexOf("=");
    if (i > 0 && deel.slice(0, i).trim() === naam) return deel.slice(i + 1).trim();
  }
  return null;
}

const isHttps = (request: Request) =>
  (request.headers.get("x-forwarded-proto") || "").split(",")[0]?.trim() === "https" ||
  new URL(request.url).protocol === "https:";

function cookieHeader(waarde: string, maxAge: number, request: Request) {
  return `${COOKIE_NAAM}=${waarde}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${isHttps(request) ? "; Secure" : ""}`;
}

export type Sessie = { ingelogd: boolean; gebruikersnaam?: string; setCookie?: string };

/** Controleert de cookie. Geeft indien nodig een vernieuwde cookie mee (schuivende verlenging). */
export async function leesSessie(request: Request): Promise<Sessie> {
  const account = await getAccount();
  const token = leesCookie(request, COOKIE_NAAM);
  if (!account || !token) return { ingelogd: false };
  const [iatStr, vinger, sig] = token.split(".");
  const iat = Number(iatStr);
  if (!iatStr || !vinger || !sig || !Number.isInteger(iat)) return { ingelogd: false };
  if (vinger !== account.vingerafdruk) return { ingelogd: false }; // wachtwoord gewijzigd
  const verwacht = Buffer.from(await teken(iat, vinger));
  if (!gelijk(verwacht, Buffer.from(sig))) return { ingelogd: false };
  const leeftijd = nu() - iat;
  if (leeftijd < -60 || leeftijd > SESSIE_SECONDEN) return { ingelogd: false };
  const sessie: Sessie = { ingelogd: true, gebruikersnaam: account.gebruikersnaam };
  if (leeftijd > VERNIEUW_NA) {
    sessie.setCookie = cookieHeader(await maakToken(account.vingerafdruk), SESSIE_SECONDEN, request);
  }
  return sessie;
}

export async function startSessie(request: Request): Promise<string> {
  const account = await getAccount();
  if (!account) throw new Error("Geen account");
  return cookieHeader(await maakToken(account.vingerafdruk), SESSIE_SECONDEN, request);
}
export const wisCookie = (request: Request) => cookieHeader("", 0, request);

// ---------- rem op gokken (in het geheugen) ----------
const pogingen = new Map<string, { n: number; sinds: number }>();
const VENSTER = 15 * 60 * 1000;
const MAX_FOUT = 8;
export const clientIp = (request: Request) =>
  (request.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
  request.headers.get("x-real-ip") ||
  "lokaal";
export function teVeelPogingen(ip: string) {
  const p = pogingen.get(ip);
  if (!p) return false;
  if (Date.now() - p.sinds > VENSTER) { pogingen.delete(ip); return false; }
  return p.n >= MAX_FOUT;
}
export function registreerFout(ip: string) {
  const p = pogingen.get(ip);
  if (!p || Date.now() - p.sinds > VENSTER) pogingen.set(ip, { n: 1, sinds: Date.now() });
  else p.n += 1;
  if (pogingen.size > 500) for (const [k, v] of pogingen) if (Date.now() - v.sinds > VENSTER) pogingen.delete(k);
}
export const wisFouten = (ip: string) => pogingen.delete(ip);

export function json(data: unknown, status = 200, setCookie?: string) {
  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(JSON.stringify(data), { status, headers });
}
