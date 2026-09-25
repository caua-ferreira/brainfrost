"use client";

import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, ShieldCheck, Terminal, Trash2 } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { useSession } from "@/components/saas/SessionProvider";
import { palette } from "@/lib/saas-theme";
import type { LlmProvider } from "@/lib/saas-types";

const PROVIDERS: { id: LlmProvider; label: string; hint: string; placeholder: string; local?: boolean }[] = [
  { id: "claude", label: "Anthropic Claude", hint: "modelos Opus, Sonnet, Haiku", placeholder: "sk-ant-…" },
  { id: "gemini", label: "Google Gemini",    hint: "modelos 3.6 Pro, Flash, Nano", placeholder: "AIza…" },
  { id: "webllm", label: "Local (Llama 3.2)", hint: "roda no navegador — sem chave, sem custo", placeholder: "—", local: true },
];

const SANITIZED = [
  ".env*", "*.pem", "*.key", "id_rsa*", "credentials.json",
  "service-account*.json", "PRIVATE KEY", "sk-*", "ghp_*", "AKIA*",
  "binários", "PII em seeds",
];

interface StoredCred {
  provider: LlmProvider;
  deep_analysis: boolean;
  updated_at: string;
}

export default function ConfigPage() {
  const theme = useSaas((s) => s.theme);
  const config = useSaas((s) => s.config);
  const setConfig = useSaas((s) => s.setConfig);
  const { session } = useSession();
  const c = palette(theme);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | { error: string }>(null);
  const [stored, setStored] = useState<StoredCred[]>([]);
  const [cliCopied, setCliCopied] = useState(false);

  const copyCliBlob = async () => {
    if (!session) return;
    const blob = JSON.stringify({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    await navigator.clipboard.writeText(blob);
    setCliCopied(true);
    setTimeout(() => setCliCopied(false), 2500);
  };

  const refresh = () =>
    fetch("/api/config/llm-key")
      .then((r) => r.json())
      .then((json) => setStored(json.credentials ?? []))
      .catch(() => {});

  useEffect(() => {
    refresh();
  }, []);

  const isStored = (p: LlmProvider) => stored.some((s) => s.provider === p);

  const save = async () => {
    if (config.apiKey.trim().length < 8) {
      setSaved({ error: "Cole uma chave real antes de salvar." });
      return;
    }
    setBusy(true);
    setSaved(null);
    const res = await fetch("/api/config/llm-key", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: config.llmProvider,
        api_key: config.apiKey,
        deep_analysis: config.deepAnalysis,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setSaved({ error: j.error ?? "Erro ao salvar." });
      return;
    }
    setConfig({ apiKey: "" });
    setSaved("ok");
    refresh();
  };

  const remove = async (provider: LlmProvider) => {
    if (!confirm(`Remover a chave do ${provider}? Isso não pode ser desfeito.`)) return;
    const res = await fetch(`/api/config/llm-key?provider=${provider}`, { method: "DELETE" });
    if (res.ok) refresh();
  };

  const providerLabel = PROVIDERS.find((p) => p.id === config.llmProvider)?.label;
  const providerPlaceholder = PROVIDERS.find((p) => p.id === config.llmProvider)?.placeholder;

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

      <div className="relative mx-auto max-w-3xl px-6 py-16 md:py-20">
        <h1
          className="text-[42px] font-semibold leading-[1.02] tracking-tight md:text-[56px]"
          style={{ color: c.text }}
        >
          Seu extrator,
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}
          >
            suas regras.
          </span>
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed" style={{ color: c.dim }}>
          Suas chaves da LLM ficam criptografadas com AES-256-GCM antes de tocar o banco. Você pode
          guardar Claude e Gemini juntos e escolher qual usar em cada análise.
        </p>

        {/* Provedor */}
        <section className="mt-14 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
                Provedor selecionado
              </p>
              <p className="mt-2 max-w-lg text-[13px]" style={{ color: c.dim }}>
                É o que a próxima análise vai usar. Você pode ter chave dos dois.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-3">
            {PROVIDERS.map((p) => {
              const active = config.llmProvider === p.id;
              const has = isStored(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setConfig({ llmProvider: p.id })}
                  className="rounded-2xl border p-4 text-left transition-all"
                  style={{
                    background: active ? `${c.accent}12` : "transparent",
                    borderColor: active ? c.accent : c.borderSoft,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[14px] font-semibold" style={{ color: c.text }}>
                      {p.label}
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                      style={{
                        background: p.local
                          ? `${c.accent}20`
                          : has
                            ? `${c.aurora}20`
                            : `${c.dim}20`,
                        color: p.local ? c.accent : has ? c.aurora : c.dim,
                      }}
                    >
                      {p.local ? "sem chave" : has ? "chave salva" : "sem chave"}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[10px]" style={{ color: c.dim }}>
                    {p.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Chave — só pra provedores que precisam */}
        {config.llmProvider !== "webllm" && (
        <section className="mt-12 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
                Chave da API · {providerLabel}
              </p>
              <p className="mt-2 max-w-lg text-[13px]" style={{ color: c.dim }}>
                Traga sua própria chave — nunca sai criptografada do banco.
              </p>
            </div>
            {isStored(config.llmProvider) && (
              <button
                onClick={() => remove(config.llmProvider)}
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest hover:brightness-125"
                style={{ color: "#ff6b81" }}
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                remover
              </button>
            )}
          </div>
          <div
            className="mt-5 flex items-center gap-2 rounded-xl border px-3"
            style={{ background: c.bgSoft, borderColor: c.borderSoft }}
          >
            <input
              type={showKey ? "text" : "password"}
              value={config.apiKey}
              onChange={(e) => setConfig({ apiKey: e.target.value })}
              placeholder={providerPlaceholder}
              className="h-12 flex-1 bg-transparent font-mono text-[13px] outline-none placeholder:opacity-50"
              style={{ color: c.text }}
              autoComplete="off"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
              style={{ color: c.dim }}
              title={showKey ? "Ocultar" : "Mostrar"}
            >
              {showKey ? <EyeOff className="h-4 w-4" strokeWidth={1.8} /> : <Eye className="h-4 w-4" strokeWidth={1.8} />}
            </button>
          </div>
          {isStored(config.llmProvider) && !config.apiKey && (
            <div className="mt-3 flex items-center gap-2 font-mono text-[11px]" style={{ color: c.aurora }}>
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
              chave guardada · cole outra pra substituir
            </div>
          )}
          <div className="mt-6 flex items-center justify-end gap-3">
            {saved === "ok" && (
              <span className="font-mono text-[11px]" style={{ color: c.aurora }}>
                salvo · criptografado
              </span>
            )}
            {saved && typeof saved === "object" && "error" in saved && (
              <span className="font-mono text-[11px]" style={{ color: "#ff6b81" }}>
                {saved.error}
              </span>
            )}
            <button
              onClick={save}
              disabled={busy || config.apiKey.trim().length < 8}
              className="rounded-full px-6 py-2.5 text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: c.accent, color: c.onAccent }}
            >
              {busy ? "…" : "Salvar chave"}
            </button>
          </div>
        </section>
        )}

        {/* Aviso do WebLLM */}
        {config.llmProvider === "webllm" && (
        <section className="mt-12 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
            Modelo Local (Llama 3.2)
          </p>
          <p className="mt-3 max-w-lg text-[13px] leading-relaxed" style={{ color: c.dim }}>
            Roda direto no seu navegador via WebGPU — zero rede, zero chave, zero custo. O
            primeiro uso baixa <span style={{ color: c.text }}>~800 MB</span> do modelo e fica em
            cache pras próximas análises. Precisa de Chrome/Edge 113+ ou Safari 26+ com GPU
            razoável (≥ 2 GB VRAM).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["sem chave", "sem custo", "seus dados não saem", "~30-60s por análise"].map((t) => (
              <span
                key={t}
                className="rounded-full border px-2.5 py-0.5 font-mono text-[10px]"
                style={{ borderColor: c.borderSoft, color: c.dim }}
              >
                {t}
              </span>
            ))}
          </div>
        </section>
        )}

        {/* Análise profunda */}
        <section className="mt-12 flex items-center justify-between border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
              Análise profunda
            </p>
            <p className="mt-2 max-w-md text-[13px]" style={{ color: c.dim }}>
              Vasculha código-fonte além dos markdowns. Mais preciso, gasta mais token.
            </p>
          </div>
          <button
            onClick={() => setConfig({ deepAnalysis: !config.deepAnalysis })}
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{ background: config.deepAnalysis ? c.accent : c.bgSoft }}
            role="switch"
            aria-checked={config.deepAnalysis}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full shadow transition-transform"
              style={{
                left: config.deepAnalysis ? "1.5rem" : "0.125rem",
                background: config.deepAnalysis ? c.onAccent : c.dim,
              }}
            />
          </button>
        </section>

        {/* CLI */}
        <section className="mt-12 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" strokeWidth={1.8} style={{ color: c.accent }} />
            <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
              Usar no terminal (CLI)
            </p>
          </div>
          <p className="mt-2 max-w-lg text-[13px]" style={{ color: c.dim }}>
            Copia sua sessão atual em um blob JSON pra colar no <code className="font-mono">bfrost login</code>. Depois{" "}
            <code className="font-mono">bfrost pull</code> baixa suas camadas e <code className="font-mono">bfrost inject</code> leva pro
            CLAUDE.md do repo que você estiver.
          </p>
          <pre
            className="mt-5 rounded-xl border px-4 py-3 font-mono text-[12px] leading-relaxed"
            style={{ background: c.bgSoft, borderColor: c.borderSoft, color: c.dim }}
          >
            <span style={{ color: c.text }}>echo &apos;&lt;blob que copiei&gt;&apos; | bfrost login</span>{"\n"}
            bfrost pull{"\n"}
            bfrost inject
          </pre>
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="max-w-md text-[11px]" style={{ color: c.dim }}>
              O blob dá acesso total ao seu cofre. Não compartilhe. Cada login refresca essa sessão.
            </p>
            <button
              onClick={copyCliBlob}
              disabled={!session}
              className="flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-medium transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: c.accent, color: c.onAccent }}
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={2} />
              {cliCopied ? "copiado!" : "Copiar blob"}
            </button>
          </div>
        </section>

        {/* Sanitização */}
        <section className="mt-12 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
            Sanitização
          </p>
          <p className="mt-2 max-w-lg text-[13px]" style={{ color: c.dim }}>
            Padrões descartados antes de qualquer análise. Somente leitura.
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {SANITIZED.map((s) => (
              <span
                key={s}
                className="rounded-full border px-2.5 py-0.5 font-mono text-[10px]"
                style={{ borderColor: c.borderSoft, color: c.dim }}
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
