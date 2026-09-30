export type ManagedLlmProvider = "claude" | "gemini" | "openrouter";

export interface ManagedLlmConfig {
  provider: ManagedLlmProvider;
  apiKey: string;
  model: string;
  maxOutputTokens: number;
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
  const configuredMax = Number.parseInt(env.BRAINFROST_MANAGED_LLM_MAX_OUTPUT_TOKENS ?? "", 10);
  const maxOutputTokens = Number.isFinite(configuredMax)
    ? Math.max(300, Math.min(2_000, configuredMax))
    : 1_000;

  return { provider, apiKey, model, maxOutputTokens };
}
