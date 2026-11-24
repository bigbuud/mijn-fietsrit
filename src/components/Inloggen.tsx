import { useState } from "react";
import { authPost } from "@/lib/auth";
import { Fiets } from "@/components/Fiets";

// Inlog- (en bij de eerste start: account-aanmaak-) scherm. De sessie blijft 1 jaar bewaard op dit toestel.
export function Inloggen({ eersteKeer, onKlaar }: { eersteKeer: boolean; onKlaar: () => void }) {
  const [naam, setNaam] = useState("");
  const [ww, setWw] = useState("");
  const [ww2, setWw2] = useState("");
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  const verstuur = async (e: React.FormEvent) => {
    e.preventDefault();
    setFout("");
    if (eersteKeer && ww !== ww2) { setFout("De twee wachtwoorden zijn niet gelijk."); return; }
    setBezig(true);
    const f = await authPost(eersteKeer ? "setup" : "login", { gebruikersnaam: naam, wachtwoord: ww });
    setBezig(false);
    if (f) setFout(f); else onKlaar();
  };

  const veld = "w-full rounded-xl border-2 border-white/15 bg-white/10 px-4 py-3 text-lg text-white placeholder:text-white/40 outline-none focus:border-[var(--geel)]";
  return (
    <div className="hero-band flex min-h-screen flex-col justify-center rounded-none px-6 pb-16">
      <div className="mx-auto w-full max-w-sm">
        <Fiets className="mx-auto mb-2 h-24 w-auto text-[var(--geel)]" />
        <h1 className="font-display text-center text-5xl uppercase tracking-wide text-white">Fietslog</h1>
        <p className="mb-8 mt-1 text-center text-sm font-semibold uppercase tracking-[0.25em] text-white/60">Wielerdagboek</p>
        <form onSubmit={verstuur} className="space-y-3">
          {eersteKeer && <p className="rounded-xl bg-white/10 p-3 text-sm text-white/80">Welkom! Kies een gebruikersnaam en wachtwoord voor deze app. Daarmee log je voortaan in.</p>}
          <input className={veld} placeholder="Gebruikersnaam" autoComplete="username" autoCapitalize="none" autoCorrect="off" value={naam} onChange={(e) => setNaam(e.target.value)} required />
          <input className={veld} type="password" placeholder="Wachtwoord" autoComplete={eersteKeer ? "new-password" : "current-password"} value={ww} onChange={(e) => setWw(e.target.value)} required />
          {eersteKeer && <input className={veld} type="password" placeholder="Wachtwoord nogmaals" autoComplete="new-password" value={ww2} onChange={(e) => setWw2(e.target.value)} required />}
          {fout && <p role="alert" className="rounded-xl bg-[var(--rood)] px-3 py-2 text-sm font-semibold text-white">{fout}</p>}
          <button disabled={bezig} className="knop-geel font-display mt-2 w-full rounded-xl py-3 text-2xl uppercase disabled:opacity-60">{bezig ? "Even geduld…" : eersteKeer ? "Account maken" : "Start je rit"}</button>
          <p className="pt-2 text-center text-xs text-white/50">Je blijft 1 jaar ingelogd op dit toestel.</p>
        </form>
      </div>
    </div>
  );
}
