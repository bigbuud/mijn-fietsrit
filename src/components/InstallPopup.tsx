import { useEffect, useState } from "react";
import { Share, MoreVertical, PlusSquare } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Fiets } from "@/components/Fiets";
import { installeer, kanDirectInstalleren, opInstallatieWijziging, platform } from "@/lib/installeren";

export function InstallPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [direct, setDirect] = useState(kanDirectInstalleren());
  useEffect(() => { setDirect(kanDirectInstalleren()); return opInstallatieWijziging(() => setDirect(kanDirectInstalleren())); }, [open]);
  const p = typeof navigator === "undefined" ? "andere" : platform();

  const stap = "flex items-start gap-3 rounded-xl border-2 border-foreground bg-card p-3 text-sm";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <Fiets className="mx-auto mb-1 h-14 w-auto text-[color:var(--hero-accent)]" />
          <DialogTitle className="font-display text-center text-3xl uppercase tracking-wide">Fietslog als app</DialogTitle>
          <DialogDescription className="text-center">Zet Fietslog op je beginscherm: sneller openen, schermvullend en zonder adresbalk.</DialogDescription>
        </DialogHeader>

        {direct ? (
          <button onClick={() => void installeer().then((ok) => ok && onOpenChange(false))} className="knop-accent font-display w-full rounded-xl py-3 text-2xl uppercase">Installeren</button>
        ) : p === "ios" ? (
          <ol className="space-y-2">
            <li className={stap}><Share className="mt-0.5 h-5 w-5 shrink-0" /><span>Tik onderaan (of bovenaan op iPad) in Safari op de <b>deelknop</b>.</span></li>
            <li className={stap}><PlusSquare className="mt-0.5 h-5 w-5 shrink-0" /><span>Kies <b>“Zet op beginscherm”</b> en tik op <b>Voeg toe</b>.</span></li>
          </ol>
        ) : (
          <ol className="space-y-2">
            <li className={stap}><MoreVertical className="mt-0.5 h-5 w-5 shrink-0" /><span>Tik rechtsboven in de browser op het <b>menu</b> (drie puntjes).</span></li>
            <li className={stap}><PlusSquare className="mt-0.5 h-5 w-5 shrink-0" /><span>Kies <b>“App installeren”</b> of <b>“Toevoegen aan startscherm”</b>.</span></li>
          </ol>
        )}
        <button onClick={() => onOpenChange(false)} className="w-full rounded-xl py-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Later</button>
      </DialogContent>
    </Dialog>
  );
}
