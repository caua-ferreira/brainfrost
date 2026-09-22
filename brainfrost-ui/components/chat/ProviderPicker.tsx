"use client";

import { AlertTriangle, Check } from "lucide-react";
import { PROVIDER_PRESETS, type ProviderPreset } from "@/lib/chat-client";
import { useChatStore } from "@/lib/chat-store";
import { cn } from "@/lib/utils";

interface Props {
  onPick: (preset: ProviderPreset) => void;
  /** Mostra "conectado" nos cards que já têm config salva. */
  compact?: boolean;
}

/**
 * Grade de cards de provedor. Um toque escolhe o preset e o pai (ChatRoom)
 * abre o modal simplificado. Nada de escolher `api`/`url` na mão — cada
 * card já traz tudo preenchido.
 */
export function ProviderPicker({ onPick, compact }: Props) {
  const configs = useChatStore((s) => s.configs);
  const connectedKeys = new Set(configs.map((c) => c.label));

  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}
    >
      {PROVIDER_PRESETS.map((preset) => (
        <ProviderCard
          key={preset.key}
          preset={preset}
          connected={connectedKeys.has(preset.label)}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  preset,
  connected,
  onPick,
}: {
  preset: ProviderPreset;
  connected: boolean;
  onPick: (p: ProviderPreset) => void;
}) {
  return (
    <button
      onClick={() => onPick(preset)}
      className={cn(
        "group relative flex min-h-[112px] flex-col gap-2 rounded-xl border p-4 text-left transition-all",
        connected
          ? "border-glow/50 bg-glow/[0.08]"
          : "border-glow/15 bg-card/50 hover:border-glow/40 active:scale-[0.98]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="text-2xl">
            {preset.glyph}
          </span>
          <div>
            <p className="text-[15px] font-semibold text-arctic">{preset.label}</p>
            <p className="text-[11px] text-mute">{preset.tagline}</p>
          </div>
        </div>
        {connected && (
          <span className="flex h-5 items-center gap-1 rounded-full border border-glow/40 bg-glow/10 px-1.5 font-mono text-[10px] text-glow">
            <Check className="h-3 w-3" />
            ok
          </span>
        )}
      </div>
      {!preset.browserFriendly && (
        <div className="mt-auto flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-aurora/85">
          <AlertTriangle className="h-3 w-3" />
          pode falhar por cors
        </div>
      )}
    </button>
  );
}
