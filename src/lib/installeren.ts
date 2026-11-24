// Hulp bij "app installeren": herkent het toestel en bewaart het install-verzoek van de browser (Android/Chrome, alleen via https).
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }
export type Platform = "ios" | "android" | "andere";

let uitgesteld: InstallEvent | null = null;
const luisteraars = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); uitgesteld = e as InstallEvent; luisteraars.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { uitgesteld = null; luisteraars.forEach((f) => f()); });
}
export function opInstallatieWijziging(f: () => void) { luisteraars.add(f); return () => { luisteraars.delete(f); }; }

export const kanDirectInstalleren = () => uitgesteld !== null;
export async function installeer(): Promise<boolean> {
  if (!uitgesteld) return false;
  const ev = uitgesteld; uitgesteld = null;
  await ev.prompt();
  return (await ev.userChoice).outcome === "accepted";
}
export function platform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "andere";
}
/** Draait de app al als geïnstalleerde app (beginscherm)? */
export function isGeinstalleerd(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
const GEZIEN = "fietslog-install-gezien";
export const installatieAlGetoond = () => { try { return localStorage.getItem(GEZIEN) === "1"; } catch { return true; } };
export const onthoudInstallatieGetoond = () => { try { localStorage.setItem(GEZIEN, "1"); } catch { /* niets */ } };
