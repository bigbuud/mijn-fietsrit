export type Thema = "systeem" | "licht" | "donker";
const KEY = "fietslog-thema";
export function getThema(): Thema {
  try { const t = localStorage.getItem(KEY); return t === "licht" || t === "donker" ? t : "systeem"; } catch { return "systeem"; }
}
/** Bewaart de keuze op dit toestel en past ze meteen toe. "systeem" volgt de instelling van gsm/tablet. */
export function setThema(t: Thema) {
  try { if (t === "systeem") localStorage.removeItem(KEY); else localStorage.setItem(KEY, t); } catch { /* opslag geblokkeerd: keuze geldt tot herladen */ }
  const root = document.documentElement;
  if (t === "systeem") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
}
