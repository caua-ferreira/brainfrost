"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProviderMeta, VaultMeta } from "@/lib/meta";

interface Props {
  meta: VaultMeta;
}

// timeZone fixo em UTC — mesma razão que os outros componentes.
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

const KIND_LABEL: Record<ProviderMeta["kind"], string> = {
  print: "print",
  cmd: "cmd",
  http: "http",
};

export default function ConfigDashboard({ meta }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-arctic">Config</h1>
          <p className="mt-1 text-sm text-mute">
            Snapshot do <code className="font-mono text-arctic">~/.brainfrostrc</code> no momento
            em que você rodou <code className="font-mono text-arctic">bfrost meta</code>. A UI só
            lê — todo comando continua no CLI.
          </p>
          <p className="mt-2 font-mono text-[11px] text-mute/70">
            atualizado em {formatDateTime(meta.updatedAt)}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ActiveCard meta={meta} />
          <BehaviorCard meta={meta} />
        </div>

        <Card className="border-glow/15 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-arctic">Provedores</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {meta.providers.map((provider) => (
              <ProviderRow
                key={provider.name}
                provider={provider}
                active={provider.name === meta.activeProvider}
              />
            ))}
          </CardContent>
        </Card>

        <HowToChange activeProvider={meta.activeProvider} />
      </div>
    </div>
  );
}

function ActiveCard({ meta }: { meta: VaultMeta }) {
  const active = meta.providers.find((p) => p.name === meta.activeProvider);
  return (
    <Card className="border-glow/15 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-arctic">Provedor ativo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-medium text-glow">{meta.activeProvider}</span>
          {active && (
            <Badge
              variant="outline"
              className="border-glow/25 bg-glow/5 font-mono text-[10px] text-mute"
            >
              {KIND_LABEL[active.kind]}
            </Badge>
          )}
        </div>
        {active?.about && <p className="text-xs text-mute">{active.about}</p>}
        <p className="pt-1 font-mono text-[11px] text-mute">
          modelo: {meta.model ?? active?.model ?? <span className="text-mute/60">—</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function BehaviorCard({ meta }: { meta: VaultMeta }) {
  return (
    <Card className="border-glow/15 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-arctic">Comportamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 font-mono text-[12px] text-arctic/85">
        <Row label="autoPull" value={meta.autoPull ? "sim" : "não"} />
        <Row label="autoPush" value={meta.autoPush ? "sim" : "não"} />
        <Row label="header customizado" value={meta.header ? "sim" : "não"} />
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-mute">{label}</span>
      <span className="text-arctic">{value}</span>
    </div>
  );
}

function ProviderRow({ provider, active }: { provider: ProviderMeta; active: boolean }) {
  const missingKey = provider.envVars.some((v) => !v.present);
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm transition-colors",
        active ? "border-glow/50 bg-glow/[0.06]" : "border-glow/15 bg-abyss/30"
      )}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[13px] font-medium text-arctic">{provider.name}</span>
          <Badge
            variant="outline"
            className="border-glow/20 bg-glow/5 font-mono text-[10px] text-mute"
          >
            {KIND_LABEL[provider.kind]}
          </Badge>
          {provider.custom && (
            <Badge
              variant="outline"
              className="border-aurora/40 bg-aurora/5 font-mono text-[10px] text-aurora"
            >
              custom
            </Badge>
          )}
        </div>
        {active && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-glow">ativo</span>
        )}
      </div>
      {provider.about && <p className="text-xs leading-relaxed text-mute">{provider.about}</p>}

      {provider.model && (
        <p className="mt-2 font-mono text-[11px] text-mute">
          modelo: <span className="text-arctic/80">{provider.model}</span>
        </p>
      )}
      {provider.cmd && (
        <p className="mt-1 font-mono text-[11px] text-mute">
          cmd: <span className="text-arctic/80">{provider.cmd}</span>
        </p>
      )}
      {provider.url && (
        <p className="mt-1 truncate font-mono text-[11px] text-mute" title={provider.url}>
          url: <span className="text-arctic/80">{provider.url}</span>
        </p>
      )}

      {provider.envVars.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {provider.envVars.map((env) => (
            <span
              key={env.name}
              className={cn(
                "flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]",
                env.present
                  ? "border-glow/25 bg-glow/5 text-arctic/85"
                  : "border-aurora/40 bg-aurora/5 text-aurora"
              )}
            >
              {env.present ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
              {env.name}
            </span>
          ))}
          {missingKey && (
            <span className="font-mono text-[10px] text-aurora/80">
              exporte antes de usar
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const COMMANDS = [
  { label: "trocar provedor padrão", cmd: "bfrost config --provider anthropic" },
  { label: "trocar modelo padrão", cmd: "bfrost config --model claude-sonnet-4-5" },
  { label: "listar provedores (terminal)", cmd: "bfrost providers" },
  { label: "regerar este dashboard", cmd: "bfrost meta && git add .brainfrost/_meta.json && git commit -m \"❄️ meta\" && git push" },
];

function HowToChange({ activeProvider }: { activeProvider: string }) {
  return (
    <Card className="border-glow/15 bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-arctic">Como mudar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-mute">
          Ativo agora: <code className="font-mono text-arctic">{activeProvider}</code>. A UI
          nunca escreve — use os comandos abaixo no seu terminal.
        </p>
        <div className="space-y-2">
          {COMMANDS.map((c) => (
            <CommandLine key={c.cmd} label={c.label} cmd={c.cmd} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CommandLine({ label, cmd }: { label: string; cmd: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
    } catch {
      // clipboard bloqueado — não atrapalha
    }
  }

  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-mute/80">{label}</p>
      <button
        onClick={copy}
        className="flex w-full items-center gap-3 rounded-md border border-glow/15 bg-abyss/60 px-3 py-2 text-left font-mono text-[12px] text-arctic transition-colors hover:border-glow/40"
      >
        <span className="text-glow">$</span>
        <span className="flex-1 truncate">{cmd}</span>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-glow" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 text-mute" />
        )}
      </button>
    </div>
  );
}
