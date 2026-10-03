"use client";

import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionInput,
  filterNovelSuggestions,
  parseSuggestionsJson,
  sampleAnalysisText,
  splitAnalysisText,
  type ExistingPattern,
  type LlmSuggestion,
} from "./prompts";

/**
 * Roda o extrator de padrões no browser via @mlc-ai/web-llm.
 * Zero rede, zero chave. Primeiro uso baixa o modelo (~800 MB) e fica em cache.
 * Precisa de WebGPU (Chrome/Edge 113+, Safari 26+).
 */

// Modelos disponíveis via WebGPU. Ficam em cache do browser depois do
// primeiro download. Priorizamos modelos treinados em código.
export const WEBLLM_MODELS = [
  {
    id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen Coder 1.5B",
    size: "~950 MB",
    quality: "treinado em código",
    vram: "3 GB",
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 1B",
    size: "~800 MB",
    quality: "generalista rápido",
    vram: "2 GB",
  },
  {
    id: "Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC",
    label: "Qwen Coder 3B",
    size: "~1.9 GB",
    quality: "código, alta qualidade",
    vram: "5 GB",
  },
] as const;

export type WebLlmModelId = (typeof WEBLLM_MODELS)[number]["id"];
export const DEFAULT_WEBLLM_MODEL: WebLlmModelId = "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC";

export interface WebLlmProgress {
  progress: number; // 0..1
  text: string;
}

let engineSingleton: unknown | null = null;
let engineInitPromise: Promise<unknown> | null = null;
let engineInitModelId: string | null = null;
let inferenceQueue: Promise<void> = Promise.resolve();
const LOCAL_CONTEXT_WINDOW_SIZE = 8192;
const MAX_EXISTING_NOTES_CHARS = 4_000;

function fitExistingNotesToPrompt(
  notes: ExistingPattern[]
) {
  const selected: typeof notes = [];
  let usedChars = 0;

  for (const note of notes) {
    const noteChars = (note.slug?.length ?? 0) + note.title.length + (note.body?.length ?? 0) + note.category.length + 24;
    if (selected.length > 0 && usedChars + noteChars > MAX_EXISTING_NOTES_CHARS) break;
    selected.push(note);
    usedChars += noteChars;
  }

  return selected;
}

export function isWebGPUAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator;
}

export function getWebLlmPreflightIssue(
  modelId: string,
  capabilities?: { webGpu: boolean; deviceMemory?: number; mobile: boolean },
): string | null {
  const detected = capabilities ?? (() => {
    if (typeof navigator === "undefined") return { webGpu: false, mobile: false };
    const extendedNavigator = navigator as Navigator & { deviceMemory?: number };
    return {
      webGpu: isWebGPUAvailable(),
      deviceMemory: extendedNavigator.deviceMemory,
      mobile: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent),
    };
  })();

  if (!detected.webGpu) return "WebGPU indisponível";
  if (detected.mobile) return "modelo local desativado em dispositivos móveis para evitar travamentos";
  if (detected.deviceMemory && detected.deviceMemory <= 4) return "memória disponível insuficiente para executar o modelo local com segurança";
  if (modelId.includes("3B-") && detected.deviceMemory && detected.deviceMemory < 8) return "o modelo local de 3B exige pelo menos 8 GB de memória";
  return null;
}

export function isWebLlmCompatibilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /webgpu|gpu|adapter|device lost|out of memory|memory limit|shader|context window|token.*limit|already (?:been )?disposed|has already disposed|LLM não devolveu JSON válido/i.test(message);
}

export function isWebLlmDisposedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already (?:been )?disposed|has already disposed/i.test(message);
}

function runInferenceExclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = inferenceQueue.then(task, task);
  inferenceQueue = run.then(() => undefined, () => undefined);
  return run;
}

function clearEngineReference() {
  engineSingleton = null;
  currentModelId = null;
}

let currentModelId: string | null = null;

export const LOCAL_CHAT_SYSTEM_PROMPT = `Você é o assistente local do BrainFrost.
Responda em português claro, com objetividade e contexto técnico quando necessário.
Use somente o contexto enviado pelo usuário e o histórico da conversa.
Se a resposta não estiver no contexto, diga que não encontrou essa informação no cérebro.
Não invente camadas, ligações ou fatos.
Respostas anteriores suas podem estar erradas; elas não são fonte de verdade.
Quando uma camada trouxer uma preferência ou regra, ela tem prioridade sobre sua memória geral.
Preserve exatamente palavras de negação e restrição: "não", "sem", "nunca" e "apenas".
Se houver conflito, descarte a resposta anterior e siga o bloco DECISÃO PRIORITÁRIA da mensagem mais recente.
Se a camada disser "sem coautoria", responda "sem coautoria"; não complete com uma prática genérica diferente.`;

