"use client";

import { AlertTriangle, Check, ChevronRight } from "lucide-react";
import { PROVIDER_PRESETS, type ProviderPreset } from "@/lib/chat-client";
import { useChatStore } from "@/lib/chat-store";
import { cn } from "@/lib/utils";
import { ProviderLogo } from "./ProviderLogo";

interface Props {
  onPick: (preset: ProviderPreset) => void;
  compact?: boolean;
}

/** Lista compacta de provedores. Cada linha funciona como uma opção de seletor. */
export function ProviderPicker({ onPick, compact }: Props) {
  const configs = useChatStore((s) => s.configs);
  const connectedKeys = new Set(configs.map((c) => c.label));

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/15 bg-card/45",
        compact && "rounded-xl"
      )}
    >
      {PROVIDER_PRESETS.map((preset) => (
        <ProviderRow
          key={preset.key}
          preset={preset}
          connected={connectedKeys.has(preset.label)}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

function ProviderRow({
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
      type="button"
      onClick={() => onPick(preset)}
      className={cn(
        "group flex w-full items-center gap-3 border-b border-primary/10 px-4 py-3 text-left transition-colors last:border-b-0",
        connected ? "bg-primary/[0.08]" : "hover:bg-primary/[0.05]"
      )}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background/70"
        style={{ borderColor: `${preset.color}45` }}
      >
        <ProviderLogo preset={preset} size={23} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-foreground">{preset.label}</span>
          {connected && (
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
              <Check className="h-2.5 w-2.5" />
              conectado
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{preset.tagline}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
        {!preset.browserFriendly && (
          <span className="hidden items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-accent/85 sm:flex">
            <AlertTriangle className="h-3 w-3" />
            CORS
          </span>
        )}
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
