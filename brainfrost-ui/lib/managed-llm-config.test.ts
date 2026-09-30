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
});