export async function getEngine(
  model: string = DEFAULT_WEBLLM_MODEL,
  onProgress?: (p: WebLlmProgress) => void
): Promise<unknown> {
  // Se o usuário trocou de modelo, descarta o singleton anterior.
  if (engineSingleton && currentModelId === model) return engineSingleton;
  if (!isWebGPUAvailable()) {
    throw new Error(
      "WebGPU não está disponível neste browser. Use Chrome/Edge 113+ ou Safari 26+."
    );
  }

  // CreateMLCEngine não é seguro quando duas inicializações disputam a
  // mesma GPU. Quem chegar durante o carregamento aguarda a mesma Promise.
  if (engineInitPromise) {
    if (engineInitModelId === model) return engineInitPromise;
    await engineInitPromise.catch(() => undefined);
    if (engineSingleton && currentModelId === model) return engineSingleton;
  }

  if (engineSingleton && currentModelId !== model) {
    const previous = engineSingleton as { unload?: () => Promise<void> };
    clearEngineReference();
    try {
      await previous.unload?.();
    } catch {
      // Uma engine perdida/descartada não precisa bloquear o novo modelo.
    }
  }

  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
  const initPromise = CreateMLCEngine(model, {
      initProgressCallback: (report) => {
        onProgress?.({ progress: report.progress, text: report.text });
      },
    }, {
      context_window_size: LOCAL_CONTEXT_WINDOW_SIZE,
    });
  engineInitPromise = initPromise;
  engineInitModelId = model;

  try {
    const engine = await initPromise;
    engineSingleton = engine;
    currentModelId = model;
    return engine;
  } finally {
    if (engineInitPromise === initPromise) {
      engineInitPromise = null;
      engineInitModelId = null;
    }
  }
}

export async function analyzeLocally(
  text: string,
  modelId: string = DEFAULT_WEBLLM_MODEL,
  onProgress?: (p: WebLlmProgress) => void,
  existingNotes: ExistingPattern[] = [],
  signal?: AbortSignal
): Promise<LlmSuggestion[]> {
  return runInferenceExclusive(async () => {
    const attempt = async () => {
      signal?.throwIfAborted();
      const engine = await getEngine(modelId, onProgress);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = engine as any;
      const interrupt = () => { void e.interruptGenerate?.(); };
      signal?.addEventListener("abort", interrupt, { once: true });
      // response_format json_object dá "Cannot pass non-string to std::string"
      // no WebLLM 0.2.85. O prompt já pede JSON estrito e parseSuggestionsJson
      // extrai o objeto entre { e }, então dispensa.
      const chunks = splitAnalysisText(sampleAnalysisText(text));
      const catalog = fitExistingNotesToPrompt(existingNotes);
      const suggestions: LlmSuggestion[] = [];

      try {
        for (const chunk of chunks) {
          signal?.throwIfAborted();
          const response = await e.chat.completions.create({
            messages: [
              { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
              { role: "user", content: buildExtractionInput(chunk, catalog) },
            ],
            temperature: 0.2,
            max_tokens: 1200,
          });
          signal?.throwIfAborted();
          const raw = response.choices[0]?.message?.content ?? "";
          suggestions.push(...parseSuggestionsJson(raw));
        }
      } finally {
        signal?.removeEventListener("abort", interrupt);
      }

      return filterNovelSuggestions(suggestions, existingNotes);
    };

    try {
      return await attempt();
    } catch (error) {
      if (!isWebLlmDisposedError(error)) throw error;
      clearEngineReference();
      return attempt();
    }
  });
}

export async function chatLocally(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  modelId: string = DEFAULT_WEBLLM_MODEL,
  onProgress?: (p: WebLlmProgress) => void
): Promise<string> {
  return runInferenceExclusive(async () => {
    const attempt = async () => {
      const engine = await getEngine(modelId, onProgress);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = engine as any;
      const response = await e.chat.completions.create({
        messages: [{ role: "system", content: LOCAL_CHAT_SYSTEM_PROMPT }, ...messages],
        temperature: 0.15,
        max_tokens: 900,
      });
      return response.choices[0]?.message?.content?.trim() ?? "Não consegui gerar uma resposta.";
    };

    try {
      return await attempt();
    } catch (error) {
      if (!isWebLlmDisposedError(error)) throw error;
      clearEngineReference();
      return attempt();
    }
  });
}
