import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, List, BarChart3, CalendarDays, Trash2, Download, LogOut, Upload, Pencil, Settings, Monitor, Sun, Moon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Fiets, Trui } from "@/components/Fiets";
import { Inloggen } from "@/components/Inloggen";
import { Importeren } from "@/components/Importeren";
import { getThema, setThema, type Thema } from "@/lib/thema";
import { authPost, getStatus, NietIngelogd } from "@/lib/auth";
import { GEVOEL, MAANDEN, WEER, fmtTijd, downloadCsv, fetchRides, nieuwId, saveRides, snelheid, type Gevoel, type Ride, type Weer } from "@/lib/rides";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fietslog – wielerdagboek" },
      { name: "description", content: "Houd je fietsritten bij: afstand, tijd, weer en gevoel, met grafieken en overzichten." },
      { property: "og:title", content: "Fietslog – wielerdagboek" },
      { property: "og:description", content: "Houd je fietsritten bij met grafieken en maand- en jaaroverzichten." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: App,
});

type Tab = "nieuw" | "ritten" | "grafieken" | "overzicht" | "instellingen";
type AuthState = "laden" | "offline" | "login" | "setup" | "ok";
const today = () => new Date().toISOString().slice(0, 10);

// Kleur per gevoel: groen = zeer goed, geel = goed, oranje = matig, rood = slecht
const GEVOEL_KLEUR: Record<Gevoel, string> = {
  "zeer goed": "var(--groen)", goed: "var(--geel)", matig: "var(--oranje)", slecht: "var(--rood)",
};

