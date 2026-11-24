import { useMemo, useState } from "react";
import { FileUp, X } from "lucide-react";
import { toast } from "sonner";
import { SJABLOON_CSV, VELDEN, kolomNaam, leesRitten, parseCsv, vindKoppen, type Koppeling, type Rij, type Veld } from "@/lib/import";
import { fmtTijd, nieuwId, snelheid, type Ride } from "@/lib/rides";

type Blad = { naam: string; rijen: Rij[] };

const inputCls = "w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-base text-foreground outline-none focus:border-foreground";

async function leesBestand(f: File): Promise<Blad[]> {
  const naam = f.name.toLowerCase();
  if (naam.endsWith(".xlsx")) {
    const { default: leesExcel } = await import("read-excel-file/browser");
    const bladen = await leesExcel(f);
    return bladen.map((b) => ({ naam: b.sheet, rijen: b.data as Rij[] }));
  }
  if (naam.endsWith(".xls")) throw new Error("Oude .xls-bestanden worden niet gelezen. Sla het bestand in Excel op als .xlsx of als CSV en probeer opnieuw.");
  const buf = await f.arrayBuffer();
  let tekst: string;
  try { tekst = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
  catch { tekst = new TextDecoder("windows-1252").decode(buf); } // Excel-CSV met accenten
  return [{ naam: "CSV", rijen: parseCsv(tekst) }];
}

export function Importeren({ bestaand, onImport, onSluit }: { bestaand: Ride[]; onImport: (nieuw: Ride[]) => void; onSluit: () => void }) {
  const [bladen, setBladen] = useState<Blad[]>([]);
  const [blad, setBlad] = useState(0);
  const [kop, setKop] = useState(-1);
  const [koppeling, setKoppeling] = useState<Koppeling | null>(null);
  const [schat, setSchat] = useState("");
  const [bestandsnaam, setBestandsnaam] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const rijen = bladen[blad]?.rijen ?? [];
  const kolommen = Math.max(0, ...rijen.slice(0, 50).map((r) => r.length));

  const kiesBlad = (b: Blad) => {
    const { kopRij, koppeling: k } = vindKoppen(b.rijen);
    setKop(kopRij);
    setKoppeling(k);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setFout(""); setBezig(true);
    try {
      const b = await leesBestand(f);
      if (!b.length || b.every((x) => !x.rijen.length)) throw new Error("Het bestand lijkt leeg.");
      setBladen(b); setBestandsnaam(f.name);
      // kies het blad met de meeste herkende kolommen
      let beste = 0, score = -1;
      b.forEach((x, i) => {
        const k = vindKoppen(x.rijen);
        const s = Object.values(k.koppeling).filter((v) => v !== null).length + (k.kopRij >= 0 ? 10 : 0);
        if (s > score) { score = s; beste = i; }
      });
      setBlad(beste);
      kiesBlad(b[beste]!);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Het bestand kon niet gelezen worden.");
    } finally { setBezig(false); }
  };

  const schatKmU = parseFloat(schat.replace(",", ".")) || null;
  const items = useMemo(
    () => (koppeling ? leesRitten(rijen, kop, koppeling, bestaand, { schatKmU, id: nieuwId }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rijen, kop, koppeling, bestaand, schatKmU],
  );
  const klaar = items.filter((i) => i.ride);
  const dubbel = items.filter((i) => i.dubbel).length;
  const fouten = items.filter((i) => i.fout);
  const zonderTijd = fouten.filter((i) => i.geenTijd).length;
  const hoofdKolomMist = koppeling && (koppeling.datum === null || koppeling.km === null);

  const kopTekst = (i: number) => {
    const k = kop >= 0 ? rijen[kop]?.[i] : null;
    const t = k instanceof Date ? "" : String(k ?? "").trim();
    return t ? `${kolomNaam(i)} – ${t}` : `Kolom ${kolomNaam(i)}`;
  };
  const zet = (v: Veld, waarde: string) => setKoppeling((k) => (k ? { ...k, [v]: waarde === "" ? null : Number(waarde) } : k));

  const downloadSjabloon = () => {
    const url = URL.createObjectURL(new Blob([SJABLOON_CSV], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "fietslog-sjabloon.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const importeer = () => {
    const nieuw = klaar.map((i) => i.ride!);
    if (!nieuw.length) return;
    onImport(nieuw);
    toast.success(`${nieuw.length} ${nieuw.length === 1 ? "rit" : "ritten"} geïmporteerd`);
    onSluit();
  };

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="font-display text-2xl uppercase text-card-foreground"><span className="kop-streep" />Oude ritten importeren</h2>
        <button onClick={onSluit} aria-label="Sluiten" className="p-1 text-muted-foreground"><X className="h-5 w-5" /></button>
      </div>

      {!bladen.length && (
        <div className="space-y-3 text-sm text-foreground">
          <p>Kies een Excel- (<b>.xlsx</b>) of CSV-bestand met je oude ritten. Je ziet eerst een controle; er wordt niets bewaard voordat je op “Importeren” drukt.</p>
          <p className="text-muted-foreground">Handig: een kolom met de <b>datum</b> en de <b>afstand (km)</b>, liefst ook de <b>tijd</b>. Opmerking, weer en gevoel mogen ontbreken.</p>
          <label className="knop-geel font-display flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3 text-xl uppercase">
            <FileUp className="h-5 w-5" />{bezig ? "Bezig met lezen…" : "Bestand kiezen"}
            <input type="file" className="sr-only" accept=".xlsx,.xls,.csv,.txt,text/csv" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button onClick={downloadSjabloon} className="w-full text-center text-sm font-semibold underline">Voorbeeldbestand (CSV) downloaden</button>
        </div>
      )}

      {fout && <p role="alert" className="mt-3 rounded-xl bg-[var(--rood)] px-3 py-2 text-sm font-semibold text-white">{fout}</p>}

      {bladen.length > 0 && koppeling && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Bestand: <b className="text-foreground">{bestandsnaam}</b></p>

          {bladen.length > 1 && (
            <label className="block text-sm font-bold">Tabblad
              <select className={inputCls + " mt-1"} value={blad} onChange={(e) => { const i = Number(e.target.value); setBlad(i); kiesBlad(bladen[i]!); }}>
                {bladen.map((b, i) => <option key={b.naam} value={i}>{b.naam} ({b.rijen.length} rijen)</option>)}
              </select>
            </label>
          )}

          <details open={!!hoofdKolomMist || kop < 0} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-bold">Kolommen controleren {kop < 0 && "(geen kopregel gevonden)"}</summary>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {VELDEN.map((f) => (
                <label key={f.v} className="grid grid-cols-[7.5rem_1fr] items-center gap-2 text-sm font-semibold">
                  {f.label}
                  <select className={inputCls} value={koppeling[f.v] ?? ""} onChange={(e) => zet(f.v, e.target.value)}>
                    <option value="">(niet in bestand)</option>
                    {Array.from({ length: kolommen }, (_, i) => <option key={i} value={i}>{kopTekst(i)}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Een tijd zonder eenheid: 1–12 telt als uren (1,5 = 1u30), grotere getallen als minuten.</p>
          </details>

          {zonderTijd > 0 && (
            <label className="block rounded-xl bg-muted p-3 text-sm font-semibold">
              {zonderTijd} {zonderTijd === 1 ? "rit heeft" : "ritten hebben"} geen tijd. Wil je die schatten? Vul een gemiddelde snelheid in:
              <div className="mt-2 flex items-center gap-2">
                <input inputMode="decimal" placeholder="bv. 25" className={inputCls} value={schat} onChange={(e) => setSchat(e.target.value)} /> <span>km/u</span>
              </div>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">Geschatte ritten krijgen “(tijd geschat)” in de opmerking. Leeg laten = deze ritten overslaan.</span>
            </label>
          )}

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted p-2"><p className="font-display text-3xl">{klaar.length}</p><p className="text-xs font-bold uppercase text-muted-foreground">klaar</p></div>
            <div className="rounded-xl bg-muted p-2"><p className="font-display text-3xl">{dubbel}</p><p className="text-xs font-bold uppercase text-muted-foreground">bestaan al</p></div>
            <div className="rounded-xl bg-muted p-2"><p className="font-display text-3xl" style={fouten.length ? { color: "var(--rood)" } : undefined}>{fouten.length}</p><p className="text-xs font-bold uppercase text-muted-foreground">onleesbaar</p></div>
          </div>

          {klaar.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="py-1">Datum</th><th>km</th><th>Tijd</th><th>km/u</th></tr></thead>
                <tbody>
                  {klaar.slice(0, 6).map((i) => { const r = i.ride!; return (
                    <tr key={r.id} className="border-t border-border"><td className="py-1.5">{r.datum}</td><td>{r.km}</td><td>{fmtTijd(r.minuten)}</td><td>{snelheid(r.km, r.minuten).toFixed(1)}</td></tr>); })}
                </tbody>
              </table>
              {klaar.length > 6 && <p className="mt-1 text-xs text-muted-foreground">… en nog {klaar.length - 6} ritten</p>}
            </div>
          )}

          {fouten.length > 0 && (
            <div className="rounded-xl border border-[var(--rood)] p-3 text-sm">
              <p className="mb-1 font-bold" style={{ color: "var(--rood)" }}>Deze rijen worden overgeslagen:</p>
              <ul className="space-y-0.5">
                {fouten.slice(0, 15).map((i) => <li key={i.rij}>Rij {i.rij}: {i.fout}</li>)}
              </ul>
              {fouten.length > 15 && <p className="mt-1 text-xs text-muted-foreground">… en nog {fouten.length - 15} rijen</p>}
            </div>
          )}

          <button onClick={importeer} disabled={!klaar.length} className="knop-geel font-display w-full rounded-xl py-3 text-2xl uppercase disabled:opacity-50">
            {klaar.length ? `${klaar.length} ${klaar.length === 1 ? "rit" : "ritten"} importeren` : "Niets om te importeren"}
          </button>
          <button onClick={() => { setBladen([]); setKoppeling(null); setFout(""); }} className="w-full text-center text-sm font-semibold underline">Ander bestand kiezen</button>
          <p className="text-center text-xs text-muted-foreground">De server bewaart vooraf een back-up van je huidige ritten.</p>
        </div>
      )}
    </section>
  );
}
