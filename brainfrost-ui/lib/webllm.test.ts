import { describe, expect, test } from "vitest";
import { analyzeLocally, getWebLlmPreflightIssue, isWebLlmCompatibilityError, isWebLlmDisposedError } from "./webllm";

describe("isWebLlmCompatibilityError", () => {
  test("reconhece falhas de navegador, GPU e contexto", () => {
    expect(isWebLlmCompatibilityError(new Error("WebGPU adapter not found"))).toBe(true);
    expect(isWebLlmCompatibilityError(new Error("device lost: out of memory"))).toBe(true);
    expect(isWebLlmCompatibilityError(new Error("context window token limit exceeded"))).toBe(true);
    expect(isWebLlmCompatibilityError(new Error("Object has already disposed"))).toBe(true);
    expect(isWebLlmCompatibilityError(new Error("LLM não devolveu JSON válido"))).toBe(true);
  });

  test("não transforma erros de dados em fallback pago", () => {
    expect(isWebLlmCompatibilityError(new Error("import não encontrado"))).toBe(false);
    expect(isWebLlmCompatibilityError(new Error("falha ao salvar sugestões"))).toBe(false);
  });
});

describe("isWebLlmDisposedError", () => {
  test("reconhece as variações emitidas pelo runtime", () => {
    expect(isWebLlmDisposedError(new Error("Object has already disposed"))).toBe(true);
    expect(isWebLlmDisposedError(new Error("Module has already been disposed"))).toBe(true);
    expect(isWebLlmDisposedError(new Error("WebGPU adapter not found"))).toBe(false);
  });
});

describe("getWebLlmPreflightIssue", () => {
  test("evita carregar o modelo local em dispositivos com risco de travamento", () => {
    expect(getWebLlmPreflightIssue("Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", { webGpu: true, deviceMemory: 4, mobile: false })).toContain("memória");
    expect(getWebLlmPreflightIssue("Llama-3.2-1B-Instruct-q4f16_1-MLC", { webGpu: true, deviceMemory: 8, mobile: true })).toContain("móveis");
    expect(getWebLlmPreflightIssue("Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC", { webGpu: true, deviceMemory: 6, mobile: false })).toContain("8 GB");
  });

  test("mantém o modelo local quando os requisitos estão presentes", () => {
    expect(getWebLlmPreflightIssue("Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", { webGpu: true, deviceMemory: 8, mobile: false })).toBeNull();
  });
});

describe("analyzeLocally", () => {
  test("interrompe antes de carregar o modelo quando a análise já foi cancelada", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(analyzeLocally("conteúdo", undefined, undefined, [], controller.signal))
      .rejects.toMatchObject({ name: "AbortError" });
  });
});
