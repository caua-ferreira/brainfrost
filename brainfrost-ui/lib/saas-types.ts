export type OAuthProvider = "google" | "github" | "microsoft";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  provider: OAuthProvider;
}

export type ImportSource = "text" | "zip" | "github";
export type ImportStatus = "analisando" | "pronto" | "erro";

export interface MockImport {
  id: string;
  source: ImportSource;
  label: string;
  fileCount: number;
  status: ImportStatus;
  createdAt: string;
}

export type SuggestionCategory =
  | "padroes_codigo"
  | "padroes_arquitetura"
  | "contexto_trabalho"
  | "padrao_webapp"
  | "glossario";

export type SuggestionStatus = "pending" | "accepted" | "rejected";

export interface MockSuggestion {
  id: string;
  importId: string;
  title: string;
  body: string;
  category: SuggestionCategory;
  evidence: string;
  status: SuggestionStatus;
}

export type LlmProvider = "claude" | "gemini" | "webllm";

export interface MockConfig {
  llmProvider: LlmProvider;
  apiKey: string;
  deepAnalysis: boolean;
  webLlmModel?: string;
}

export type ExportTarget = "claude" | "cursor" | "copilot" | "cortex" | "generic";
