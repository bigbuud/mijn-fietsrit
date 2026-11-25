// Landenthema: kleuren, truien en klassiekers per wielerland. Naast licht/donker (zie thema.ts) kies je een land.
export type Land = "be" | "fr" | "it";
const KEY = "fietslog-land";

export const LANDEN: { v: Land; vlag: string; naam: string; omschrijving: string }[] = [
  { v: "be", vlag: "🇧🇪", naam: "België", omschrijving: "Zwart-geel-rood · Ronde van Vlaanderen, Luik–Bastenaken–Luik, Parijs–Roubaix" },
  { v: "fr", vlag: "🇫🇷", naam: "Frankrijk", omschrijving: "Blauw-wit-rood · Tour de France, Parijs–Roubaix" },
  { v: "it", vlag: "🇮🇹", naam: "Italië", omschrijving: "Groen-wit-rood en maglia rosa · Giro d’Italia, Milaan–Sanremo, Il Lombardia" },
];

/** Afstanden van de edities 2026 (km), afgerond. */
export const KLASSIEKERS: Record<Land, { naam: string; km: number; bijnaam: string }[]> = {
  be: [
    { naam: "Ronde van Vlaanderen", km: 279, bijnaam: "Vlaanderens Mooiste" },
    { naam: "Luik–Bastenaken–Luik", km: 259, bijnaam: "La Doyenne" },
    { naam: "Parijs–Roubaix", km: 258, bijnaam: "Hel van het Noorden" },
  ],
  fr: [
    { naam: "Parijs–Roubaix", km: 258, bijnaam: "Hel van het Noorden" },
    { naam: "Tour de France", km: 3333, bijnaam: "La Grande Boucle" },
  ],
  it: [
    { naam: "Milaan–Sanremo", km: 298, bijnaam: "La Classicissima" },
    { naam: "Il Lombardia", km: 239, bijnaam: "Klassieker van de vallende bladeren" },
    { naam: "Giro d’Italia", km: 3459, bijnaam: "La Corsa Rosa" },
  ],
};

export function getLand(): Land {
  try { const l = localStorage.getItem(KEY); return l === "be" || l === "fr" ? l : "it"; } catch { return "it"; }
}
/** Bewaart de keuze op dit toestel en past ze meteen toe. Italië is de standaard (geen attribuut nodig). */
export function setLand(l: Land) {
  try { if (l === "it") localStorage.removeItem(KEY); else localStorage.setItem(KEY, l); } catch { /* opslag geblokkeerd */ }
  const root = document.documentElement;
  if (l === "it") root.removeAttribute("data-land"); else root.setAttribute("data-land", l);
}
