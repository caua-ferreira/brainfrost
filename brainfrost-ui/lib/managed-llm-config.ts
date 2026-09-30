export type ManagedLlmProvider = "claude" | "gemini" | "openrouter";

export interface ManagedLlmConfig {
  provider: ManagedLlmProvider;
  apiKey: string;
  model: string;
}

type ManagedEnv = Record<string, string | undefined>;

export function resolveManagedLlmConfig(env: ManagedEnv): ManagedLlmConfig | null {
  const apiKey = env.BRAINFROST_MANAGED_LLM_API_KEY?.trim();
  const model = env.BRAINFROST_MANAGED_LLM_MODEL?.trim();
  if (!apiKey || !model) return null;

  const configured = env.BRAINFROST_MANAGED_LLM_PROVIDER?.trim().toLowerCase();
  const inferred: ManagedLlmProvider = apiKey.startsWith("sk-ant-")
    ? "claude"
    : apiKey.startsWith("AIza")
      ? "gemini"
      : "openrouter";
  const provider: ManagedLlmProvider =
    configured === "claude" || configured === "gemini" || configured === "openrouter"
      ? configured
      : inferred;

  return { provider, apiKey, model };
}
