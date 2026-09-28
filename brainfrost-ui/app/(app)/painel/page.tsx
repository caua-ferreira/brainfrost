"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Download, Upload } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { useSession } from "@/components/saas/SessionProvider";
import { palette } from "@/lib/saas-theme";
import { useImports, useSuggestions, useVaultNotes } from "@/lib/supabase/hooks";
import { AI_TARGETS } from "@/components/saas/AiLogos";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

const relative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86400_000;
  if (diff < day) return "hoje";
  const days = Math.floor(diff / day);
  if (days < 30) return `há ${days}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

export default function PainelPage() {
  const { session } = useSession();
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);
  const { imports, loading: importsLoading } = useImports();
  const { suggestions, loading: suggestionsLoading } = useSuggestions("pending");
  const { notes, loading: notesLoading } = useVaultNotes();

  if (importsLoading || suggestionsLoading || notesLoading) {
    return (
      <LoadingScreen
        message="carregando painel"
        mascot="/mascot/yeti-laptop-ezgif.com-crop.gif"
      />
    );
  }

  const pending = suggestions.length;
  const vaultLayers = notes.length;

  const meta = (session?.user.user_metadata ?? {}) as {
    display_name?: string;
    full_name?: string;
    name?: string;
  };
  const identity = session?.user.identities?.[0]?.identity_data as
    | { full_name?: string; name?: string }
    | undefined;
  const fullName =
    meta.display_name ??
    meta.full_name ??
    meta.name ??
    identity?.full_name ??
    identity?.name ??
    session?.user.email ??
    "Você";
  const firstName = fullName.split(/\s+/)[0];

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden" style={{ background: c.bg }}>
      
      {/* === BACKGROUND DO HERO === */}
      <div 
        className="pointer-events-none absolute left-0 right-0 top-0 h-[650px] bg-white"
        style={{
          maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)'
        }}
      >
        <div
          className="absolute right-0 top-12 h-[350px] w-[350px] translate-x-[20%] rounded-full blur-[80px]"
          style={{ background: "#2563eb", opacity: 0.15 }} 
        />
      </div>
      {/* ========================== */}

      <div className="relative z-10">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <div className="grid grid-cols-12 items-center gap-6">
            
            {/* COLUNA ESQUERDA (Yeti em 450px) */}
            <div className="col-span-12 hidden md:col-span-6 md:flex md:justify-start">
              <div className="relative">
                {vaultLayers === 0 && pending === 0 ? (
                  <Image
                    src="/mascot/yeti-laptop-ezgif.com-crop.gif"
                    alt="Frostie digitando"
                    width={480} 
                    height={630} 
                    priority
                    unoptimized
                    className="yeti-float h-auto w-[450px]"
                  />
                ) : pending > 0 ? (
                  <video
                    src="/mascot/yeti-laptop.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-auto w-[450px]"
                  />
                ) : (
                  <video
                    src="/mascot/yeti-sleeping-video.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-auto w-[450px]"
                  />
                )}
              </div>
            </div>

            {/* COLUNA DIREITA (Textos) */}
            <div className="col-span-12 md:col-span-6">
              <h1
                className="text-[44px] font-semibold leading-[1.02] tracking-tight md:text-[64px]"
                style={{ color: "#0f172a" }} 
              >
                {firstName},
              </h1>
              <h1
                className="mt-1 text-[44px] font-semibold leading-[1.02] tracking-tight md:text-[64px]"
              >
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}
                >
                  seu contexto,
                  <br />
                  sempre à mão.
                </span>
              </h1>
              <p className="mt-6 max-w-lg text-[15px] leading-relaxed" style={{ color: "#475569" }}>
                {pending > 0
                  ? `${pending} sugestões novas esperando seu sim. Cada uma vira uma camada quando você aprova.`
                  : "Tudo em dia por aqui. Suba um repo novo pra deixar o cérebro aprender."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/importar"
                  className="group inline-flex items-center gap-2 rounded-full px-5 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
                  style={{ background: c.accent, color: c.onAccent }}
                >
                  <Upload className="h-4 w-4" strokeWidth={2} />
                  Importar repositório
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2} />
                </Link>
                <Link
                  href="/exportar"
                  className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-[14px] font-medium transition-colors hover:bg-slate-50"
                  style={{ borderColor: "#e2e8f0", color: "#0f172a" }}
                >
                  <Download className="h-4 w-4" strokeWidth={1.8} />
                  Baixar contexto
                </Link>
              </div>
            </div>

          </div>

          {/* ESTATÍSTICAS */}
          <div
            className="mt-12 grid grid-cols-3 gap-6 border-t pt-8"
            style={{ borderColor: c.borderSoft }}
          >
            <Stat value={vaultLayers} label="camadas no cérebro" tint={c.accent} textColor={c.text} dimColor={c.dim} />
            <Stat value={pending} label="sugestões pendentes" tint={c.aurora} textColor={c.text} dimColor={c.dim} href={pending > 0 ? "/curadoria" : undefined} />
            <Stat value={imports.length} label="repos analisados" tint={c.dim} textColor={c.text} dimColor={c.dim} />
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-5xl px-6 pb-16">
        {/* Faixa de IAs suportadas */}
        <section className="mt-4 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
            Leve o seu contexto para qualquer IA
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
            {AI_TARGETS.map(({ id, label, Icon }) => (
              <div
                key={id}
                className="flex items-center gap-2.5 transition-opacity"
                style={{ color: c.dim, opacity: 0.75 }}
                title={label}
              >
                <Icon size={20} />
                <span className="text-[13px] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Últimas importações */}
        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[17px] font-semibold" style={{ color: c.text }}>
              Últimas importações
            </h2>
            <Link
              href="/importar"
              className="font-mono text-[11px] uppercase tracking-widest hover:underline"
              style={{ color: c.accent }}
            >
              nova →
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: c.borderSoft }}>
            {imports.length === 0 ? (
              <p className="py-8 text-[14px]" style={{ color: c.dim }}>
                Nenhuma importação ainda.
              </p>
            ) : (
              imports.map((imp) => (
                <div key={imp.id} className="flex items-center justify-between py-4" style={{ borderColor: c.borderSoft }}>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium" style={{ color: c.text }}>
                      {imp.label}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px]" style={{ color: c.dim }}>
                      {imp.file_count} arquivos · {imp.source} · {relative(imp.created_at)}
                      {imp.provider_used && ` · ${imp.provider_used}`}
                    </div>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest"
                    style={{
                      background: `${imp.status === "pronto" ? c.aurora : c.accent}18`,
                      color: imp.status === "pronto" ? c.aurora : c.accent,
                    }}
                  >
                    {imp.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tint,
  textColor,
  dimColor,
  href,
}: {
  value: number;
  label: string;
  tint: string;
  textColor: string;
  dimColor: string;
  href?: string;
}) {
  const inner = (
    <div className="group flex items-baseline gap-3">
      <div className="text-[36px] font-semibold leading-none tabular-nums transition-colors" style={{ color: textColor }}>
        {value}
      </div>
      <div className="font-mono text-[11px] uppercase leading-tight tracking-widest" style={{ color: dimColor }}>
        {label}
      </div>
      <span className="ml-auto h-1 w-1 rounded-full" style={{ background: tint }} />
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