function Splash({ children }: { children?: React.ReactNode }) {
  return (
    <div className="hero-band flex min-h-screen flex-col items-center justify-center rounded-none px-6 text-center">
      <Fiets className="h-24 w-auto text-[color:var(--hero-accent)]" />
      <p className="font-display mt-2 text-4xl uppercase tracking-wide">Fietslog</p>
      {children}
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState<AuthState>("laden");
  const [naam, setNaam] = useState<string | null>(null);
  const check = () =>
    getStatus()
      .then((s) => {
        if (s.ingelogd) { setNaam(s.gebruikersnaam); setAuth("ok"); }
        else setAuth(s.ingesteld ? "login" : "setup");
      })
      .catch(() => setAuth("offline"));
  useEffect(() => { void check(); }, []);

  if (auth === "laden") return <Splash><p className="mt-3 text-sm text-[color:var(--hero-fg)]/60">Even laden…</p></Splash>;
  if (auth === "offline") return (
    <Splash>
      <p className="mt-3 max-w-xs text-[color:var(--hero-fg)]/80">De server is niet bereikbaar. Controleer je verbinding en probeer opnieuw.</p>
      <button onClick={() => { setAuth("laden"); void check(); }} className="knop-accent font-display mt-5 rounded-xl px-8 py-2 text-xl uppercase">Opnieuw proberen</button>
    </Splash>
  );
  if (auth === "login" || auth === "setup") return <><Inloggen eersteKeer={auth === "setup"} onKlaar={() => void check()} /><Toaster position="top-center" /></>;
  return <Ritlog naam={naam} onVerlopen={() => setAuth("login")} onUitloggen={async () => { await authPost("logout"); setAuth("login"); }} />;
}

function Ritlog({ naam, onVerlopen, onUitloggen }: { naam: string | null; onVerlopen: () => void; onUitloggen: () => void }) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [tab, setTab] = useState<Tab>("nieuw");
  const fout = (e: unknown, tekst: string) => { if (e instanceof NietIngelogd) onVerlopen(); else toast.error(tekst); };
  useEffect(() => { fetchRides().then(setRides).catch((e) => fout(e, "Kan de server niet bereiken")); }, []);
  const update = (r: Ride[], backup = false) => { setRides(r); saveRides(r, { backup }).catch((e) => fout(e, "Opslaan op de server mislukt")); };
  const totKm = rides.reduce((s, r) => s + r.km, 0);
  const totMin = rides.reduce((s, r) => s + r.minuten, 0);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="hero-band px-5 pb-12">
        <Fiets className="pointer-events-none absolute -right-6 bottom-6 h-24 w-auto text-[color:var(--hero-accent)] opacity-20" />
        <div className="relative mx-auto max-w-md md:max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-2xl uppercase tracking-wide text-[color:var(--hero-accent)]">Fietslog</p>
              {naam && <p className="text-xs text-[color:var(--hero-fg)]/60">Hoi {naam}!</p>}
            </div>
            <button onClick={() => setTab("instellingen")} aria-label="Instellingen" className={`rounded-full p-2 active:bg-[color:var(--hero-fg)]/20 ${tab === "instellingen" ? "bg-[color:var(--hero-fg)] text-[color:var(--hero-2)]" : "bg-[color:var(--hero-fg)]/10 text-[color:var(--hero-fg)]/80"}`}><Settings className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 flex items-end gap-4">
            <div className="bib"><span className="font-display text-6xl leading-none">{totKm.toFixed(0)}</span><span className="font-display ml-1 text-2xl">km</span></div>
            <div className="pb-1 text-sm text-[color:var(--hero-fg)]/80"><p><b className="text-[color:var(--hero-fg)]">{rides.length}</b> ritten</p><p><b className="text-[color:var(--hero-fg)]">{fmtTijd(totMin)}</b> in het zadel</p></div>
          </div>
        </div>
      </header>
      <main className="mx-auto -mt-5 max-w-md px-4 md:max-w-2xl">
        {tab === "nieuw" && <RitFormulier titel="Nieuwe rit" opslaanTekst="Rit opslaan" onSave={(r) => { update([r, ...rides]); toast.success("Rit opgeslagen!"); setTab("ritten"); }} />}
        {tab === "ritten" && <Ritten rides={rides} onDelete={(id) => update(rides.filter((r) => r.id !== id))} onEdit={(r) => { update(rides.map((x) => (x.id === r.id ? r : x))); toast.success("Rit bijgewerkt"); }} />}
        {tab === "grafieken" && <Grafieken rides={rides} />}
        {tab === "overzicht" && <Overzicht rides={rides} />}
        {tab === "instellingen" && <Instellingen naam={naam} rides={rides} onImport={(nieuw) => { update([...rides, ...nieuw], true); setTab("ritten"); }} onUitloggen={onUitloggen} />}
      </main>
      <nav className="nav-bar fixed inset-x-0 bottom-0 border-t border-white/10">
        <div className="mx-auto grid max-w-md grid-cols-4 md:max-w-2xl px-2 pt-2 pb-1">
          {([["nieuw", Plus, "Nieuw"], ["ritten", List, "Ritten"], ["grafieken", BarChart3, "Grafieken"], ["overzicht", CalendarDays, "Overzicht"]] as const).map(([k, Icon, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex flex-col items-center gap-1 text-xs font-bold uppercase tracking-wide ${tab === k ? "text-[var(--rosa)]" : "text-white/60"}`}>
              <span className={`rounded-full px-4 py-1 ${tab === k ? "nav-actief" : ""}`}><Icon className="h-6 w-6" /></span>{l}
            </button>
          ))}
        </div>
      </nav>
      <Toaster position="top-center" />
    </div>
  );
}

function Card({ children, title, className = "" }: { children: React.ReactNode; title?: string; className?: string }) {
  return <section className={`mb-4 rounded-2xl border border-border bg-card p-5 shadow-card ${className}`}>{title && <h2 className="font-display mb-3 text-2xl uppercase text-card-foreground"><span className="kop-streep" />{title}</h2>}{children}</section>;
}
const inputCls = "w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-lg text-foreground outline-none focus:border-foreground";
const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground";

type RitFormProps = { start?: Ride; titel: string; opslaanTekst: string; onSave: (r: Ride) => void; onAnnuleer?: () => void; onVerwijder?: () => void };

// Formulier voor een nieuwe rit én om een bestaande rit te bewerken.
function RitFormulier({ start, titel, opslaanTekst, onSave, onAnnuleer, onVerwijder }: RitFormProps) {
  const [datum, setDatum] = useState(start?.datum ?? today());
  const [km, setKm] = useState(start ? String(start.km).replace(".", ",") : "");
  const [uren, setUren] = useState(start ? String(Math.floor(start.minuten / 60)) : "");
  const [min, setMin] = useState(start ? String(Math.round(start.minuten % 60)) : "");
  const [opm, setOpm] = useState(start?.opmerking ?? "");
  const [weer, setWeer] = useState<Weer | "">(start ? start.weer : "zonnig");
  const [gevoel, setGevoel] = useState<Gevoel | "">(start ? start.gevoel : "goed");
  const k = parseFloat(km.replace(",", "."));
  const t = (parseInt(uren || "0") || 0) * 60 + (parseInt(min || "0") || 0);
  const submit = () => {
    if (!k || k <= 0) { toast.error("Vul de afstand in"); return; }
    if (t <= 0) { toast.error("Vul de tijd in"); return; }
    try {
      onSave({ id: start?.id ?? nieuwId(), datum, km: k, minuten: t, opmerking: opm.trim(), weer, gevoel });
    } catch {
      toast.error("Opslaan is niet gelukt. Probeer het opnieuw.");
    }
  };
  return (
    <Card title={titel}>
      <div className="space-y-4">
        <label className="block"><span className={labelCls}>Datum</span><input type="date" className={inputCls} value={datum} onChange={(e) => setDatum(e.target.value)} /></label>
        <label className="block"><span className={labelCls}>Afstand (km)</span><input inputMode="decimal" placeholder="bv. 42,5" className={inputCls} value={km} onChange={(e) => setKm(e.target.value)} /></label>
        <div><span className={labelCls}>Tijd</span>
          <div className="flex gap-2"><input inputMode="numeric" placeholder="uren" className={inputCls} value={uren} onChange={(e) => setUren(e.target.value)} /><input inputMode="numeric" placeholder="minuten" className={inputCls} value={min} onChange={(e) => setMin(e.target.value)} /></div>
          {k > 0 && t > 0 && <p className="mt-2 text-sm font-semibold text-muted-foreground">Gemiddeld: <span className="font-display text-xl text-foreground">{snelheid(k, t).toFixed(1).replace(".", ",")} km/u</span></p>}
        </div>
        <label className="block"><span className={labelCls}>Opmerking / route</span><textarea rows={2} placeholder="bv. langs de Schelde naar Temse" className={inputCls} value={opm} onChange={(e) => setOpm(e.target.value)} /></label>
        <div><span className={labelCls}>Weer {start && <span className="font-normal normal-case">(tik opnieuw om te wissen)</span>}</span>
          <div className="grid grid-cols-3 gap-2">{WEER.map((w) => <button key={w.v} type="button" onClick={() => setWeer(weer === w.v ? "" : w.v)} className={`chip ${weer === w.v ? "chip-on" : ""}`}><span className="text-2xl">{w.e}</span>{w.v}</button>)}</div></div>
        <div><span className={labelCls}>Hoe voelde het? {start && <span className="font-normal normal-case">(tik opnieuw om te wissen)</span>}</span>
          <div className="grid grid-cols-4 gap-2">{GEVOEL.map((g) => <button key={g.v} type="button" onClick={() => setGevoel(gevoel === g.v ? "" : g.v)} className={`chip ${gevoel === g.v ? "chip-on" : ""}`}><span className="text-2xl">{g.e}</span>{g.v}</button>)}</div></div>
        <button onClick={submit} className="knop-accent font-display w-full rounded-xl py-3 text-2xl uppercase">{opslaanTekst}</button>
        {onAnnuleer && <button onClick={onAnnuleer} className="w-full rounded-xl border-2 border-foreground py-2 text-lg font-bold">Annuleren</button>}
        {onVerwijder && <button onClick={onVerwijder} className="flex w-full items-center justify-center gap-2 py-1 text-sm font-bold" style={{ color: "var(--rood)" }}><Trash2 className="h-4 w-4" />Deze rit verwijderen</button>}
      </div>
    </Card>
  );
}

const THEMAS = [
  { v: "systeem", Icon: Monitor, l: "Systeem" },
  { v: "licht", Icon: Sun, l: "Licht" },
  { v: "donker", Icon: Moon, l: "Donker" },
] as const;

function Instellingen({ naam, rides, onImport, onUitloggen }: { naam: string | null; rides: Ride[]; onImport: (nieuw: Ride[]) => void; onUitloggen: () => void }) {
  const [importOpen, setImportOpen] = useState(false);
  const [themaKeuze, setThemaKeuze] = useState<Thema>("systeem");
  useEffect(() => { setThemaKeuze(getThema()); }, []);
  const knop = "font-display flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-card py-3 text-xl uppercase text-foreground";
  return <>
    <Card title="Instellingen">
      {naam && <p className="text-sm text-muted-foreground">Ingelogd als <b className="text-foreground">{naam}</b></p>}
    </Card>
    <Card title="Achtergrond">
      <div className="grid grid-cols-3 gap-2">
        {THEMAS.map(({ v, Icon, l }) => (
          <button key={v} type="button" onClick={() => { setThema(v); setThemaKeuze(v); }} aria-pressed={themaKeuze === v} className={`chip ${themaKeuze === v ? "chip-on" : ""}`}><Icon className="h-6 w-6" />{l}</button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">“Systeem” volgt de instelling van je gsm of tablet. De keuze geldt voor dit toestel.</p>
    </Card>
    <Card title="Gegevens">
      <div className="space-y-3">
        {importOpen
          ? <Importeren bestaand={rides} onImport={onImport} onSluit={() => setImportOpen(false)} />
          : <button onClick={() => setImportOpen(true)} className={knop}><Upload className="h-5 w-5" />Oude ritten importeren</button>}
        <button onClick={() => downloadCsv(rides)} disabled={!rides.length} className="knop-accent font-display flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xl uppercase disabled:opacity-50"><Download className="h-5 w-5" />Download als CSV</button>
      </div>
    </Card>
    <Card title="Account">
      <button onClick={() => confirm("Uitloggen op dit toestel?") && onUitloggen()} className={knop}><LogOut className="h-5 w-5" />Uitloggen</button>
    </Card>
  </>;
}

const em = (list: { v: string; e: string }[], v: string) => list.find((x) => x.v === v)?.e ?? "";

function Ritten({ rides, onDelete, onEdit }: { rides: Ride[]; onDelete: (id: string) => void; onEdit: (r: Ride) => void }) {
  const [bewerkId, setBewerkId] = useState<string | null>(null);
  const sorted = [...rides].sort((a, b) => b.datum.localeCompare(a.datum));
  const nummer = new Map([...rides].sort((a, b) => a.datum.localeCompare(b.datum)).map((r, i) => [r.id, i + 1]));
  if (!sorted.length) return <Card><p className="text-muted-foreground">Nog geen ritten. Voeg je eerste rit toe via “Nieuw”, of importeer je oude ritten via Instellingen (tandwiel rechtsboven).</p></Card>;
  return <>
    {sorted.map((r) => r.id === bewerkId ? (
      <div key={r.id} ref={(el) => el?.scrollIntoView({ block: "start", behavior: "smooth" })}>
        <RitFormulier start={r} titel="Rit bewerken" opslaanTekst="Wijzigingen opslaan" onSave={(nieuw) => { onEdit(nieuw); setBewerkId(null); }} onAnnuleer={() => setBewerkId(null)}
          onVerwijder={() => { if (confirm("Deze rit verwijderen?")) { onDelete(r.id); setBewerkId(null); } }} />
      </div>
    ) : (
      <section key={r.id} className="rit-kaart mb-4 rounded-2xl border border-border bg-card p-5 pl-7 shadow-card" style={{ "--strook": r.gevoel ? GEVOEL_KLEUR[r.gevoel] : "var(--muted-foreground)" } as React.CSSProperties}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rit {nummer.get(r.id)} · {new Date(r.datum).toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="font-display text-4xl leading-tight text-card-foreground">{r.km.toFixed(1)} km</p>
            <p className="text-sm font-semibold text-muted-foreground">{fmtTijd(r.minuten)} · {snelheid(r.km, r.minuten).toFixed(1)} km/u</p>
            {r.opmerking && <p className="mt-2 break-words text-foreground">{r.opmerking}</p>}
            {(r.weer || r.gevoel) && <p className="mt-2 text-sm">{r.weer && `${em(WEER, r.weer)} ${r.weer}`} &nbsp; {r.gevoel && `${em(GEVOEL, r.gevoel)} ${r.gevoel}`}</p>}
          </div>
          <div className="flex shrink-0">
            <button aria-label="Bewerken" onClick={() => setBewerkId(r.id)} className="p-2.5 text-muted-foreground"><Pencil className="h-5 w-5" /></button>
            <button aria-label="Verwijderen" onClick={() => confirm("Deze rit verwijderen?") && onDelete(r.id)} className="p-2.5 text-muted-foreground"><Trash2 className="h-5 w-5" /></button>
          </div>
        </div>
      </section>
    ))}
  </>;
}

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" };

function Grafieken({ rides }: { rides: Ride[] }) {
  const jaar = new Date().getFullYear();
  const perMaand = MAANDEN.map((m, i) => ({ m, km: Math.round(rides.filter((r) => r.datum.startsWith(`${jaar}-${String(i + 1).padStart(2, "0")}`)).reduce((s, r) => s + r.km, 0)) }));
  const laatste = [...rides].sort((a, b) => a.datum.localeCompare(b.datum)).slice(-15).map((r) => ({ d: r.datum.slice(5), snelheid: +snelheid(r.km, r.minuten).toFixed(1), km: r.km }));
  const gevoel = GEVOEL.map((g) => ({ name: g.v, value: rides.filter((r) => r.gevoel === g.v).length })).filter((x) => x.value);
  if (!rides.length) return <Card><p className="text-muted-foreground">Nog geen gegevens voor grafieken.</p></Card>;
  return <>
    <Card title={`Kilometers per maand (${jaar})`}>
      <ResponsiveContainer width="100%" height={220}><BarChart data={perMaand}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="m" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} width={35} stroke="var(--muted-foreground)" /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="km" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
    </Card>
    <Card title="Snelheid (laatste ritten)">
      <ResponsiveContainer width="100%" height={200}><LineChart data={laatste}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="d" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} width={35} stroke="var(--muted-foreground)" domain={["auto", "auto"]} /><Tooltip contentStyle={tooltipStyle} /><Line dataKey="snelheid" stroke="var(--chart-2)" strokeWidth={3} dot={{ r: 4, fill: "var(--rosa)", stroke: "var(--chart-2)" }} /></LineChart></ResponsiveContainer>
    </Card>
    <Card title="Gevoel">
      <ResponsiveContainer width="100%" height={210}><PieChart><Pie data={gevoel} dataKey="value" nameKey="name" outerRadius={78} innerRadius={34} paddingAngle={2} stroke="var(--card)" label={(e) => e.name}>{gevoel.map((g) => <Cell key={g.name} fill={GEVOEL_KLEUR[g.name as Gevoel]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer>
    </Card>
  </>;
}

function Stat({ l, v }: { l: string; v: string }) {
  return <div className="rounded-xl bg-muted p-3"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{l}</p><p className="font-display text-3xl leading-tight text-foreground">{v}</p></div>;
}
function samenvat(rs: Ride[]) {
  const km = rs.reduce((s, r) => s + r.km, 0), min = rs.reduce((s, r) => s + r.minuten, 0);
  return { n: rs.length, km, min, gem: snelheid(km, min), langste: Math.max(0, ...rs.map((r) => r.km)) };
}
const datumKort = (d: string) => new Date(d).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });

function Truien({ rs }: { rs: Ride[] }) {
  if (!rs.length) return null;
  const langste = rs.reduce((a, b) => (b.km > a.km ? b : a));
  const snelste = rs.reduce((a, b) => (snelheid(b.km, b.minuten) > snelheid(a.km, a.minuten) ? b : a));
  const perMaand = MAANDEN.map((m, i) => ({ m, km: rs.filter((r) => r.datum.slice(5, 7) === String(i + 1).padStart(2, "0")).reduce((s, r) => s + r.km, 0) }));
  const bergkoning = perMaand.reduce((a, b) => (b.km > a.km ? b : a));
  const rij = "flex items-center gap-3 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0";
  return (
    <Card title="Truien">
      <div>
        <div className={rij}><Trui kleur="#f4a3c1" className="h-12 w-12 shrink-0" /><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Roze trui · langste rit</p><p className="font-display text-2xl leading-tight">{langste.km.toFixed(1)} km <span className="text-sm font-semibold not-italic text-muted-foreground">{datumKort(langste.datum)}</span></p></div></div>
        <div className={rij}><Trui kleur="#2faa5f" className="h-12 w-12 shrink-0" /><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Groene trui · snelste rit</p><p className="font-display text-2xl leading-tight">{snelheid(snelste.km, snelste.minuten).toFixed(1)} km/u <span className="text-sm font-semibold not-italic text-muted-foreground">{datumKort(snelste.datum)}</span></p></div></div>
        <div className={rij}><Trui kleur="#3f7fe0" className="h-12 w-12 shrink-0" /><div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Blauwe trui · beste maand</p><p className="font-display text-2xl leading-tight">{bergkoning.km.toFixed(0)} km <span className="text-sm font-semibold not-italic text-muted-foreground">in {bergkoning.m}</span></p></div></div>
      </div>
    </Card>
  );
}

function Overzicht({ rides }: { rides: Ride[] }) {
  const jaren = useMemo(() => [...new Set([new Date().getFullYear(), ...rides.map((r) => +r.datum.slice(0, 4))])].sort((a, b) => b - a), [rides]);
  const [jaar, setJaar] = useState(jaren[0]!);
  const rj = rides.filter((r) => r.datum.startsWith(String(jaar)));
  const s = samenvat(rj);
  return <>
    <Card title="Jaaroverzicht">
      <select className={inputCls + " mb-3"} value={jaar} onChange={(e) => setJaar(+e.target.value)}>{jaren.map((j) => <option key={j}>{j}</option>)}</select>
      <div className="grid grid-cols-2 gap-2">
        <Stat l="Ritten" v={String(s.n)} /><Stat l="Kilometers" v={s.km.toFixed(0)} />
        <Stat l="Tijd" v={fmtTijd(s.min)} /><Stat l="Gem. snelheid" v={`${s.gem.toFixed(1)} km/u`} />
        <Stat l="Langste rit" v={`${s.langste.toFixed(1)} km`} /><Stat l="Gem. per rit" v={`${s.n ? (s.km / s.n).toFixed(1) : 0} km`} />
      </div>
    </Card>
    <Truien rs={rj} />
    <Card title="Per maand">
      <table className="w-full text-sm"><thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="py-1">Maand</th><th>Ritten</th><th>km</th><th>Tijd</th><th>km/u</th></tr></thead>
        <tbody>{MAANDEN.map((m, i) => { const x = samenvat(rj.filter((r) => r.datum.slice(5, 7) === String(i + 1).padStart(2, "0"))); return (
          <tr key={m} className={`border-t border-border ${x.n ? "text-foreground" : "text-muted-foreground"}`}><td className="py-2 font-bold uppercase">{m}</td><td>{x.n}</td><td>{x.km.toFixed(0)}</td><td>{x.n ? fmtTijd(x.min) : "–"}</td><td>{x.n ? x.gem.toFixed(1) : "–"}</td></tr>); })}</tbody></table>
    </Card>
  </>;
}
