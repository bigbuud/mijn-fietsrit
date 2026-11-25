// Getekende racefiets (lijnen in currentColor) en trui-icoon voor de trofeeën.
// Wielerfiets met realistische verhoudingen (wielbasis ~98 cm, zadelbuis 73,5°, balhoofd 73°, krukas iets onder de naven).
// rijdt: wielen en trapas draaien rustig (alleen als de gebruiker geen "minder beweging" heeft ingesteld).
const spaken = (cx: number) => `M${cx} 45 V99 M${cx - 27} 72 H${cx + 27} M${cx - 19} 53 L${cx + 19} 91 M${cx + 19} 53 L${cx - 19} 91`;
export function Fiets({ className = "", rijdt = false }: { className?: string; rijdt?: boolean }) {
  const draai = rijdt ? "draai" : undefined;
  return (
    <svg viewBox="-2 14 148 94" className={className} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g className={draai} style={{ transformOrigin: "30px 72px" }}><circle cx="30" cy="72" r="30" /><path d={spaken(30)} strokeWidth="1" opacity=".5" /></g>
      <g className={draai} style={{ transformOrigin: "114px 72px" }}><circle cx="114" cy="72" r="30" /><path d={spaken(114)} strokeWidth="1" opacity=".5" /></g>
      <path d="M64.5 78.0 L50.1 29.5 L96.4 29.5 L100.5 42.7 L64.5 78.0 M100.5 42.7 L96.4 29.5 M51.3 33.4 L30.0 72.0 L64.5 78.0" />
      <path d="M100.5 42.7 L114.0 72.0" />
      <path d="M50.1 29.5 L47.3 19.9 M39.3 19.4 L55.3 18.4" strokeWidth="3.2" />
      <path d="M96.4 29.5 L95.3 25.7 L104.3 26.5" strokeWidth="3.2" />
      <path d="M103.3 26.5 H108.3 C114.3 26.5 117.3 30.5 117.3 35.5 C117.3 41.5 112.3 44.5 106.3 44.5" strokeWidth="3" />
      <circle cx="64.5" cy="78" r="6.5" strokeWidth="1.6" />
      <g className={draai} style={{ transformOrigin: "64.5px 78px" }}><path d="M64.5 78.0 L59.5 91.0 M55.5 91.0 H63.5" strokeWidth="3" /></g>
      <circle cx="30" cy="72" r="3.5" strokeWidth="1.6" />
    </svg>
  );
}

export function Trui({ kleur, bolletjes = false, banden, bandVan = 6, bandTot = 58, className = "" }: { kleur: string; bolletjes?: boolean; banden?: string[]; bandVan?: number; bandTot?: number; className?: string }) {
  const d = "M22 6 L8 14 L2 30 L14 34 L16 28 L16 58 L48 58 L48 28 L50 34 L62 30 L56 14 L42 6 Q32 16 22 6Z";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs><clipPath id="trui-clip"><path d={d} /></clipPath></defs>
      <path d={d} fill={kleur} />
      {banden && (
        <g clipPath="url(#trui-clip)">
          {banden.map((c, i) => { const h = (bandTot - bandVan) / banden.length; return <rect key={`${c}-${i}`} x="0" y={bandVan + i * h} width="64" height={h + 0.3} fill={c} />; })}
        </g>
      )}
      {bolletjes && (
        <g clipPath="url(#trui-clip)" fill="#e5322d">
          {[[14,18],[30,24],[46,18],[22,38],[40,40],[30,54],[52,52],[10,50]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4.2" />)}
        </g>
      )}
      <path d={d} fill="none" stroke="#1d2230" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 16 V58" stroke="#1d2230" strokeWidth="1.5" opacity=".5" />
    </svg>
  );
}
