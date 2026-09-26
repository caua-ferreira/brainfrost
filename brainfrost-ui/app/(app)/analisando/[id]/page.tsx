"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { getSupabase } from "@/lib/supabase/client";
import { sanitize } from "@/lib/sanitize";
import {
  analyzeLocally,
  DEFAULT_WEBLLM_MODEL,
  isWebGPUAvailable,
  WEBLLM_MODELS,
  type WebLlmProgress,
} from "@/lib/webllm";
import { isCategory } from "@/lib/prompts";

const STAGES = [
  { at: 0,  label: "lendo arquivos",         detail: "descartando segredos e binários" },
  { at: 25, label: "mapeando padrões",       detail: "olhando comentários e markdowns" },
  { at: 50, label: "chamando LLM",           detail: "extraindo regras candidatas" },
  { at: 80, label: "categorizando sugestões",detail: "sabendo onde cada uma cai" },
];

export default function AnalisandoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const theme = useSaas((s) => s.theme);
  const provider = useSaas((s) => s.config.llmProvider);
  const webLlmModel = useSaas((s) => s.config.webLlmModel ?? DEFAULT_WEBLLM_MODEL);
  const c = palette(theme);

  const [progress, setProgress] = useState(5);
  const [modelProgress, setModelProgress] = useState<WebLlmProgress | null>(null);
  const [status, setStatus] = useState<"rodando" | "erro">("rodando");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const tick = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 4 + 1 : p));
    }, 400);

    const runServer = async () => {
      const res = await fetch(`/api/imports/${params.id}/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "erro desconhecido");
    };

    const runLocal = async () => {
      if (!isWebGPUAvailable()) {
        throw new Error(
          "WebGPU não está disponível. Use Chrome/Edge 113+ ou Safari 26+ com WebGPU habilitado."
        );
      }
      const supabase = getSupabase();
      const { data: imp, error: impErr } = await supabase
        .from("imports")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();
      if (impErr || !imp) throw new Error(impErr?.message ?? "import não encontrado");
      if (!imp.raw_text) throw new Error("import sem conteúdo (raw_text vazio)");

      const sanitized = sanitize(imp.raw_text);
      const rawSuggestions = await analyzeLocally(sanitized.cleanText, webLlmModel, (p) => setModelProgress(p));

      const rows = rawSuggestions
        .filter((s) => s.title && s.body)
        .map((s) => ({
          import_id: params.id,
          title: s.title.slice(0, 200),
          body: s.body,
          category: isCategory(s.category) ? s.category : "projeto",
          evidence: s.evidence?.slice(0, 200) ?? null,
        }));

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("pattern_suggestions").insert(rows);
        if (insErr) throw new Error(insErr.message);
      }

      await supabase
        .from("imports")
        .update({
          status: "pronto",
          finished_at: new Date().toISOString(),
          provider_used: "webllm",
        })
        .eq("id", params.id);
    };

    (async () => {
      try {
        if (provider === "webllm") await runLocal();
        else await runServer();
        clearInterval(tick);
        setProgress(100);
        setTimeout(() => router.replace("/curadoria"), 700);
      } catch (e) {
        clearInterval(tick);
        setStatus("erro");
        setErrorMsg(e instanceof Error ? e.message : "erro de rede");
      }
    })();

    return () => clearInterval(tick);
  }, [params.id, router, provider, webLlmModel]);

  const stage = [...STAGES].reverse().find((s) => progress >= s.at) ?? STAGES[0];
  const showModelProgress = provider === "webllm" && modelProgress && modelProgress.progress < 1;

  return (
    <div className="flex h-full items-center justify-center overflow-auto" style={{ background: c.bg }}>
      <div className="mx-auto w-full max-w-xl px-6 py-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.accent, opacity: 0.8 }}>
          {status === "erro" ? "algo deu errado" : provider === "webllm" ? "analisando local" : "analisando"}
        </p>
        <h1 className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-tight md:text-[44px]" style={{ color: c.text }}>
          {status === "erro" ? "Não deu." : showModelProgress ? "baixando modelo" : stage.label}
          {status !== "erro" && <span className="animate-pulse" style={{ color: c.aurora }}>.</span>}
        </h1>
        <p className="mt-3 text-[14px]" style={{ color: c.dim }}>
          {status === "erro"
            ? errorMsg
            : showModelProgress
              ? `primeiro uso baixa ${WEBLLM_MODELS.find((m) => m.id === webLlmModel)?.size ?? "o modelo"}. Fica em cache pra próximas.`
              : stage.detail}
        </p>

        <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full" style={{ background: c.bgSoft }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${showModelProgress ? modelProgress!.progress * 100 : progress}%`,
              backgroundImage:
                status === "erro"
                  ? "linear-gradient(to right, #ff6b81, #ff6b81)"
                  : `linear-gradient(to right, ${c.accent}, ${c.aurora})`,
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] uppercase tracking-widest" style={{ color: c.dim }}>
          <span>{Math.round(showModelProgress ? modelProgress!.progress * 100 : progress)}%</span>
          <span>
            {status === "erro"
              ? "interrompido"
              : showModelProgress
                ? "baixando"
                : progress >= 100
                  ? "finalizado"
                  : "processando"}
          </span>
        </div>

        {showModelProgress && modelProgress?.text && (
          <p className="mt-2 font-mono text-[10px]" style={{ color: c.dim }}>
            {modelProgress.text}
          </p>
        )}

        {status === "erro" && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push("/config")}
              className="rounded-full border px-4 py-2 text-[13px] font-medium"
              style={{ borderColor: c.border, color: c.text }}
            >
              Ver configurações
            </button>
            <button
              onClick={() => router.push("/importar")}
              className="rounded-full px-4 py-2 text-[13px] font-medium"
              style={{ background: c.accent, color: c.onAccent }}
            >
              Tentar de novo
            </button>
          </div>
        )}

        <ul className="mt-10 space-y-3">
          {STAGES.map((s) => {
            const done = progress >= s.at + 5;
            return (
              <li key={s.at} className="flex items-center gap-3 text-[13px]">
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px]"
                  style={{
                    background: done ? c.accent : c.bgSoft,
                    color: done ? c.onAccent : c.dim,
                  }}
                >
                  {done ? "✓" : "·"}
                </span>
                <span style={{ color: done ? c.text : c.dim }}>{s.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
