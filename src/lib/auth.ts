// Client-kant van het inloggen. De sessie zelf zit in een HttpOnly-cookie (1 jaar geldig).
export type AuthStatus = { ingesteld: boolean; ingelogd: boolean; gebruikersnaam: string | null };

export class NietIngelogd extends Error {
  constructor() { super("Niet ingelogd"); }
}

export async function getStatus(): Promise<AuthStatus> {
  const res = await fetch("/api/auth/status", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Server niet bereikbaar");
  return res.json();
}

export async function authPost(action: "login" | "setup" | "logout", body: { gebruikersnaam?: string; wachtwoord?: string } = {}): Promise<string | null> {
  try {
    const res = await fetch(`/api/auth/${action}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { fout?: string };
    return data.fout || "Er ging iets mis.";
  } catch {
    return "Server niet bereikbaar.";
  }
}

// Op dit toestel onthouden dat je ingelogd was, zodat de app ook zonder verbinding met de NAS opent.
const SESSIE = "fietslog-sessie";
export function onthoudSessie(naam: string | null) { try { localStorage.setItem(SESSIE, JSON.stringify({ naam })); } catch { /* niets */ } }
export function vergeetSessie() { try { localStorage.removeItem(SESSIE); } catch { /* niets */ } }
export function onthoudenSessie(): { naam: string | null } | null {
  try { const v = localStorage.getItem(SESSIE); return v ? (JSON.parse(v) as { naam: string | null }) : null; } catch { return null; }
}
