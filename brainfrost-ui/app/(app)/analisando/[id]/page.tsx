"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { getSupabase } from "@/lib/supabase/client";
import { sanitize } from "@/lib/sanitize";
import { announceNavigation } from "@/components/shared/NavigationLoader";
import {
  analyzeLocally,
  DEFAULT_WEBLLM_MODEL,
  getWebLlmPreflightIssue,
  isWebGPUAvailable,
  isWebLlmCompatibilityError,
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

class AnalysisRunError extends Error {
  constructor(message: string, readonly errorId?: string) {
    super(message);
  }
}

export default function AnalisandoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const theme = useSaas((s) => s.theme);
  const configuredProvider = useSaas((s) => s.config.llmProvider);
  const requestedProvider = searchParams.get("provider");
  const provider = requestedProvider === "managed"
    ? "managed"
    : requestedProvider === "webllm" || requestedProvider === "claude" || requestedProvider === "gemini"
      ? requestedProvider
      : configuredProvider;
  const webLlmModel = useSaas((s) => s.config.webLlmModel ?? DEFAULT_WEBLLM_MODEL);
  const c = palette(theme);

  const [progress, setProgress] = useState(5);
  const [modelProgress, setModelProgress] = useState<WebLlmProgress | null>(null);
  const [usingBrowserFallback, setUsingBrowserFallback] = useState(provider === "managed");
  const localModelLabel = WEBLLM_MODELS.find((model) => model.id === webLlmModel)?.label ?? webLlmModel;
  const [analyzer, setAnalyzer] = useState(() => provider === "managed"
    ? { label: "API gerenciada BrainFrost", detail: "Nuvem · conteúdo sanitizado" }
    : provider === "webllm"
      ? { label: localModelLabel, detail: "Local (WebLLM) · roda neste navegador" }
      : provider === "claude"
        ? { label: "Anthropic Claude", detail: "Nuvem · usando sua chave" }
        : { label: "Google Gemini", detail: "Nuvem · usando sua chave" });
  const [status, setStatus] = useState<"rodando" | "cancelando" | "erro">("rodando");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const controller = new AbortController();
    requestControllerRef.current = controller;
    const tick = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 4 + 1 : p));
    }, 400);
    tickRef.current = tick;

    const runServer = async (selectedProvider: string = provider) => {
      const res = await fetch(`/api/imports/${params.id}/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new AnalysisRunError(json.error ?? "erro desconhecido", json.errorId);
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
      const { data: existingNotes } = await supabase
        .from("vault_notes")
        .select("slug, title, category")
        .order("updated_at", { ascending: false })
        .limit(200);
      const rawSuggestions = await analyzeLocally(
        sanitized.cleanText,
        webLlmModel,
        (p) => setModelProgress(p),
        existingNotes ?? [],
        controller.signal
      );
      controller.signal.throwIfAborted();

      const rows = rawSuggestions
        .filter((s) => s.title && s.body)
        .map((s) => ({
          import_id: params.id,
          title: s.title.slice(0, 200),
          body: s.body,
          category: isCategory(s.category) ? s.category : "projeto",
          category_reason: s.category_reason?.slice(0, 300) ?? null,
          category_confidence:
            typeof s.category_confidence === "number" && Number.isFinite(s.category_confidence)
              ? Math.max(0, Math.min(1, s.category_confidence))
              : null,
          concepts: Array.isArray(s.concepts)
            ? s.concepts.filter((concept): concept is string => typeof concept === "string").map((concept) => concept.trim()).filter(Boolean).slice(0, 5)
            : [],
          suggested_links: Array.isArray(s.links)
            ? s.links
                .filter((link) => link && typeof link.slug === "string" && existingNotes?.some((note) => note.slug === link.slug))
                .slice(0, 5)
                .map((link) => ({ slug: link.slug, reason: typeof link.reason === "string" ? link.reason.slice(0, 240) : null }))
            : [],
          evidence: s.evidence?.slice(0, 200) ?? null,
        }));

      if (rows.length > 0) {
        const { error: insErr } = await supabase.from("pattern_suggestions").insert(rows);
        if (insErr) throw new Error(insErr.message);
      }

      if (controller.signal.aborted) {
        await supabase.from("pattern_suggestions").delete().eq("import_id", params.id);
        controller.signal.throwIfAborted();
      }
      controller.signal.throwIfAborted();
      const { data: finishedImport } = await supabase
        .from("imports")
        .update({
          status: "pronto",
          finished_at: new Date().toISOString(),
          provider_used: "webllm",
        })
        .eq("id", params.id)
        .eq("status", "analisando")
        .select("id")
        .maybeSingle();
      if (!finishedImport) {
        await supabase.from("pattern_suggestions").delete().eq("import_id", params.id);
        throw new DOMException("Análise cancelada", "AbortError");
      }
    };

    (async () => {
      try {
        if (provider === "managed") {
          await runServer("managed");
        } else if (provider === "webllm" && getWebLlmPreflightIssue(webLlmModel)) {
          setUsingBrowserFallback(true);
          setAnalyzer({ label: "API gerenciada BrainFrost", detail: "Nuvem · conteúdo sanitizado" });
          await runServer("browser-fallback");
        } else if (provider === "webllm") {
          try {
            await runLocal();
          } catch (error) {
            if (!isWebLlmCompatibilityError(error)) throw error;
            setModelProgress(null);
            setUsingBrowserFallback(true);
            setAnalyzer({ label: "API gerenciada BrainFrost", detail: "Nuvem · o modelo local não concluiu" });
            await runServer("browser-fallback");
          }
        } else await runServer();
        clearInterval(tick);
        setProgress(100);
        redirectTimerRef.current = setTimeout(() => {
          announceNavigation();
          router.replace("/curadoria");
        }, 700);
      } catch (e) {
        clearInterval(tick);
        if (cancelledRef.current || controller.signal.aborted) return;
        setStatus("erro");
        const message = e instanceof Error ? e.message : "erro de rede";
        let errorId = e instanceof AnalysisRunError ? e.errorId : undefined;
        if (!errorId) {
          try {
            const telemetryRes = await fetch("/api/telemetry/error", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                scope: "analysis",
                stage: provider === "webllm" ? "browser_model" : "browser_request",
                message,
                importId: params.id,
                provider: provider === "webllm" ? `webllm:${webLlmModel}` : provider,
              }),
            });
            const telemetry = await telemetryRes.json();
            errorId = telemetry.errorId;
          } catch {
            // O erro original continua visível mesmo se a telemetria falhar.
          }
        }
        setErrorMsg(`${message}${errorId ? ` Código: ${errorId}` : ""}`);
      }
    })();

    return () => clearInterval(tick);
  }, [params.id, router, provider, webLlmModel]);

  async function cancelAnalysis() {
    if (status !== "rodando") return;
    if (!window.confirm("Cancelar esta categorização? O conteúdo importado será preservado, mas as sugestões desta análise serão descartadas.")) return;
    setStatus("cancelando");
    cancelledRef.current = true;
    requestControllerRef.current?.abort();
    if (tickRef.current) clearInterval(tickRef.current);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);

    try {
      const response = await fetch(`/api/imports/${params.id}/analyze`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível cancelar a categorização.");
      announceNavigation();
      router.replace("/importar");
    } catch (error) {
      cancelledRef.current = false;
      setStatus("erro");
      setErrorMsg(error instanceof Error ? error.message : "Não foi possível cancelar a categorização.");
    }
  }

  const stage = [...STAGES].reverse().find((s) => progress >= s.at) ?? STAGES[0];
  const showModelProgress = provider === "webllm" && !usingBrowserFallback && modelProgress && modelProgress.progress < 1;

  return (
    <div className="flex h-full items-center justify-center overflow-auto" style={{ background: c.bg }}>
      <div className="mx-auto w-full max-w-xl px-6 py-10">
        <div className="mb-6 flex justify-center">
          {status === "erro" ? (
            <Image
              src="/mascot/yeti-sad-transparent.png"
              alt="Frostie triste"
              width={200}
              height={200}
              priority
              className="h-auto w-[180px]"
            />
          ) : (
            <Image
              src="/mascot/yeti-cooking.png"
              alt="Frostie preparando a análise"
              width={200}
              height={200}
              priority
              className="h-auto w-[210px] animate-pulse rounded-2xl mix-blend-multiply"
            />
          )}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.accent, opacity: 0.8 }}>
          {status === "erro" ? "algo deu errado" : status === "cancelando" ? "interrompendo" : provider === "managed" ? "análise na nuvem" : usingBrowserFallback ? "análise compatível" : provider === "webllm" ? "analisando local" : "analisando"}
        </p>
        <h1 className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-tight md:text-[44px]" style={{ color: c.text }}>
          {status === "erro" ? "Não deu." : status === "cancelando" ? "Cancelando análise" : showModelProgress ? "baixando modelo" : usingBrowserFallback ? "analisando na nuvem" : stage.label}
          {status !== "erro" && <span className="animate-pulse" style={{ color: c.aurora }}>.</span>}
        </h1>
        <p className="mt-3 text-[14px]" style={{ color: c.dim }}>
          {status === "erro"
            ? errorMsg
            : status === "cancelando"
              ? "Interrompendo a LLM e preservando seus dados já importados."
              : showModelProgress
              ? `primeiro uso baixa ${WEBLLM_MODELS.find((m) => m.id === webLlmModel)?.size ?? "o modelo"}. Fica em cache pra próximas.`
              : provider === "managed"
                ? "O conteúdo sanitizado está sendo analisado pela API BrainFrost sem usar a memória ou GPU desta máquina."
              : usingBrowserFallback
                ? "Seu navegador não concluiu o modelo local. O conteúdo sanitizado está sendo analisado com segurança no servidor."
              : stage.detail}
        </p>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border px-4 py-3" style={{ borderColor: c.border, background: c.bgSoft }}>
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: c.dim }}>analisando com</p>
            <p className="mt-1 truncate text-sm font-semibold" style={{ color: c.text }}>{analyzer.label}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: c.dim }}>{analyzer.detail}</p>
          </div>
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full" style={{ background: status === "erro" ? "#ff6b81" : c.aurora }} />
        </div>

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
              : status === "cancelando"
                ? "cancelando"
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

        {(status === "rodando" || status === "cancelando") && progress < 100 && (
          <button
            type="button"
            onClick={cancelAnalysis}
            disabled={status === "cancelando"}
            className="mt-6 rounded-full border px-4 py-2 text-[13px] font-medium transition-opacity disabled:cursor-wait disabled:opacity-50"
            style={{ borderColor: c.border, color: c.dim }}
          >
            {status === "cancelando" ? "Cancelando…" : "Cancelar categorização"}
          </button>
        )}

        {status === "erro" && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                announceNavigation();
                router.push("/config");
              }}
              className="rounded-full border px-4 py-2 text-[13px] font-medium"
              style={{ borderColor: c.border, color: c.text }}
            >
              Ver configurações
            </button>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="rounded-full px-4 py-2 text-[13px] font-medium"
              style={{ background: c.accent, color: c.onAccent }}
            >
              Repetir análise
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
