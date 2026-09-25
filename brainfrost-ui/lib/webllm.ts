"use client";

import { EXTRACTION_SYSTEM_PROMPT, parseSuggestionsJson, type LlmSuggestion } from "./prompts";

/**
 * Roda o extrator de padrões no browser via @mlc-ai/web-llm.
 * Zero rede, zero chave. Primeiro uso baixa o modelo (~800 MB) e fica em cache.
 * Precisa de WebGPU (Chrome/Edge 113+, Safari 26+).
 */

// Modelos disponíveis, ordenados por tamanho/qualidade. Todos rodam via WebGPU
// e ficam em cache do browser depois do primeiro download.
export const WEBLLM_MODELS = [
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 1B",
    size: "~800 MB",
    quality: "básica",
    vram: "2 GB",
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 1.5B",
    size: "~950 MB",
    quality: "boa em JSON",
    vram: "3 GB",
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    label: "Phi 3.5 Mini (3.8B)",
    size: "~2.2 GB",
    quality: "alta",
    vram: "5 GB",
  },
] as const;

export type WebLlmModelId = (typeof WEBLLM_MODELS)[number]["id"];
export const DEFAULT_WEBLLM_MODEL: WebLlmModelId = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export interface WebLlmProgress {
  progress: number; // 0..1
  text: string;
}

let engineSingleton: unknown | null = null;

export function isWebGPUAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator;
}

let currentModelId: string | null = null;

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
  });
  currentModelId = model;
  return engineSingleton;
}

export async function analyzeLocally(
  text: string,
  modelId: string = DEFAULT_WEBLLM_MODEL,
  onProgress?: (p: WebLlmProgress) => void
): Promise<LlmSuggestion[]> {
  const engine = await getEngine(modelId, onProgress);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = engine as any;
  const response = await e.chat.completions.create({
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    temperature: 0.2,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });
  const raw = response.choices[0]?.message?.content ?? "";
  return parseSuggestionsJson(raw);
}
