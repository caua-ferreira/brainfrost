"use client";

import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionInput,
  dedupeSuggestions,
  parseSuggestionsJson,
  splitAnalysisText,
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
const LOCAL_CONTEXT_WINDOW_SIZE = 8192;
const MAX_EXISTING_NOTES_CHARS = 4_000;

function fitExistingNotesToPrompt(
  notes: Array<{ slug: string; title: string; category: string }>
) {
  const selected: typeof notes = [];
  let usedChars = 0;

  for (const note of notes) {
    const noteChars = note.slug.length + note.title.length + note.category.length + 24;
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

export function isWebLlmCompatibilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /webgpu|gpu|adapter|device lost|out of memory|memory limit|shader|context window|token.*limit/i.test(message);
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
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
  engineSingleton = await CreateMLCEngine(model, {
    initProgressCallback: (report) => {
      onProgress?.({ progress: report.progress, text: report.text });
    },
  }, {
    context_window_size: LOCAL_CONTEXT_WINDOW_SIZE,
  });
  currentModelId = model;
  return engineSingleton;
}

export async function analyzeLocally(
  text: string,
  modelId: string = DEFAULT_WEBLLM_MODEL,
  onProgress?: (p: WebLlmProgress) => void,
  existingNotes: Array<{ slug: string; title: string; category: string }> = []
): Promise<LlmSuggestion[]> {
  const engine = await getEngine(modelId, onProgress);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = engine as any;
  // response_format json_object dá "Cannot pass non-string to std::string"
  // no WebLLM 0.2.85. O prompt já pede JSON estrito e parseSuggestionsJson
  // extrai o objeto entre { e }, então dispensa.
  const chunks = splitAnalysisText(text);
  const catalog = fitExistingNotesToPrompt(existingNotes);
  const suggestions: LlmSuggestion[] = [];

  for (const chunk of chunks) {
    const response = await e.chat.completions.create({
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildExtractionInput(chunk, catalog) },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });
    const raw = response.choices[0]?.message?.content ?? "";
    suggestions.push(...parseSuggestionsJson(raw));
  }

  return dedupeSuggestions(suggestions);
}

export async function chatLocally(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  modelId: string = DEFAULT_WEBLLM_MODEL,
  onProgress?: (p: WebLlmProgress) => void
): Promise<string> {
  const engine = await getEngine(modelId, onProgress);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = engine as any;
  const response = await e.chat.completions.create({
    messages: [{ role: "system", content: LOCAL_CHAT_SYSTEM_PROMPT }, ...messages],
    temperature: 0.15,
    max_tokens: 900,
  });
  return response.choices[0]?.message?.content?.trim() ?? "Não consegui gerar uma resposta.";
}
