"use client";

import { useState } from "react";
import { Crosshair, RotateCcw, Sliders } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useGraphPrefs } from "@/lib/store";

interface Props {
  onRecenter: () => void;
}

/**
 * Painel de controles — desktop mostra num card flutuante no canto superior
 * direito; mobile aparece via FAB + Sheet bottom. Toda a lógica vive no
 * `ControlsBody` compartilhado; só a moldura muda por breakpoint.
 */
export function GraphControls({ onRecenter }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop: card flutuante permanente */}
      <div className="pane pointer-events-auto absolute right-4 top-4 z-10 hidden w-64 rounded-xl p-4 text-arctic shadow-pane md:block">
        <ControlsBody onRecenter={onRecenter} />
      </div>

      {/* Mobile: FAB no canto inferior direito abre um Sheet bottom */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Controles do grafo"
        className="pane pointer-events-auto absolute bottom-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full text-arctic shadow-pane md:hidden"
      >
        <Sliders className="h-4 w-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="border-t bg-card p-4 text-arctic hairline md:hidden"
        >
          <SheetHeader className="mb-3">
            <SheetTitle className="text-sm font-semibold text-arctic">
              Controles do grafo
            </SheetTitle>
          </SheetHeader>
          <ControlsBody onRecenter={() => { onRecenter(); setOpen(false); }} showTitle={false} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function ControlsBody({
  onRecenter,
  showTitle = true,
}: {
  onRecenter: () => void;
  showTitle?: boolean;
}) {
  const { spacing, showLabels, dimByAge, set, reset } = useGraphPrefs();

  return (
    <>
      {showTitle && (
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">
            controles do grafo
          </p>
          <button
            onClick={reset}
            className="rounded-md p-1 text-mute transition-colors hover:text-arctic"
            aria-label="Restaurar padrão"
            title="Restaurar padrão"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="space-y-4">
        <label className="block">
          <div className="mb-2 flex items-baseline justify-between text-[12px]">
            <span>espaço entre nós</span>
            <span className="font-mono text-[11px] text-mute">{spacing}</span>
          </div>
          <Slider
            value={[spacing]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => set({ spacing: v })}
            aria-label="Espaço entre nós"
          />
        </label>

        <label className="flex items-center justify-between text-[12px]">
          <span>sempre mostrar rótulos</span>
          <Switch
            checked={showLabels}
            onCheckedChange={(v) => set({ showLabels: v })}
            aria-label="Sempre mostrar rótulos"
          />
        </label>

        <label className="flex items-center justify-between text-[12px]">
          <span>apagar camadas antigas</span>
          <Switch
            checked={dimByAge}
            onCheckedChange={(v) => set({ dimByAge: v })}
            aria-label="Apagar camadas antigas"
          />
        </label>

        <button
          onClick={onRecenter}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-glow/25 bg-rift/30 px-3 py-2 text-xs text-arctic transition-colors hover:border-glow/60"
        >
          <Crosshair className="h-3.5 w-3.5" />
          recentralizar
        </button>

        {!showTitle && (
          <button
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-[11px] text-mute transition-colors hover:text-arctic"
          >
            <RotateCcw className="h-3 w-3" />
            restaurar padrão
          </button>
        )}
      </div>
    </>
  );
}
