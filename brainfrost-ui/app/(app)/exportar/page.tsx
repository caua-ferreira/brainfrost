"use client";

import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import type { ExportTarget } from "@/lib/saas-types";
import { useVaultNotes } from "@/lib/supabase/hooks";
import {
  ClaudeLogo,
  CopilotLogo,
  CortexLogo,
  CursorLogo,
  ChatGPTLogo,
} from "@/components/saas/AiLogos";

const TARGETS: {
  id: ExportTarget;
  label: string;
  file: string;
  hint: string;
  color: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  build: (body: string) => string;
}[] = [
  {
    id: "claude",
    label: "Claude Code",
    file: "CLAUDE.md",
    hint: "raiz do repo, lido automaticamente",
    color: "#D97757",
    Icon: ClaudeLogo,
    build: (body) => `# Contexto do BrainFrost\n\n${body}`,
  },
  {
    id: "cursor",
    label: "Cursor",
    file: ".cursor/rules/main.mdc",
    hint: "cada regra em uma linha",
    color: "#0F0F0F",
    Icon: CursorLogo,
    build: (body) =>
      `---\ndescription: Contexto do BrainFrost\nglobs: **/*\nalwaysApply: true\n---\n\n${body}`,
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    file: ".github/copilot-instructions.md",
    hint: "instrução global do Copilot",
    color: "#7B7B7B",
    Icon: CopilotLogo,
    build: (body) => `# Instruções do Copilot\n\n${body}`,
  },
  {
    id: "cortex",
    label: "Snowflake Cortex",
    file: "brainfrost_context.sql",
    hint: "prompt dollar-quoted para COMPLETE",
    color: "#29B5E8",
    Icon: CortexLogo,
    build: (body) => {
      // dollar-tag único evita colisão se o body contiver "$$"
      const tag = `$brainfrost$`;
      return `-- gerado pelo BrainFrost · troque o modelo por um disponível na sua região (SHOW CORTEX MODELS)\nSELECT SNOWFLAKE.CORTEX.COMPLETE(\n  'claude-3-5-sonnet',\n  ${tag}${body}${tag}\n);`;
    },
  },
  {
    id: "generic",
    label: "Genérico",
    file: "CONTEXTO.md",
    hint: "cole em ChatGPT, Gemini web, qualquer IA",
    color: "#10A37F",
    Icon: ChatGPTLogo,
    build: (body) => `# Meu contexto\n\n${body}`,
  },
];

export default function ExportarPage() {
  const theme = useSaas((s) => s.theme);
  const { notes } = useVaultNotes();
  const c = palette(theme);
  const [target, setTarget] = useState<ExportTarget>("claude");

  const body = notes.length
    ? notes.map((n) => `## ${n.title}\n\n${n.body}\n`).join("\n")
    : "_(nenhuma camada no cofre ainda — aceite sugestões em /curadoria)_";

  const current = TARGETS.find((t) => t.id === target)!;
  const content = current.build(body);

  const download = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = current.file.split("/").pop() ?? current.file;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = () => navigator.clipboard.writeText(content);

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden" style={{ background: c.bg }}>
      <div
        className="pointer-events-none absolute -right-32 top-0 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: c.accent, opacity: 0.10 }}
      />
      <div
        className="pointer-events-none absolute -left-32 top-72 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: c.aurora, opacity: 0.07 }}
      />

      <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-20">
        <h1
          className="text-[42px] font-semibold leading-[1.02] tracking-tight md:text-[56px]"
          style={{ color: c.text }}
        >
          Seu cofre,
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}
          >
            no formato de qualquer IA.
          </span>
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed" style={{ color: c.dim }}>
          Escolha a IA que você vai usar. Baixa o arquivo, joga na raiz do repo, e ela lê seu contexto.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-4 border-t pt-8 md:grid-cols-5" style={{ borderColor: c.borderSoft }}>
          {TARGETS.map((t) => {
            const active = t.id === target;
            const Icon = t.Icon;
            return (
              <button
                key={t.id}
                onClick={() => setTarget(t.id)}
                className="group flex flex-col items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-all"
                style={{
                  background: active ? `${c.accent}12` : "transparent",
                  borderColor: active ? c.accent : c.borderSoft,
                }}
              >
                <Icon size={26} color={active ? undefined : t.color} />
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: c.text }}>
                    {t.label}
                  </div>
                  <div className="mt-1 font-mono text-[10px]" style={{ color: c.dim }}>
                    {t.file}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="mt-10 rounded-2xl border"
          style={{ background: c.card, borderColor: c.border }}
        >
          <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: c.borderSoft }}>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
                pré-visualização
              </p>
              <p className="mt-2 text-[15px] font-medium" style={{ color: c.text }}>
                {current.file}
                <span className="ml-2 font-mono text-[11px]" style={{ color: c.dim }}>
                  · {current.hint}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copy}
                className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-medium transition-colors"
                style={{ borderColor: c.border, color: c.text }}
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                Copiar
              </button>
              <button
                onClick={download}
                className="flex items-center gap-1.5 rounded-full px-5 py-2 text-[12px] font-medium transition-transform hover:scale-[1.02]"
                style={{ background: c.accent, color: c.onAccent }}
              >
                <Download className="h-3.5 w-3.5" strokeWidth={2} />
                Baixar
              </button>
            </div>
          </div>
          <pre
            className="max-h-[400px] overflow-auto px-6 py-5 font-mono text-[12px] leading-relaxed"
            style={{ color: c.text }}
          >
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
