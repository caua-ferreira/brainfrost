"use client";

import { EXTRACTION_SYSTEM_PROMPT, parseSuggestionsJson, type LlmSuggestion } from "./prompts";

/**
 * Roda o extrator de padrões no browser via @mlc-ai/web-llm.
 * Zero rede, zero chave. Primeiro uso baixa o modelo (~800 MB) e fica em cache.
 * Precisa de WebGPU (Chrome/Edge 113+, Safari 26+).
 */

// Modelo pequeno (~800 MB) que roda em 2-3 GB de VRAM. Se quiser qualidade
// melhor, troca por Llama-3.2-3B-Instruct-q4f16_1-MLC (~1.7 GB, 4-5 GB VRAM).
export const DEFAULT_WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export interface WebLlmProgress {
  progress: number; // 0..1
  text: string;
}

let engineSingleton: unknown | null = null;

export function isWebGPUAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator;
}

export async function getEngine(
  model: string = DEFAULT_WEBLLM_MODEL,
  onProgress?: (p: WebLlmProgress) => void
): Promise<unknown> {
  if (engineSingleton) return engineSingleton;
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
  return engineSingleton;
}

export async function analyzeLocally(
  text: string,
  onProgress?: (p: WebLlmProgress) => void
): Promise<LlmSuggestion[]> {
  const engine = await getEngine(DEFAULT_WEBLLM_MODEL, onProgress);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = engine as any;
  const response = await e.chat.completions.create({
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    temperature: 0.3,
    max_tokens: 1500,
    response_format: { type: "json_object" },
  });
  const raw = response.choices[0]?.message?.content ?? "";
  return parseSuggestionsJson(raw);
}
