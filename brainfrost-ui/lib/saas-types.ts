export type LlmProvider = "claude" | "gemini" | "webllm";

export interface MockConfig {
  llmProvider: LlmProvider;
  apiKey: string;
  deepAnalysis: boolean;
  webLlmModel?: string;
}

export type ExportTarget = "claude" | "cursor" | "copilot" | "cortex" | "generic";
