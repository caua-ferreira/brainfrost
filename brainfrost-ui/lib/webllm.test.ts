import { describe, expect, test } from "vitest";
import { isWebLlmCompatibilityError } from "./webllm";

describe("isWebLlmCompatibilityError", () => {
  test("reconhece falhas de navegador, GPU e contexto", () => {
    expect(isWebLlmCompatibilityError(new Error("WebGPU adapter not found"))).toBe(true);
    expect(isWebLlmCompatibilityError(new Error("device lost: out of memory"))).toBe(true);
    expect(isWebLlmCompatibilityError(new Error("context window token limit exceeded"))).toBe(true);
  });

  test("não transforma erros de dados em fallback pago", () => {
    expect(isWebLlmCompatibilityError(new Error("LLM não devolveu JSON válido"))).toBe(false);
    expect(isWebLlmCompatibilityError(new Error("import não encontrado"))).toBe(false);
  });
});
