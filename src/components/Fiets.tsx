// Getekende racefiets (lijnen in currentColor) en trui-icoon voor de trofeeën.
// rijdt: wielen en trapas draaien rustig (alleen als de gebruiker geen "minder beweging" heeft ingesteld).
export function Fiets({ className = "", rijdt = false }: { className?: string; rijdt?: boolean }) {
  const draai = rijdt ? "draai" : undefined;
  const spaken = (cx: number) => `M${cx} 42 V102 M${cx - 30} 72 H${cx + 30} M${cx - 21} 51 L${cx + 21} 93 M${cx + 21} 51 L${cx - 21} 93`;
  return (
    <svg viewBox="0 0 200 110" className={className} fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g className={draai} style={{ transformOrigin: "40px 72px" }}><circle cx="40" cy="72" r="30" /><path d={spaken(40)} strokeWidth="1.2" opacity=".5" /></g>
      <g className={draai} style={{ transformOrigin: "160px 72px" }}><circle cx="160" cy="72" r="30" /><path d={spaken(160)} strokeWidth="1.2" opacity=".5" /></g>
      <path d="M40 72 L90 72 L78 36 Z" /><path d="M78 36 L138 36 L90 72" /><path d="M138 36 L160 72" />
      <path d="M78 36 L74 24 M66 24 L88 24" />
      <path d="M138 36 L134 28 M134 28 Q146 22 154 28 Q160 34 150 42" />
      <circle cx="90" cy="72" r="5" />
      <g className={draai} style={{ transformOrigin: "90px 72px" }}><path d="M90 72 L100 86 M95 86 L106 86" /></g>
    </svg>
  );
}

export function Trui({ kleur, bolletjes = false, className = "" }: { kleur: string; bolletjes?: boolean; className?: string }) {
  const d = "M22 6 L8 14 L2 30 L14 34 L16 28 L16 58 L48 58 L48 28 L50 34 L62 30 L56 14 L42 6 Q32 16 22 6Z";
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs><clipPath id="trui-clip"><path d={d} /></clipPath></defs>
      <path d={d} fill={kleur} />
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
