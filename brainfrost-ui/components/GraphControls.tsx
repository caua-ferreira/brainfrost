"use client";

import { Crosshair, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useGraphPrefs } from "@/lib/store";

interface Props {
  onRecenter: () => void;
}

export function GraphControls({ onRecenter }: Props) {
  const { spacing, showLabels, set, reset } = useGraphPrefs();

  return (
    <div className="pane pointer-events-auto absolute right-4 top-4 z-10 w-64 rounded-xl p-4 text-arctic shadow-pane">
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

        <button
          onClick={onRecenter}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-glow/25 bg-rift/30 px-3 py-1.5 text-xs text-arctic transition-colors hover:border-glow/60"
        >
          <Crosshair className="h-3.5 w-3.5" />
          recentralizar
        </button>
      </div>
    </div>
  );
}
