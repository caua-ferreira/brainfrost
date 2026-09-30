import { describe, expect, test } from "vitest";
import { resolveManagedLlmConfig } from "./managed-llm-config";

describe("resolveManagedLlmConfig", () => {
  test("exige chave e modelo", () => {
    expect(resolveManagedLlmConfig({})).toBeNull();
    expect(resolveManagedLlmConfig({ BRAINFROST_MANAGED_LLM_API_KEY: "sk-or-x" })).toBeNull();
  });

  test("infere o provedor pelo formato da chave", () => {
    expect(resolveManagedLlmConfig({
      BRAINFROST_MANAGED_LLM_API_KEY: "sk-ant-x",
      BRAINFROST_MANAGED_LLM_MODEL: "modelo",
    })?.provider).toBe("claude");
    expect(resolveManagedLlmConfig({
      BRAINFROST_MANAGED_LLM_API_KEY: "AIza-x",
      BRAINFROST_MANAGED_LLM_MODEL: "modelo",
    })?.provider).toBe("gemini");
    expect(resolveManagedLlmConfig({
      BRAINFROST_MANAGED_LLM_API_KEY: "sk-or-x",
      BRAINFROST_MANAGED_LLM_MODEL: "modelo",
    })?.provider).toBe("openrouter");
  });

  test("aceita provedor explícito para chaves sem prefixo conhecido", () => {
    expect(resolveManagedLlmConfig({
      BRAINFROST_MANAGED_LLM_API_KEY: "chave-customizada",
      BRAINFROST_MANAGED_LLM_MODEL: "modelo",
      BRAINFROST_MANAGED_LLM_PROVIDER: "gemini",
    })?.provider).toBe("gemini");
  });

  test("usa teto econômico e limita valores fora da faixa segura", () => {
    const base = {
      BRAINFROST_MANAGED_LLM_API_KEY: "sk-or-x",
      BRAINFROST_MANAGED_LLM_MODEL: "modelo",
    };
    expect(resolveManagedLlmConfig(base)?.maxOutputTokens).toBe(1_000);
    expect(resolveManagedLlmConfig({
      ...base,
      BRAINFROST_MANAGED_LLM_MAX_OUTPUT_TOKENS: "700",
    })?.maxOutputTokens).toBe(700);
    expect(resolveManagedLlmConfig({
      ...base,
      BRAINFROST_MANAGED_LLM_MAX_OUTPUT_TOKENS: "99999",
    })?.maxOutputTokens).toBe(2_000);
    expect(resolveManagedLlmConfig({
      ...base,
      BRAINFROST_MANAGED_LLM_MAX_OUTPUT_TOKENS: "10",
    })?.maxOutputTokens).toBe(300);
  });
});
